var mongoose = require("mongoose");

mongoose.model("Image", {
    _id: String,
    jobId: {type: String, ref: "Job"},
    clusterId: {type: mongoose.Schema.Types.ObjectId, ref: "Cluster"},
    fileName: String,
    state: String
});