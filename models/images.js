var mongoose = require("mongoose");

mongoose.model("Image", {
    _id: String,
    jobId: String,
    clusterId: mongoose.types.ObjectId,
    fileName: String,
    state: String
});