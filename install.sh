#!/bin/sh

# Install all required NPM modules
npm install

# Install process-images script which will be used to periodically
# move data through the process queue
(crontab -l ; echo "* * * * * node `pwd`/process-images.js") | sort - | uniq -
