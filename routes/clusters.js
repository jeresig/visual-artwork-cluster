"use strict";

const fs = require("fs");
const path = require("path");

const mongoose = require("mongoose");
const express = require("express");
const router = express.Router();
const csv = require("csv-streamify");

const Job = mongoose.model("Job");
const Cluster = mongoose.model("Cluster");

const readDataFile = (callback) => {
    const dataFile = path.join(process.env.UPLOAD_DIR, "data.csv");
    const ARTWORK_FIELD = process.env.DATA_ARTWORK_FIELD;
    const results = {};

    fs.stat(dataFile, (err) => {
        if (err || !ARTWORK_FIELD) {
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
                results[data[ARTWORK_FIELD]] = data;
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
            readDataFile((err, data) => {
                const artworks = cluster.artworks;

                for (const artwork of artworks) {
                    artwork.data = data[artwork.id];
                }

                res.render("cluster", {
                    title: "Compare Image Cluster",
                    cluster,
                    artworks,
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
