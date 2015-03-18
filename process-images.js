require("dotenv").load();

var mongoose = require("mongoose");

// Connect to database
mongoose.connect("mongodb://localhost/visual-artwork-cluster");

// Load in models
require("./models/jobs");
require("./models/clusters");
require("./models/images");

var Job = mongoose.model("Job");
var Cluster = mongoose.model("Cluster");
var Image = mongoose.model("Image");

Job.findOne({state: "uploaded"}, {state: "uploading-me"})
    .populate("clusters")
    .populate("images")
    .exec(function(err, job) {
        if (err) {
            return console.error(err);
        }

        if (!job) {
            return process.exit(0);
        }

        //job.
    });