var mongoose = require("mongoose");

mongoose.model("Cluster", {
    jobId: mongoose.types.ObjectId,
    images: [mongoose.types.ObjectId],
    processed: Boolean
});