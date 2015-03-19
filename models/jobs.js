var mongoose = require("mongoose");

mongoose.model("Job", {
    _id: String,
    /* States:
     * - uploaded
     * - uploaded-me
     * - completed
     */
    state: String,
    inProgress: Boolean,
    imageCount: Number,
    uploadDate: Date,
    uploadIP: String,
    images: [{type: String, ref: "Image"}],
    clusters: [{type: mongoose.Schema.Types.ObjectId, ref: "Cluster"}]
});