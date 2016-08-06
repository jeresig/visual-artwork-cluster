"use strict";

const fs = require("fs");
const path = require("path");
const util = require("util");

const async = require("async");
const mongoose = require("mongoose");
const unzip = require("unzip2");
const express = require("express");
const router = express.Router();

const Job = mongoose.model("Job");
const Image = mongoose.model("Image");
const Cluster = mongoose.model("Cluster");

/* GET job */
router.get("/:jobName", (req, res, next) => {
    Job.findById(req.params.jobName)
        .populate("clusters")
        .exec((err, job) => {
            job.date = job.uploadDate.toLocaleDateString();

            // Moved processed clusters to the bottom
            const clusters = [];
            const processed = [];

            // Need to do a second populate() to bring in the images
            async.eachLimit(job.clusters, 1, (cluster, callback) => {
                cluster.populate("images", () => {
                    const PROCESS_URL = process.env.PROCESS_URL;

                    if (PROCESS_URL) {
                        for (const image of cluster.images) {
                            image.url = util.format(PROCESS_URL,
                                image.fileName);
                        }
                    }

                    cluster.images = cluster.images
                        .sort((a, b) => a.fileName.localeCompare(b.fileName));

                    // Move out clusters that are already processed
                    if (cluster.processed) {
                        processed.push(cluster);
                    } else {
                        clusters.push(cluster);
                    }
                    callback();
                });
            }, () => {
                res.render("job", {
                    job,
                    clusters,
                    processed,
                });
            });
        });
});

/* POST new upload */
router.post("/new", (req, res, next) => {
    const uploadDir = process.env.UPLOAD_DIR;
    const files = [];
    const existingFiles = [];

    req.busboy.on("file", (field, file, zipName) => {
        if (!/\.zip$/i.test(zipName)) {
            return res.render("error", {
                message: "Uploaded file is not a zip file.",
            });
        }

        const jobName = zipName.replace(/\.zip$/i, "");

        file
            .pipe(unzip.Parse())
            .on("entry", (entry) => {
                const filePath = entry.path;
                const type = entry.type; // Directory or File
                const fileName =
                    (/([^\/\\]+)\.jpe?g$/i.exec(filePath) || [])[1] || "";

                // Ignore things that aren't files (e.g. directories)
                // Ignore files that don't end with .jpe?g
                // Ignore files that start with '.'
                if (type !== "File" || !fileName ||
                        fileName.indexOf(".") === 0) {
                    return entry.autodrain();
                }

                const outFileName = path.join(uploadDir, `${fileName}.jpg`);

                fs.exists(outFileName, (exists) => {
                    // Don't attempt to add files that already exist
                    if (exists) {
                        existingFiles.push(fileName);
                        return entry.autodrain();
                    }

                    files.push(fileName);
                    entry.pipe(fs.createWriteStream(outFileName));
                });
            })
            .on("error", (err) => {
                throw err;
            })
            .on("close", (err) => {
                if (err) {
                    return res.render("error", {
                        message: "Error opening zip file.",
                    });
                }

                if (files.length === 0) {
                    return res.render("error", {
                        message: "Zip file has no images in it, or all of " +
                            "the images were already uploaded previously.",
                    });
                }

                Job.create({
                    _id: jobName,
                    state: "uploaded",
                    imageCount: files.length,
                    uploadDate: new Date(),
                    inProgress: false,
                    images: files,
                }, (err, job) => {
                    if (err) {
                        // Maybe file already uploaded?
                        return res.render("error", {
                            message:
                                "Zip file with this name was already uploaded.",
                        });
                    }

                    async.eachLimit(files, 1, (fileName, callback) => {
                        Image.create({
                            _id: fileName,
                            jobId: job._id,
                            fileName: fileName,
                            state: "uploaded",
                        }, callback);
                    }, () => {
                        // Use files array
                        res.render("complete", {
                            title: "Upload Completed",
                            message: "",
                            existingFiles,
                        });
                    });
                });
            });
    });

    req.pipe(req.busboy);
});

/* POST process cluster */
router.post("/:jobName/process/:clusterId", (req, res, next) => {
    const clusterId = req.params.clusterId;
    const jobName = req.params.jobName;

    Cluster.findByIdAndUpdate(clusterId, {processed: true})
        .exec((err, cluster) => {
            Cluster.count({jobId: jobName, processed: {$ne: true}},
                (err, count) => {
                    if (count === 0) {
                        Job.findByIdAndUpdate(req.params.jobName,
                            {processed: true}, () =>
                                res.redirect(`/job/${jobName}`));
                    } else {
                        res.redirect(`/job/${jobName}`);
                    }
                });
        });
});

module.exports = router;
