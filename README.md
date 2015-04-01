# Visual Artwork Cluster

This is a web application that uses MatchEngine to cluster batches of images together to aide in the process of cataloging digitized images.

# How to Use

Images should be uploaded in batches, contained within a single zip file. All of the images should be JPEGs. Upload the zip file to the service and wait for the batch to finish processing. All of the images should have unique names and the name of the zip file will be used to keep track of the batch, as it's being processed.

Once a batch of images have been uploaded they will begin to be processed. First they will be uploaded to the MatchEngine service. After all the images have been uploaded their image similarity data will be downloaded and loaded into a local database. At this point the batch of images will become viewable.

Images will be clustered into groups of near-identical images. This is done such that a cataloger can go through and catalog the images as representing the same artwork (or different, but similar, artworks - as the case may be) in their database. An additional button "Mark as processed" is provided such that a cataloger can mark a cluster of images as having been processed in their database, so that they won't accidentally re-visit them again.

# Installation

- Make a directory for the files to be uploaded to.
- Make a configuration file named '.env' inside this directory.

The configuration file should look like this:

    ME_USER=myusername
    ME_PASSWORD=mypassword
    ME_DIR=medir
    UPLOAD_DIR=/my/dir
    MONGO_URL=mongodb://mongourl:10037/dbname

There are five properties that you need to specify:

- The MatchEngine username (ME\_USER) and password (ME\_PASS) that you received when you signed up with the MatchEngine service.
- The directory (ME\_DIR) in which the images should be stored in the MatchEngine service. This is not visible to the user, it's purely a convenience for keeping your uploaded images organized.
- The directory (UPLOAD\_DIR) to which uploaded images should be stored.
- The URL (MONGO\_URL) of the Mongodb server and database (including any authentication information). This is to where the server will attempt to connect.

TODO: Document setting up cron job.