var mongoose = require("mongoose");

mongoose.model("Cluster", {
    jobId: String,
    images: [String],
    processed: Boolean
});