#!/bin/bash
set -e

# This script retrieves a json object containing a list of all orgs in a PCF deploy

cf api $PCF_API_ENDPOINT --skip-ssl-validation

cf login -u $SYS_ADMIN_USER -p $SYS_ADMIN_PASSWORD -o "system" -s "system"

export ORGS_FILE=./orgs-list/pcf-orgs.json

## iterate through list of orgs from json file
jq -r ".resources[] | .entity.name" $ORGS_FILE | while read key ; do

  echo "$key"

  export org_guid="$(jq --arg mykey "$key" -r '.resources[] | select(.entity.name == $mykey) | .metadata.guid' $ORGS_FILE)"

  export ORGS_APPS_FILE=./spaces-usage/$key.json

  ## get application usage details for organization
  curl "https://app-usage.$PCF_APPS_DOMAIN/organizations/$org_guid/app_usages?start=2016-09-01&end=2016-09-27" -k -H "authorization: `cf oauth-token`" > $ORGS_APPS_FILE

  # cat $ORGS_APPS_FILE | jq -r .

  ## for each app, get app details for Disk quota + buildpack info
  jq -r ".app_usages[] | .app_guid" $ORGS_APPS_FILE | while read appid ; do
     export CURRENT_APP_DETAILS_FILE=./spaces-usage/$appid.json
     ## get app details
     cf curl /v2/apps/$appid > $CURRENT_APP_DETAILS_FILE
     # add app details to app object
     node ./scripts/mergeAppInfo.js $ORGS_APPS_FILE $appid $CURRENT_APP_DETAILS_FILE
     rm CURRENT_APP_DETAILS_FILE
  done

  cat $ORGS_APPS_FILE

done
