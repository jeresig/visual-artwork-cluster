"use strict";

const fs = require("fs");
const path = require("path");
const {exec} = require("child_process");

require("dotenv").load();

const async = require("async");
const farmhash = require("farmhash");
const mongoose = require("mongoose");
const pastec = require("pastec")({
    server: process.env.PASTEC_SERVER,
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
const Image = mongoose.model("Image");

const MIN_ENTROPY = parseFloat(process.env.MIN_ENTROPY) || 0;
const MIN_SIMILARITY = parseFloat(process.env.MIN_SIMILARITY) || 0;
const IDENTIFY_BINARY = process.env.IDENTIFY_BINARY || "identify";

const hashImage = (sourceFile, callback) => {
    fs.readFile(sourceFile, (err, buffer) => {
        /* istanbul ignore if */
        if (err) {
            return callback(err);
        }

        callback(null, farmhash.hash32(buffer).toString());
    });
};

const cmds = {
    // Extract the entropy details for the images
    extractEntropy(job, callback) {
        if (MIN_ENTROPY === 0) {
            return process.nextTick(() => {
                job.state = "uploadSimilar";
                callback();
            });
        }

        async.eachLimit(job.images, 2, (image, callback) => {
            if (image.entropy !== undefined) {
                return process.nextTick(callback);
            }

            console.log(`Getting entropy for ${image._id}...`);

            const file = path.join(process.env.UPLOAD_DIR, `${image._id}.jpg`);
            exec(`${IDENTIFY_BINARY} -verbose ${file}`, (err, output) => {
                image.entropy = 0;

                // This could fail if the image is greyscale
                // (so we fall back to 0)
                if (/Overall:[\s\S]*?entropy: ([\d.]+)/.test(output)) {
                    image.entropy = parseFloat(RegExp.$1);
                }

                if (image.entropy < MIN_ENTROPY) {
                    image.state = "completed";
                }

                image.save(callback);
            });
        }, () => {
            job.state = "uploadSimilar";
            callback();
        });
    },

    // Upload the data to Pastec
    uploadSimilar(job, callback) {
        async.eachSeries(job.images, (image, callback) => {
            if (image.state === "completed" || image.similarityId) {
                return process.nextTick(callback);
            }

            console.log(`Uploading to similarity engine: ${image._id}...`);

            const file = path.join(process.env.UPLOAD_DIR, `${image._id}.jpg`);

            hashImage(file, (err, similarityId) => {
                if (err) {
                    return callback(err);
                }

                pastec.idIndexed(similarityId, (err, indexed) => {
                    if (err) {
                        return callback(err);
                    }

                    if (indexed) {
                        return image.update({similarityId}, callback);
                    }

                    pastec.add(file, similarityId, (err) => {
                        if (err) {
                            return callback(err);
                        }

                        image.update({similarityId}, callback);
                    });
                });
            });
        }, () => {
            job.state = "downloadSimilarity";
            callback();
        });
    },

    downloadSimilarity(job, callback) {
        console.log("Downloading similarity data...");

        // Download similarity data
        async.eachSeries(job.images, (image, callback) => {
            //if (image.state === "completed") {
            if (image.entropy < MIN_ENTROPY) {
                return process.nextTick(callback);
            }

            console.log(`Downloading similarity for ${image._id}...`);

            pastec.similar(image.similarityId, (err, similarMatches) => {
                if (err) {
                    return callback(err);
                }

                async.map(similarMatches, (match, callback) => {
                    Image.findOne({similarityId: match.id}, (err, image) => {
                        callback(err, {
                            image: image._id,
                            score: match.score,
                        });
                    });
                }, (err, similarImages) => {
                    if (err) {
                        return callback(err);
                    }

                    image.state = "completed";
                    image.similarImages = similarImages
                        .filter((similarImage) => similarImage);

                    image.save(callback);
                });
            });
        }, () => {
            job.state = "cluster";
            callback();
        });
    },

    cluster(job, callback) {
        const clusters = {};

        console.log("Generating clusters...");

        async.eachLimit(job.images, 4, (image, callback) => {
            if (image.similarImages.length <= 1 ||
                    image.similarArtworks.length >= 4) {
                return process.nextTick(callback);
            }

            image.populate("similarImages.image", () => {
                let curCluster;
                const similarImages = image.similarImages
                    .filter((similar) => similar.score >= MIN_SIMILARITY);

                for (const similarImage of similarImages) {
                    const image = similarImage.image;
                    const clusterName = image.artwork;

                    if (clusterName in clusters) {
                        const otherCluster = clusters[clusterName];

                        if (curCluster && curCluster !== otherCluster) {
                            // Multiple clusters found!
                            for (const image of otherCluster.images) {
                                curCluster.addImage(image);
                            }

                            // Delete the old cluster
                            delete clusters[clusterName];
                        } else {
                            curCluster = otherCluster;
                        }
                    }
                }

                for (const similarImage of similarImages) {
                    const image = similarImage.image;
                    const clusterName = image.artwork;

                    if (!curCluster) {
                        curCluster = new Cluster({
                            jobId: image.jobId,
                            imageCount: 0,
                        });

                        clusters[clusterName] = curCluster;
                    }

                    if (curCluster.images.indexOf(image) < 0) {
                        curCluster.addImage(image);
                    }
                }

                callback();
            });
        }, () => {
            console.log("Saving clusters...");

            const finalClusters = [];
            const clusterList = Object.keys(clusters)
                .map((clusterName) => clusters[clusterName]);

            // Save all clusters
            async.eachLimit(clusterList, 4, (cluster, callback) => {
                // Ignore clusters that only match a single artwork
                if (cluster.artworks.length === 1) {
                    return process.nextTick(callback);
                }

                finalClusters.push(cluster);

                cluster.images = cluster.images.sort();
                cluster.save(callback);
            }, () => {
                job.clusters = finalClusters.map((cluster) => cluster._id);
                job.processed = (finalClusters.length === 0);
                job.state = "completed";
                callback();
            });
        });
    },
};

Job.findOne({
    state: {$ne: "completed"},
    inProgress: false,
})
    .populate("images")
    .exec((err, job) => {
        if (err) {
            console.error(err);
            return process.exit(1);
        }

        if (!job) {
            return process.exit(0);
        }

        console.log("Job found:", job._id);

        job.inProgress = true;

        job.save(() => {
            cmds[job.state](job, (err) => {
                job.inProgress = false;

                job.save(() => {
                    console.log("DONE");
                    process.exit(0);
                });
            });
        });
    });
