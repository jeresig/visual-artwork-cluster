var express = require("express");
var router = express.Router();

var ME = require("matchengine")({
    username: process.env.ME_USER,
    password: process.env.ME_PASSWORD
});

/* POST new upload */
router.post("/new", function(req, res, next) {
    res.render("index", { title: "Express" });
});

module.exports = router;