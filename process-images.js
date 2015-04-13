var path = require("path");

require("dotenv").load();

var async = require("async");
var mongoose = require("mongoose");
var ME = require("matchengine")({
    username: process.env.ME_USERNAME,
    password: process.env.ME_PASSWORD
});

// Connect to database
mongoose.connect(process.env.MONGO_URL);

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

        var artworkRegex = process.env.ARTWORK_ID_REGEX;
        var artworkIDRegex = new RegExp(artworkRegex, "i");

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

                    var clusterName = /([^\/]+)\.jpg$/.exec(match.filepath)[1];

                    // If we have a artwork cluster then we make sure we cluster
                    // by the artwork ID rather than just the file name. This
                    // will help to ensure that all images depicting the same
                    // artwork will be put together.
                    if (artworkRegex) {
                        var match = artworkIDRegex.exec(clusterName);
                        if (match) {
                            clusterName = match[1];
                        }
                    }

                    if (clusterName in clusterMap) {
                        if (curCluster &&
                                curCluster !== clusterMap[clusterName]) {
                            console.error("Multiple clusters found!");
                        }

                        curCluster = clusterMap[clusterName];
                    }

                    return clusterName;
                }).filter(function(clusterName) {
                    return !!clusterName;
                });

                matches.forEach(function(clusterName) {
                    if (!curCluster) {
                        curCluster = new Cluster({
                            jobId: image.jobId,
                            imageCount: 0
                        });

                        clusters.push(curCluster);
                        clusterMap[clusterName] = curCluster;
                    }

                    if (curCluster.images.indexOf(clusterName) < 0) {
                        curCluster.images.push(clusterName);
                        curCluster.imageCount += 1;
                    }
                });

                callback();
            });
        }, function() {
            // Save all clusters
            async.eachLimit(clusters, 4, function(cluster, callback) {
                // Process clusters that only match a single image
                if (cluster.images.length === 1) {
                    cluster.processed = true;

                // If there is an artwork ID check then we need to make sure
                // that there are multiple valid image IDs, otherwise we just
                // ignore the results and mark it as processed (as if the IDs
                // are all the same then nothing new is being discovered)
                } else if (artworkRegex) {
                    var artworkIDs = {};

                    cluster.images.forEach(function(fileName) {
                        var match = artworkIDRegex.exec(fileName);
                        if (match) {
                            artworkIDs[match[1]] = true;
                        }
                    });

                    cluster.processed = (Object.keys(artworkIDs).length === 1);
                }

                cluster.save(callback);
                callback();
            }, function() {
                var processed = true;

                job.clusters = clusters.map(function(cluster) {
                    if (!cluster.processed) {
                        processed = false;
                    }

                    return cluster._id;
                });

                job.processed = processed;
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
