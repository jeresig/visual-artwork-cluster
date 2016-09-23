"use strict";

const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

const Job = mongoose.model("Job");
const Data = mongoose.model("Data");

/* GET home page. */
router.get("/", (req, res, next) => {
    Job.find().lean().sort("-uploadDate").exec((err, jobs) => {
        jobs.forEach((job) => {
            job.date = job.uploadDate.toLocaleDateString();
            job.completed = job.state === "completed";
        });

        Data.count((err, totalModified) => {
            res.render("index", {
                title: "Visual Artwork Cluster",
                jobs,
                totalModified,
            });
        });
    });
});

module.exports = router;
