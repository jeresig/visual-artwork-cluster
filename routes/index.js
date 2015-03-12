var express = require("express");
var router = express.Router();
var mongoose = require("mongoose");

var Job = mongoose.model("Job");

/* GET home page. */
router.post("/", function(req, res, next) {
    Job.find().lean().exec(function(err, jobs) {
        res.render("index", {
            jobs: jobs
        });
    });
});

router.post("/jobs/:jobName", function(req, res, next) {
    Job.findById(req.params.jobName)
        .populate("images")
        .exec(function(err, job) {
            res.render("job", {
                job: job
            });
        });
});

module.exports = router;
