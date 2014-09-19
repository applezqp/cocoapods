#!/bin/sh
mongoexport -h localhost -d cocoapods -c pods --jsonArray -o ../data/data.json
