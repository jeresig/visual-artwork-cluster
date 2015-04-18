#!/bin/sh
(crontab -l ; echo "* * * * * node `pwd`/process-images.js") | sort - | uniq -
