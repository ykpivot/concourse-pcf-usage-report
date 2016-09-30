#!/bin/bash
set -e

# This script retrieves a json object containing a list of all orgs in a PCF deploy

cf api $PCF_API_ENDPOINT --skip-ssl-validation

cf login -u $SYS_ADMIN_USER -p $SYS_ADMIN_PASSWORD -o "system" -s "system"

export DATE_FROM="2016-09-01"
export DATE_TO="2016-09-27"

export ORGS_FILE=./orgs-list/pcf-orgs.json
export OUTPUT_DIR_NAME=spaces-usage

# find .
# echo "Current directory: $PWD"

## iterate through list of orgs from json file
jq -r ".resources[] | .entity.name" $ORGS_FILE | while read key ; do

  echo "Processing organization [$key]"

  export org_guid="$(jq --arg mykey "$key" -r '.resources[] | select(.entity.name == $mykey) | .metadata.guid' $ORGS_FILE)"

  echo "Get all Space Quotas defined for the org using CF API /v2/organizations/:guid/space_quota_definitions"
  export ORG_SPACE_QUOTAS_FILE=./$OUTPUT_DIR_NAME/$key-space-quotas-def.json
  cf curl /v2/organizations/$org_guid/space_quota_definitions > $ORG_SPACE_QUOTAS_FILE
  node ./pipeline-scripts/scripts/mergeIntoOrgObject.js $ORG_SPACE_QUOTAS_FILE "space_quota_definitions" $ORGS_FILE $org_guid
  rm $ORG_SPACE_QUOTAS_FILE

  echo "Get all Spaces for the org using CF API /v2/organizations/:guid/spaces"
  export ORG_SPACES_FILE=./$OUTPUT_DIR_NAME/$key-spaces-def.json
  cf curl /v2/organizations/$org_guid/spaces > $ORG_SPACES_FILE

  echo "Get service usage for spaces of the org using PCF Usage Report API"
  export ORG_SERVICES_USAGE_FILE=./$OUTPUT_DIR_NAME/$key-services-usage.json
  curl "https://app-usage.$PCF_APPS_DOMAIN/organizations/$org_guid/service_usages?start=$DATE_FROM&end=$DATE_TO" -k -H "authorization: `cf oauth-token`" > $ORG_SERVICES_USAGE_FILE
  ## merge services instances usage for each space into the space object/file
  node ./pipeline-scripts/scripts/mergeSpaceUsageInfo.js $ORG_SERVICES_USAGE_FILE $ORG_SPACES_FILE
  rm $ORG_SERVICES_USAGE_FILE

  echo "Get application usage details for organization using PCF Usage Report API"
  export ORG_APPS_USAGE_FILE=./$OUTPUT_DIR_NAME/$key.json
  curl "https://app-usage.$PCF_APPS_DOMAIN/organizations/$org_guid/app_usages?start=$DATE_FROM&end=$DATE_TO" -k -H "authorization: `cf oauth-token`" > $ORG_APPS_USAGE_FILE
  node ./pipeline-scripts/scripts/mergeAppsUsageInfo.js $ORG_APPS_USAGE_FILE $ORG_SPACES_FILE
  rm $ORG_APPS_USAGE_FILE

  echo "Get application definitions for each space of the organization using CF API /v2/spaces/:guid/apps"
  ## iterate through spaces and add App details info to each space object
  jq -r ".resources[] | .metadata.guid" $ORG_SPACES_FILE | while read spaceguid ; do
     echo "Processing spaceguid [$spaceguid]"
     export CURRENT_SPACE_APPS_DETAILS_FILE=./$OUTPUT_DIR_NAME/$spaceguid-apps.json
     ## get apps details for space
     cf curl /v2/spaces/$spaceguid/apps > $CURRENT_SPACE_APPS_DETAILS_FILE
     ## add app details to space object
     node ./pipeline-scripts/scripts/mergeIntoOrgObject.js $CURRENT_SPACE_APPS_DETAILS_FILE "applications" $ORG_SPACES_FILE $spaceguid
     rm $CURRENT_SPACE_APPS_DETAILS_FILE
  done

  echo "Merge updated spaces json object into the main org file"
  node ./pipeline-scripts/scripts/mergeIntoOrgObject.js $ORG_SPACES_FILE "spaces" $ORGS_FILE $org_guid
  rm $ORG_SPACES_FILE

done

cat $ORGS_FILE

# copy produced orgs json to file repository
