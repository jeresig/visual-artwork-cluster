"use strict";

const mongoose = require("mongoose");

const artworkRegex = process.env.ARTWORK_ID_REGEX || "([^.]*)";
const artworkIDRegex = new RegExp(artworkRegex, "i");

const getArtworkName = (fileName) =>
    artworkIDRegex.exec(fileName)[1];

const Image = new mongoose.Schema({
    _id: String,
    jobId: {type: String, ref: "Job"},
    fileName: String,
    state: String,
    entropy: Number,
    similarityId: String,
    similarImages: [{
        image: {type: String, ref: "Image"},
        score: Number,
    }],
});

Image.statics = {
    getArtworkName,
};

Image
    .virtual("artwork")
    .get(function() {
        return getArtworkName(this.fileName);
    });

Image
    .virtual("similarArtworks")
    .get(function() {
        const artworks = {};

        for (const similar of this.similarImages) {
            const image = similar.image;
            const artworkID = typeof image === "string" ?
                getArtworkName(image) :
                getArtworkName(image.fileName);
            artworks[artworkID] = true;
        }

        return Object.keys(artworks)
            .filter((artwork) => artwork !== this.artwork);
    });

mongoose.model("Image", Image);
