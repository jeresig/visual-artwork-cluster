# Visual Artwork Cluster

This is a web application that uses [Pastec](http://pastec.io/) to cluster batches of images together to aide in the process of cataloging digitized images.

# How to Use

Images should be uploaded in batches, contained within a single zip file. All of the images should be JPEGs. Upload the zip file to the service and wait for the batch to finish processing. All of the images should have unique names and the name of the zip file will be used to keep track of the batch, as it's being processed.

Once a batch of images have been uploaded they will begin to be processed. First they will be uploaded to the Pastec service. After all the images have been uploaded their image similarity data will be downloaded and loaded into a local database. At this point the batch of images will become viewable.

Images will be clustered into groups of near-identical images. This is done such that a cataloger can go through and catalog the images as representing the same artwork (or different, but similar, artworks - as the case may be) in their database. An additional button "Mark as processed" is provided such that a cataloger can mark a cluster of images as having been processed in their database, so that they won't accidentally re-visit them again.

# Installation

[See INSTALL.md](INSTALL.md)

# Running the Tool

To run the tool you can execute the following:

```
npm start
```

The server should be available on the port that you specified, or 3000 by default. Make sure that Mongodb and Pastec are also running.