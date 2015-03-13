var mongoose = require("mongoose");

mongoose.model("Cluster", {
    jobId: {type: String, ref: "Job"},
    images: [{type: String, ref: "Image"}],
    processed: Boolean
});