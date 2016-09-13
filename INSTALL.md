Installation instructions are for setting up everything that you need to run this tool on a computer using Ubuntu 16.04.1 x64. How much disk space and memory you need will depend upon how many images you plan on uploading. Roughly, Pastec requires 1GB of RAM for 50,000 images.

This guide assumes that you have Ubuntu 16.04.1 x64 and Git already installed.

# Installing Dependencies

Start by installing a bunch of necessary dependencies:

```
apt-get install python build-essential checkinstall mongodb libopencv-dev libmicrohttpd-dev libjsoncpp-dev cmake
```

## Install Image Magick

Normally we'd install Image Magick using `apt-get`, however it has an old version and we need to use at least version 6.9. I followed [this guide](https://www.imagemagick.org/discourse-server/viewtopic.php?t=29006) to install the updated version.

I ran the following commands and I was able to get a working `convert` and `identify` command in the end.

```
apt-get build-dep imagemagick -y
apt-get install libmagick++-dev
wget http://www.imagemagick.org/download/ImageMagick.tar.gz
cd ImageMagick-7.0.3-0/
./configure
make
make install
ldconfig
```

## Install Node.js v6

I used [the following guide](https://www.digitalocean.com/community/tutorials/how-to-install-node-js-on-ubuntu-16-04) to install Node.js v6, running the following commands:

```
curl -sL https://deb.nodesource.com/setup_6.x -o nodesource_setup.sh
bash nodesource_setup.sh
apt-get install nodejs
```

## Install Pastec

I [followed this guide](http://pastec.io/doc/oss/) for installing Pastec. However, I have a custom-forked version of Pastec that I'm using that provides some additional, useful, features.

```
git clone -b auto-save https://github.com/jeresig/pastec.git
cd pastec
wget http://pastec.io/files/visualWordsORB.tar.gz
tar -xzvf visualWordsORB.tar.gz
rm visualWordsORB.tar.gz
mkdir build
cd build
make
```

You're probably going to want a pre-created index to start with, you can use the one that I pre-built:

```
wget http://ejohn.org/files/cluster-images.dat.zip
unzip cluster-images.dat.zip
```

The pastec binary will be at: `pastec/build/pastec`. You can determine where you'd like to place the binary. I left it in that directory and then made a script called `start-pastec.sh` inside the pastec directory with the following logic:

```
#!/bin/bash

./build/pastec -i cluster-images.dat --cache-words --auto-save 120 visualWordsORB.dat &> cluster-log.txt &
```

Then you can run:

```
chmod +x start-pastec.sh
```

And finally the following to start Pastec:

```
./start-pastec.sh
```

# Installing the Visual Artwork Cluster Tool

Clone the code from Github:

```
git clone https://github.com/jeresig/visual-artwork-cluster.git
cd visual-artwork-cluster
```

## Configuration

Make a `.env` file with the following options in it:

```
UPLOAD_DIR=uploads
MONGO_URL=mongodb://localhost/visual-artwork-cluster
ARTWORK_ID_REGEX=^(\d{13})
ARTWORK_URL=http://digitalcollections.frick.org/digico/#/details/barcode/%s
ARTWORK_THUMB_URL=http://digitalcollections.frick.org/media/barcode/%s/thumb
ARTWORK_IMAGE_URL=http://digitalcollections.frick.org/media/barcode/%s/large
DATA_ARTWORK_FIELD=Barcode
DATA_FIXED_FIELD=FileName
DATA_FIELD_SEPARATOR=\t
DATA_RECORD_SEPARATOR=\r\n
MIN_ENTROPY=0.72
MIN_SIMILARITY=20
IDENTIFY_BINARY=/usr/local/bin/identify
```

- The directory (UPLOAD\_DIR) to which uploaded images should be stored.
- The URL (MONGO\_URL) of the Mongodb server and database (including any authentication information). This is to where the server will attempt to connect.
- A regex (ARTWORK\_ID\_REGEX) that is used to extract an artwork id from the image file name. This is used to get a unique id from the image file name and then helpfully pre-process clusters to only show ones that are matching images from different artworks.
- An URL (ARTWORK\_URL) of the record in the Digital Asset Management system. The images in the results will link to the corresponding record, replacing the '%s' with the artwork ID.
- Two image URLs (ARTWORK\_THUMB\_URL and ARTWORK\_IMAGE\_URL) that correlate to the thumb and full-size images representing the artwork. These fields will have '%s' replaced with the artwork ID. If you just wish to use the images that you uploaded previously you can just use something like `/uploads/%s_001.jpg`.
- Two field names (DATA\_ARTWORK\_FIELD and DATA\_FIXED\_FIELD) which correlate to the Artwork ID and the field that will never be changed when modifying the data.
- Two record separators (DATA\_FIELD\_SEPARATOR and DATA\_RECORD\_SEPARATOR) which are used for parsing data that's uploaded into the tool.
- A number (MIN\_ENTROPY) that is the minimum threshold against which the entropy of images will be filtered (images below that threshold will be ignored, defaults to 0).
- A number (MIN\_SIMILARITY) is the minimum similarity score, returned from Pastec, which will be accepted for a match (defaults to 0).
- A binary path (IDENTIFY\_BINARY) that points to the location of the `identify` binary, if it's in a non-standard location.

Make sure the UPLOAD_DIR exists. By default the port of the service is 3000 you can set `PORT=` to another port, if you wish.

## Installing the Background Image Processing

Finally, run the following to install dependencies from NPM and install a Cronjob for managing the image uploads in the background:

```
./install.sh
```

If you wish to keep logs of what is happening in the background process you can following [this guide](https://askubuntu.com/questions/222512/cron-info-no-mta-installed-discarding-output-error-in-the-syslog).