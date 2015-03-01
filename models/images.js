var mongoose = require("mongoose");

mongoose.model("Image", {
    jobId: mongoose.types.ObjectId,
    clusterId: mongoose.types.ObjectId,
    fileName: String
});