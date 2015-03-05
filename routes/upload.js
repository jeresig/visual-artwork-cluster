var mongoose = require("mongoose");
var unzip = require("unzip");
var express = require("express");
var router = express.Router();

var ME = require("matchengine")({
    username: process.env.ME_USER,
    password: process.env.ME_PASSWORD
});

var Job = mongoose.model("Job");
var Image = mongoose.model("Image");

/* POST new upload */
router.get("/new", function(req, res, next) {
    req.pipe(req.busboy);

    var jobID = 1234;
    var jobDir = "./";
    var files = [];

    req.busboy.on("file", function(field, file, fileName) {
        file
            .pipe(unzip.Extract())
            .on("entry", function(entry) {
                var fileName = entry.path;
                var type = entry.type; // Directory or File

                if (type === "File" && /\.jpe?g$/i.test(fileName)) {
                    files.push(fileName);
                    entry.pipe(fs.createWriteStream(fileName));
                } else {
                    entry.autodrain();
                }
            })
            .on("close", function() {
                // TODO: Start job
                Job.create({
                    state: "uploaded",
                    imageCount: files.length,
                    uploadDate: new Date(),
                    iamges: []
                }, function() {
                    // Use files array
                    res.render("index", { title: "Express" });
                });
            });
    });
});

module.exports = router;