"use strict";

const util = require("util");

const mongoose = require("mongoose");
const express = require("express");
const router = express.Router();

const Job = mongoose.model("Job");
const Cluster = mongoose.model("Cluster");

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

            res.render("cluster", {
                title: "Compare Image Cluster",
                cluster,
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
