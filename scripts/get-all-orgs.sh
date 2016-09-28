#!/bin/bash
set -e

# This script retrieves a json object containing a list of all orgs in a PCF deploy

cf api $PCF_API_ENDPOINT --skip-ssl-validation

cf login -u $SYS_ADMIN_USER -p $SYS_ADMIN_PASSWORD -o "system" -s "system"

cf curl /v2/organizations > ./orgs-list/pcf-orgs.json

find .

cat ./orgs-list/pcf-orgs.json
