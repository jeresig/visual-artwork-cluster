"use strict";

const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const express = require("express");
const router = express.Router();

const Data = mongoose.model("Data");

const urlencodedParser = bodyParser.urlencoded({extended: true});

/* POST new data upload */
router.post("/new-data-file", (req, res, next) => {
    req.busboy.on("file", (field, file) => {
        Data.writeDataFile(file, () => {
            res.render("data-complete", {});
        });
    });

    req.pipe(req.busboy);
});

/* POST update existing data record */
router.post("/update-data", urlencodedParser, (req, res, next) => {
    Data.update(
        {_id: req.body.id},
        {data: req.body.data},
        {upsert: true},
        (err) => {
            if (err) {
                return res.render("error", {
                    message: "Error updating data record.",
                });
            }

            res.redirect(`/cluster/${req.body.cluster}`);
        }
    );
});

module.exports = router;
