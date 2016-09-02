"use strict";

const path = require("path");
const {exec} = require("child_process");

require("dotenv").load();

const async = require("async");
const mongoose = require("mongoose");
const ME = require("matchengine")({
    username: process.env.ME_USERNAME,
    password: process.env.ME_PASSWORD,
});

// Connect to database
mongoose.Promise = global.Promise;
mongoose.connect(process.env.MONGO_URL);

// Load in models
require("./models/jobs");
require("./models/clusters");
require("./models/images");

const Job = mongoose.model("Job");
const Cluster = mongoose.model("Cluster");

const cmds = {
    // Extract the entropy details for the images
    extractEntropy(job, callback) {
        async.eachLimit(job.images, 2, (image, callback) => {
            if (image.entropy !== undefined) {
                return process.nextTick(callback);
            }

            console.log(`Getting entropy for ${image._id}...`);

            const file = path.join(process.env.UPLOAD_DIR, `${image._id}.jpg`);
            exec(`identify -verbose ${file}`, (err, output) => {
                image.entropy = 0;

                // This could fail if the image is greyscale
                // (so we fall back to 0)
                if (/Overall:[\s\S]*?entropy: ([\d.]+)/.test(output)) {
                    image.entropy = parseFloat(RegExp.$1);
                }

                image.save(callback);
            });
        }, (err) => {
            job.state = "uploadME";
            callback();
        });
    },

    // Upload the data to MatchEngine
    uploadME: function(job, callback) {
        const groups = [];
        const batchSize = 100;
        const pause = 5000;
        let count = 1;

        // Group the images into batches to upload
        for (let i = 0; i < job.images.length; i += batchSize) {
            groups.push(job.images.slice(i, i + batchSize));
        }

        async.eachSeries(groups, (images, callback) => {
            console.log(`Uploading batch [${count}/${groups.length}]`);

            const files = images.map((image) =>
                path.join(process.env.UPLOAD_DIR, `${image._id}.jpg`));

            ME.add(files, process.env.ME_DIR, (err) => {
                console.log(`Batch done #${count}`);
                count += 1;

                // Update all the images, marking them as completed
                async.eachLimit(images, 4, (image, callback) => {
                    image.update({state: "completed"}, callback);
                }, () => {
                    console.log("Image records updated.");

                    // Pause at the end of each upload
                    setTimeout(callback, pause);
                });
            });
        }, () => {
            job.state = "similarityME";
            callback();
        });
    },

    similarityME: function(job, callback) {
        const clusters = [];
        const clusterMap = {};

        const artworkRegex = process.env.ARTWORK_ID_REGEX;
        const artworkIDRegex = new RegExp(artworkRegex, "i");

        console.log("Downloading similarity data...");

        const getClusterName = function(fileName) {
            // If we have a artwork cluster then we make sure we cluster
            // by the artwork ID rather than just the file name. This
            // will help to ensure that all images depicting the same
            // artwork will be put together.
            if (artworkRegex) {
                const match = artworkIDRegex.exec(fileName);
                if (match) {
                    return match[1];
                }
            }

            return fileName;
        };

        // Download similarity data
        async.eachLimit(job.images, 4, (image, callback) => {
            const ME_DIR = process.env.ME_DIR;
            const filePath = `${ME_DIR}/${image._id}.jpg`;

            console.log(`Downloding similarity for ${image._id}...`);

            ME.similar(filePath, (err, matches) => {
                let curCluster;

                matches = matches.map((match) => {
                    // If some other file was matched we just ignore it
                    if (match.filepath.indexOf(ME_DIR) !== 0) {
                        return;
                    }

                    const fileName = /([^\/]+)\.jpg$/.exec(match.filepath)[1];
                    const clusterName = getClusterName(fileName);

                    if (clusterName in clusterMap) {
                        const otherCluster = clusterMap[clusterName];

                        if (curCluster && curCluster !== otherCluster) {
                            // Multiple clusters found!
                            for (const image of otherCluster.images) {
                                curCluster.images.push(image);
                                curCluster.imageCount += 1;
                            }

                            // Remove the old cluster
                            delete clusterMap[clusterName];

                            const pos = clusters.indexOf(otherCluster);
                            clusters.splice(pos, 1);
                        } else {
                            curCluster = otherCluster;
                        }
                    }

                    return fileName;
                }).filter((fileName) => fileName);

                for (const fileName of matches) {
                    const clusterName = getClusterName(fileName);

                    if (!curCluster) {
                        curCluster = new Cluster({
                            jobId: image.jobId,
                            imageCount: 0,
                        });

                        clusters.push(curCluster);
                        clusterMap[clusterName] = curCluster;
                    }

                    if (curCluster.images.indexOf(fileName) < 0) {
                        curCluster.images.push(fileName);
                        curCluster.imageCount += 1;
                    }
                }

                callback();
            });
        }, () => {
            console.log("Saving clusters...");

            // Save all clusters
            async.eachLimit(clusters, 4, (cluster, callback) => {
                // Process clusters that only match a single image
                if (cluster.images.length === 1) {
                    cluster.processed = true;

                // If there is an artwork ID check then we need to make sure
                // that there are multiple valid image IDs, otherwise we just
                // ignore the results and mark it as processed (as if the IDs
                // are all the same then nothing new is being discovered)
                } else if (artworkRegex) {
                    const artworkIDs = {};

                    for (const fileName of cluster.images) {
                        const match = artworkIDRegex.exec(fileName);
                        if (match) {
                            artworkIDs[match[1]] = true;
                        }
                    }

                    cluster.processed = (Object.keys(artworkIDs).length === 1);
                }

                cluster.save(callback);
            }, () => {
                console.log("Saving job...");

                let processed = true;

                job.clusters = clusters.map((cluster) => {
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
    },
};

Job.findOneAndUpdate({
    state: {$ne: "completed"},
    inProgress: false,
}, {
    inProgress: true,
})
    .populate("images")
    .exec((err, job) => {
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

        cmds[job.state](job, (err) => {
            job.inProgress = false;

            job.save(() => {
                console.log("DONE");
                process.exit(0);
            });
        });
    });
