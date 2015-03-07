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
                var fileName = entry.path;
                var type = entry.type; // Directory or File

                if (type === "File" && /\.jpe?g$/i.test(fileName)) {
                    files.push(fileName);
                    entry.pipe(fs.createWriteStream(fileName));
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

                // TODO: Start job
                Job.create({
                    _id: jobName,
                    state: "uploaded",
                    imageCount: files.length,
                    uploadDate: new Date(),
                    images: []
                }, function(err) {
                    if (err) {
                        // Maybe file already uploaded?
                        res.render("error", {message:
                            "Zip file with this name was already uploaded."});
                        return;
                    }

                    // Use files array
                    res.render("index", { title: "Express" });
                });
            });
    });
});

module.exports = router;