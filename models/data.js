"use strict";

const fs = require("fs");
const path = require("path");

const mongoose = require("mongoose");
const csv = require("csv-streamify");

const Data = new mongoose.Schema({
    _id: String,
    data: Object,
});

const loadModifiedData = (results, callback) => {
    mongoose.model("Data").find({}, (err, records) => {
        for (const record of records) {
            results[record._id] = record.data;
        }
        callback(err, results);
    });
};

Data.statics = {
    getChangedData(callback) {
        const results = {};
        loadModifiedData(results, callback);
    },

    getData(callback) {
        const dataFile = path.join(process.env.UPLOAD_DIR, "data.csv");
        const ARTWORK_FIELD = process.env.DATA_ARTWORK_FIELD;
        const results = {};

        fs.stat(dataFile, (err) => {
            if (err || !ARTWORK_FIELD) {
                return callback(null, results);
            }

            fs.createReadStream(dataFile)
                .pipe(csv({
                    objectMode: true,
                    delimiter: "\t",
                    newline: "\r\n",
                    columns: true,
                }))
                .on("data", (data) => {
                    results[data[ARTWORK_FIELD]] = data;
                })
                .on("error", callback)
                .on("end", () => {
                    loadModifiedData(results, callback);
                });
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
