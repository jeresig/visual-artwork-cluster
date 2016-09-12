"use strict";

const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const express = require("express");
const router = express.Router();

const Data = mongoose.model("Data");

const urlencodedParser = bodyParser.urlencoded({extended: true});

/* POST new data upload */
router.post("/upload", (req, res, next) => {
    req.busboy.on("file", (field, file) => {
        Data.writeDataFile(file, () => {
            // Remove all existing data modifications on upload
            Data.remove({}, () => {
                res.render("data-complete", {});
            });
        });
    });

    req.pipe(req.busboy);
});

/* POST update existing data record */
router.post("/update", urlencodedParser, (req, res, next) => {
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

/* GET download data changes */
router.get("/download", (req, res, next) => {
    Data.find({}, (err, data) => {
        if (err) {
            return res.render("error", {
                message: "Error downloading data records.",
            });
        }

        if (data.length === 0) {
            return res.render("error", {
                message: "No data records to download.",
            });
        }

        const oldID = `__old_${process.env.DATA_ARTWORK_FIELD}`;
        const keys = Object.keys(data[0].toJSON().data);
        const header = [oldID].concat(keys).join(Data.getFieldSeparator());
        const lines = data
            .map((record) => [record._id].concat(
                keys.map((key) => record.data[key]))
                .join(Data.getFieldSeparator()));

        res.set("Content-Type", "application/octet-stream");
        res.set("Content-Disposition",
            "attachment;filename=revised-data.tsv");
        res.send([header].concat(lines).join(Data.getRecordSeparator()));
    });
});

module.exports = router;
