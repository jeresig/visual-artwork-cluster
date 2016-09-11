"use strict";

const util = require("util");

const mongoose = require("mongoose");

const ARTWORK_URL = process.env.ARTWORK_URL;
const ARTWORK_IMAGE_URL = process.env.ARTWORK_IMAGE_URL;
const ARTWORK_THUMB_URL = process.env.ARTWORK_THUMB_URL;

const Cluster = new mongoose.Schema({
    jobId: {type: String, ref: "Job"},
    images: [{type: String, ref: "Image"}],
    imageCount: Number,
    processed: Boolean,
});

Cluster.methods = {
    addImage(image) {
        this.images.push(image);
        this.imageCount += 1;
    },
};

Cluster
    .virtual("artworks")
    .get(function() {
        const Image = mongoose.model("Image");
        const artworks = {};

        for (const image of this.images) {
            const artworkID = typeof image === "string" ?
                Image.getArtworkName(image) :
                image.artwork;
            artworks[artworkID] = true;
        }

        return Object.keys(artworks).sort().map((id) => ({
            id,
            url: util.format(ARTWORK_URL, id),
            imageUrl: util.format(ARTWORK_IMAGE_URL, id),
            thumbUrl: util.format(ARTWORK_THUMB_URL, id),
        }));
    });

mongoose.model("Cluster", Cluster);
