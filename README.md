
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