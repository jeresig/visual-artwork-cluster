"use strict";

const fs = require("fs");
const path = require("path");

const async = require("async");
const mongoose = require("mongoose");
const unzip = require("unzip2");
const express = require("express");
const router = express.Router();

const Job = mongoose.model("Job");
const Image = mongoose.model("Image");

/* GET job */
router.get("/:jobName", (req, res, next) => {
    Job.findById(req.params.jobName)
        .populate("clusters")
        .exec((err, job) => {
            job.date = job.uploadDate.toLocaleDateString();
            job.completed = job.state === "completed";

            async.eachLimit(job.clusters, 2, (cluster, callback) => {
                cluster.populate("images", callback);
            }, () => {
                // Moved processed clusters to the bottom
                const clusters = [];
                const processed = [];

                for (const cluster of job.clusters) {
                    // Move out clusters that are already processed
                    if (cluster.processed) {
                        processed.push(cluster);
                    } else {
                        clusters.push(cluster);
                    }
                }

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
                    state: "extractEntropy",
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
                        res.render("complete", {existingFiles});
                    });
                });
            });
    });

    req.pipe(req.busboy);
});

module.exports = router;
