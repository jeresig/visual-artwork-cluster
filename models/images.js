"use strict";

const mongoose = require("mongoose");

mongoose.model("Image", {
    _id: String,
    jobId: {type: String, ref: "Job"},
    fileName: String,
    artwork: String,
    state: String,
    entropy: Number,
});
