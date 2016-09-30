#!/bin/bash
set -e

# This script retrieves a json object containing a list of all orgs in a PCF deploy

export OUTPUT_DIR_NAME=orgs-usage-consolidated
export ORGS_USAGE_FILE=./orgs-usage/pcf-orgs-usage.json

find .

# cat $ORGS_USAGE_FILE
