var mongoose = require("mongoose");

mongoose.model("Job", {
    _id: String,
    state: String,
    imageCount: Number,
    uploadDate: Date,
    uploadIP: String,
    images: [{type: String, ref: "Image"}],
    clusters: [{type: mongoose.Schema.Types.ObjectId, ref: "Cluster"}],
    processed: Boolean
});