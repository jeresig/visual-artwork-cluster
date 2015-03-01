var mongoose = require("mongoose");

mongoose.model("Job", {
    state: String,
    imageCount: Number,
    uploadDate: Date,
    uploadIP: String,
    images: [mongoose.types.ObjectId],
    clusters: [mongoose.types.ObjectId],
    processed: Boolean
});