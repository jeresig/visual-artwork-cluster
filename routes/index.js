var express = require("express");
var router = express.Router();

var unzip = require("unzip");

/* GET home page. */
router.get("/", function(req, res, next) {
    req.pipe(req.busboy);

    req.busboy.on("file", function(field, file, fileName) {
        file
            .pipe(unzip.Extract())
            .on("entry", function(entry) {
                var fileName = entry.path;
                var type = entry.type; // Directory or File

                if (true) {
                    entry.pipe(fs.createWriteStream(fileName));
                } else {
                    entry.autodrain();
                }
            })
            .on("close", function() {
                // TODO: Start job
                res.render("index", { title: "Express" });
            });
    });
});

module.exports = router;
