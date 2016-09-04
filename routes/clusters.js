"use strict";

const fs = require("fs");
const path = require("path");
const util = require("util");

const mongoose = require("mongoose");
const express = require("express");
const router = express.Router();
const csv = require("csv-streamify");

const Job = mongoose.model("Job");
const Cluster = mongoose.model("Cluster");

const readDataFile = (callback) => {
    const dataFile = path.join(process.env.UPLOAD_DIR, "data.csv");
    const INDEX_FIELD = process.env.DATA_INDEX_FIELD;
    const results = {};

    fs.stat(dataFile, (err) => {
        if (err || !INDEX_FIELD) {
            return callback(null, results);
        }

        fs.createReadStream(dataFile)
            .pipe(csv({
                objectMode: true,
                delimiter: "\t",
                newline: "\r\n",
                columns: true,
            }))
            .on("data", (data) => {
                results[data[INDEX_FIELD]] = data;
            })
            .on("error", callback)
            .on("end", () => {
                callback(null, results);
            });
    });
};

/* GET view cluster */
router.get("/:clusterId", (req, res, next) => {
    const clusterId = req.params.clusterId;

    Cluster.findById(clusterId, (err, cluster) => {
        cluster.populate("images", () => {
            const PROCESS_URL = process.env.PROCESS_URL;
            const ID_REGEX = new RegExp(process.env.ARTWORK_ID_REGEX);

            if (PROCESS_URL) {
                for (const image of cluster.images) {
                    const match = ID_REGEX.exec(image.fileName)[1];
                    image.url = util.format(PROCESS_URL, match);
                }
            }

            cluster.images = cluster.images
                .sort((a, b) => a.fileName.localeCompare(b.fileName));

            readDataFile((err, results) => {
                const images = [];

                for (const image of cluster.images) {
                    const data = results[image.fileName] || {};
                    images.push({image, data});
                }

                res.render("cluster", {
                    title: "Compare Image Cluster",
                    cluster,
                    images,
                });
            });
        });
    });
});

/* POST process cluster */
router.post("/:clusterId", (req, res, next) => {
    const clusterId = req.params.clusterId;

    Cluster.findByIdAndUpdate(clusterId, {processed: true})
        .exec((err, cluster) => {
            const jobId = cluster.jobId;
            Cluster.count({jobId, processed: {$ne: true}}, (err, count) => {
                if (count === 0) {
                    Job.findByIdAndUpdate(req.params.jobName,
                        {processed: true}, () =>
                            res.redirect(`/job/${jobId}`));
                } else {
                    res.redirect(`/job/${jobId}`);
                }
            });
        });
});

module.exports = router;
