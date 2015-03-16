var express = require("express");
var router = express.Router();
var mongoose = require("mongoose");

var Job = mongoose.model("Job");

/* GET home page. */
router.get("/", function(req, res, next) {
    Job.find().lean().exec(function(err, jobs) {
        res.render("index", {
            title: "Visual Artwork Cluster",
            jobs: jobs
        });
    });
});

module.exports = router;
