var path = require("path");

var async = require("async");
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

    var jobDir = "./";
    var files = [];

    req.busboy.on("file", function(field, file, zipName) {
        if (!/\.zip$/i.test(zipName)) {
            res.render("error", {message: "Uploaded file is not a zip file."});
            return;
        }

        var jobName = zipName.replace(/\.zip$/i, "");

        file
            .pipe(unzip.Extract())
            .on("entry", function(entry) {
                var filePath = entry.path;
                var type = entry.type; // Directory or File

                if (type === "File" && /([^\/\\]+)\.jpe?g$/i.test(filePath)) {
                    var fileName = RegExp.$1;
                    files.push(fileName);
                    entry.pipe(fs.createWriteStream(
                        path.join(jobDir, fileName + ".jpg")));
                } else {
                    entry.autodrain();
                }
            })
            .on("error", function(err) {
                throw err;
            })
            .on("close", function(err) {
                if (err) {
                    res.render("error", {message: "Error opening zip file."});
                    return;
                }

                Job.create({
                    _id: jobName,
                    state: "uploaded",
                    imageCount: files.length,
                    uploadDate: new Date(),
                    images: files
                }, function(err, job) {
                    if (err) {
                        // Maybe file already uploaded?
                        res.render("error", {message:
                            "Zip file with this name was already uploaded."});
                        return;
                    }

                    async.eachLimit(files, 1, function(fileName, callback) {
                        Image.create({
                            _id: fileName,
                            jobId: job._id,
                            fileName: fileName,
                            state: "uploaded"
                        }, callback);
                    }, function() {
                        // Use files array
                        res.render("index", { title: "Express" });
                    });
                });
            });
    });
});

module.exports = router;