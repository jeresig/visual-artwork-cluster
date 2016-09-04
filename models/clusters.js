"use strict";

const util = require("util");

const mongoose = require("mongoose");

const Cluster = new mongoose.Schema({
    jobId: {type: String, ref: "Job"},
    images: [{type: String, ref: "Image"}],
    imageCount: Number,
    processed: Boolean,
});

const ARTWORK_URL = process.env.ARTWORK_URL;
const ARTWORK_IMAGE_URL = process.env.ARTWORK_IMAGE_URL;
const ARTWORK_THUMB_URL = process.env.ARTWORK_THUMB_URL;

Cluster
    .virtual("artworks")
    .get(function() {
        const artworks = {};

        for (const image of this.images) {
            artworks[image.artwork] = true;
        }

        return Object.keys(artworks).sort().map((id) => ({
            id,
            url: util.format(ARTWORK_URL, id),
            imageUrl: util.format(ARTWORK_IMAGE_URL, id),
            thumbUrl: util.format(ARTWORK_THUMB_URL, id),
        }));
    });

mongoose.model("Cluster", Cluster);
