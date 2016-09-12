"use strict";

const fs = require("fs");
const path = require("path");

const mongoose = require("mongoose");
const csv = require("csv-streamify");

const Data = new mongoose.Schema({
    _id: String,
    data: Object,
});

const clean = (str) => str
    .replace(/\\t/g, "\t")
    .replace(/\\r/g, "\r")
    .replace(/\\n/g, "\n");

Data.statics = {
    getFieldSeparator() {
        return clean(process.env.DATA_FIELD_SEPARATOR);
    },

    getRecordSeparator() {
        return clean(process.env.DATA_RECORD_SEPARATOR);
    },

    getData(callback) {
        const dataFile = path.join(process.env.UPLOAD_DIR, "data.csv");
        const results = [];

        fs.stat(dataFile, (err) => {
            if (err) {
                return callback(null, results);
            }

            fs.createReadStream(dataFile)
                .pipe(csv({
                    objectMode: true,
                    delimiter: this.getFieldSeparator(),
                    newline: this.getRecordSeparator(),
                    columns: true,
                }))
                .on("data", (data) => {
                    results.push(data);
                })
                .on("error", callback)
                .on("end", () => {
                    callback(null, results);
                });
        });
    },

    getDataByArtwork(callback) {
        const ARTWORK_FIELD = process.env.DATA_ARTWORK_FIELD;
        const results = {};

        this.getData((err, records) => {
            if (err) {
                return callback(err);
            }

            for (const record of records) {
                results[record[ARTWORK_FIELD]] = record;
            }

            callback(null, results);
        });
    },

    getModifiedData(callback) {
        this.find({}, (err, records) => {
            const results = {};

            for (const record of records) {
                results[record._id] = record.data;
            }

            callback(err, results);
        });
    },

    writeDataFile(file, callback) {
        const dataFile = path.join(process.env.UPLOAD_DIR, "data.csv");

        file
            .pipe(fs.createWriteStream(dataFile))
            .on("close", callback);
    },
};

mongoose.model("Data", Data);
