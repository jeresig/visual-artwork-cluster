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

const formatLine = (line) =>
    line.map((field) => `"${field}"`).join(",");

/* GET download data changes */
router.get("/download", (req, res, next) => {
    Data.getData((err, data) => {
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

        Data.getModifiedData((err, modified) => {
            if (err) {
                return res.render("error", {
                    message: "Error downloading data records.",
                });
            }

            const ARTWORK_FIELD = process.env.DATA_ARTWORK_FIELD;
            const FIXED_FIELD = process.env.DATA_FIXED_FIELD;
            const fields = Object.keys(data[0])
                .filter((field) => field !== FIXED_FIELD);
            const header = [FIXED_FIELD].concat(fields);

            for (const field of fields) {
                if (field !== FIXED_FIELD) {
                    header.push(`Old_${field}`);
                }
            }

            const lines = data.map((record) => {
                const artworkID = record[ARTWORK_FIELD];
                const modifiedData = modified[artworkID] || record;
                return [record[FIXED_FIELD]]
                    .concat(fields.map((key) => modifiedData[key]))
                    .concat(fields.map((key) => record[key]));
            });

            res.set("Content-Type", "application/octet-stream");
            res.set("Content-Disposition",
                "attachment;filename=revised-data.csv");
            res.send([header].concat(lines).map(formatLine).join("\n"));
        });
    });
});

module.exports = router;
