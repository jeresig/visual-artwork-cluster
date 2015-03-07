var mongoose = require("mongoose");

mongoose.model("Job", {
    _id: String,
    state: String,
    imageCount: Number,
    uploadDate: Date,
    uploadIP: String,
    images: [String],
    clusters: [mongoose.types.ObjectId],
    processed: Boolean
});