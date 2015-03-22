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
        var clusters = [];
        var clusterMap = {};

        console.log("Downloading similarity data...");

        // Download similarity data
        async.eachLimit(job.images, 4, function(image, callback) {
            var ME_DIR = process.env.ME_DIR;
            var filePath = ME_DIR + "/" + image._id + ".jpg";

            ME.similar(filePath, function(err, matches) {
                var curCluster;

                matches = matches.map(function(match) {
                    // If some other file was matched we just ignore it
                    if (match.filepath.indexOf(ME_DIR) !== 0) {
                        return;
                    }

                    var fileName = /([^\/]+)\.jpg$/.exec(match.filepath)[1];

                    if (fileName in clusterMap) {
                        if (curCluster && curCluster !== clusterMap[fileName]) {
                            console.error("Multiple clusters found!");
                        }

                        curCluster = clusterMap[fileName];
                    }

                    return fileName;
                }).filter(function(fileName) {
                    return !!fileName;
                });

                matches.forEach(function(fileName) {
                    if (!curCluster) {
                        curCluster = new Cluster({
                            jobId: image.jobId,
                            imageCount: 0
                        });

                        clusters.push(curCluster);
                        clusterMap[fileName] = curCluster;
                    }

                    if (curCluster.images.indexOf(fileName) < 0) {
                        curCluster.images.push(fileName);
                        curCluster.imageCount += 1;
                    }
                });

                callback();
            });
        }, function() {
            // Save all clusters
            async.eachLimit(clusters, 4, function(cluster, callback) {
                cluster.save(callback);
                callback();
            }, function() {
                job.clusters = clusters.map(function(cluster) {
                    return cluster._id;
                });
                job.state = "completed";
                callback();
            });
        });
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