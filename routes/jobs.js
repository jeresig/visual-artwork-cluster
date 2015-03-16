var fs = require("fs");
var path = require("path");

var async = require("async");
var mongoose = require("mongoose");
var unzip = require("unzip2");
var express = require("express");
var router = express.Router();

var Job = mongoose.model("Job");
var Image = mongoose.model("Image");

/* GET job */
router.get("/:jobName", function(req, res, next) {
    Job.findById(req.params.jobName)
        .populate("images")
        .exec(function(err, job) {
            res.render("job", {
                job: job
            });
        });
});

/* POST new upload */
router.post("/new", function(req, res, next) {
    var uploadDir = process.env.UPLOAD_DIR;
    var files = [];
    var existingFiles = [];

    req.busboy.on("file", function(field, file, zipName) {
        if (!/\.zip$/i.test(zipName)) {
            return res.render("error", {
                message: "Uploaded file is not a zip file."
            });
        }

        var jobName = zipName.replace(/\.zip$/i, "");

        file
            .pipe(unzip.Parse())
            .on("entry", function(entry) {
                var filePath = entry.path;
                var type = entry.type; // Directory or File

                // Ignore things that aren't files (e.g. directories)
                // Ignore files that don't end with .jpe?g
                // Ignore files that start with '.'
                if (type !== "File" || !/([^\/\\]+)\.jpe?g$/i.test(filePath) ||
                        RegExp.$1.indexOf(".") === 0) {
                    return entry.autodrain();
                }

                var fileName = RegExp.$1;
                var outFileName = path.join(uploadDir, fileName + ".jpg");

                fs.exists(outFileName, function(exists) {
                    // Don't attempt to add files that already exist
                    if (exists) {
                        existingFiles.push(fileName);
                        return entry.autodrain();
                    }

                    files.push(fileName);
                    entry.pipe(fs.createWriteStream(outFileName));
                });
            })
            .on("error", function(err) {
                throw err;
            })
            .on("close", function(err) {
                if (err) {
                    return res.render("error", {
                        message: "Error opening zip file."
                    });
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
                        return res.render("error", {
                            message:
                                "Zip file with this name was already uploaded."
                        });
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
                        res.render("complete", {
                            title: "Upload Completed",
                            message: "",
                            existingFiles: existingFiles
                        });
                    });
                });
            });
    });

    req.pipe(req.busboy);
});

module.exports = router;