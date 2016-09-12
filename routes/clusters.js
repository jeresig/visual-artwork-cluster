"use strict";

const mongoose = require("mongoose");
const express = require("express");
const router = express.Router();

const Job = mongoose.model("Job");
const Cluster = mongoose.model("Cluster");
const Data = mongoose.model("Data");

/* GET view cluster */
router.get("/:clusterId", (req, res, next) => {
    const clusterId = req.params.clusterId;
    const FIXED_FIELD = process.env.DATA_FIXED_FIELD;

    Cluster.findById(clusterId, (err, cluster) => {
        cluster.populate("images", () => {
            Data.getDataByArtwork((err, data) => {
                Data.getModifiedData((err, modified) => {
                    Object.assign(data, modified);

                    const artworks = cluster.artworks;

                    for (const artwork of artworks) {
                        artwork.data = data[artwork.id];
                        delete artwork.data[FIXED_FIELD];
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
