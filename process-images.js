var path = require("path");

require("dotenv").load();

var async = require("async");
var mongoose = require("mongoose");
var ME = require("matchengine")({
    username: process.env.ME_USERNAME,
    password: process.env.ME_PASSWORD
});

// Connect to database
mongoose.connect("mongodb://localhost/visual-artwork-cluster");

// Load in models
require("./models/jobs");
require("./models/clusters");
require("./models/images");

var Job = mongoose.model("Job");
var Cluster = mongoose.model("Cluster");
var Image = mongoose.model("Image");

var cmds = {
    // Upload the data to MatchEngine
    uploaded: function(job, callback) {
        var groups = [];
        var batchSize = 100;
        var pause = 5000;
        var count = 1;

        // Group the images into batches to upload
        for (var i = 0; i < job.images.length; i += batchSize) {
            groups.push(job.images.slice(i, i + batchSize));
        }

        async.eachSeries(groups, function(images, callback) {
            console.log("Uploading batch [" +
                count + "/" + groups.length + "]");

            var files = images.map(function(image) {
                return path.join(process.env.UPLOAD_DIR, image._id + ".jpg");
            });

            ME.add(files, process.env.ME_DIR, function(err) {
                console.log("Batch done #" + count);
                count += 1;

                // Update all the images, marking them as completed
                async.eachLimit(images, 4, function(image, callback) {
                    image.update({state: "completed"}, callback);
                }, function() {
                    console.log("Image records updated.");

                    // Pause at the end of each upload
                    setTimeout(callback, pause);
                });
            });
        }, function() {
            job.state = "uploaded-me";
            callback();
        });
    },

    "uploaded-me": function(job, callback) {
        // TODO: Download relationship data
        // TODO: Do clustering on the data
        // TODO: Build clusters

        job.state = "completed";
        callback();
    }
};

Job.findOneAndUpdate({
    state: {$ne: "completed"},
    inProgress: false
}, {
    inProgress: true
})
    .populate("images")
    .exec(function(err, job) {
        if (err) {
            console.error(err);
            process.exit(0);
            return;
        }

        if (!job) {
            process.exit(0);
            return;
        }

        console.log("Job found:", job._id);

        cmds[job.state](job, function(err) {
            job.inProgress = false;

            job.save(function() {
                console.log("DONE");
                process.exit(0);
            });
        });
    });