#!/bin/sh
mongoimport -h localhost -d cocoapods -c pods --jsonArray -file ../data/data.json

