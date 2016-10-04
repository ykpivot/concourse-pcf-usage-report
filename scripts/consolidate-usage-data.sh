#!/bin/bash
set -e

# This script retrieves a json object containing a list of all orgs in a PCF deploy

export ORGS_USAGE_FILE=./orgs-usage/pcf-orgs-usage.json
export OUTPUT_DIR_NAME=orgs-usage-consolidated
export OUTPUT_CONSOLIDATED_FILE=./$OUTPUT_DIR_NAME/pcf-usage-consolidated.json

node ./pipeline-scripts/scripts/consolidate-usage-data.js $ORGS_USAGE_FILE $OUTPUT_CONSOLIDATED_FILE

# find .

cat $OUTPUT_CONSOLIDATED_FILE
