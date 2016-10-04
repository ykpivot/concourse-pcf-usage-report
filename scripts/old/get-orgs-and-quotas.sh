#!/bin/bash
set -e

# This script retrieves a json object containing a list of all orgs in a PCF deploy

export OUTPUT_DIR_NAME=orgs-list
export ORGS_FILE=./$OUTPUT_DIR_NAME/pcf-orgs.json

cf api $PCF_API_ENDPOINT --skip-ssl-validation

cf login -u $SYS_ADMIN_USER -p $SYS_ADMIN_PASSWORD -o "system" -s "system"

echo "Get list of all organizations using CF API /v2/organizations"
cf curl /v2/organizations > $ORGS_FILE

echo "Adding start and end dates of report to json object"
node ./pipeline-scripts/scripts/mergeFieldIntoObject.js "start_date" $USAGE_START_DATE $ORGS_FILE
node ./pipeline-scripts/scripts/mergeFieldIntoObject.js "end_date" $USAGE_END_DATE $ORGS_FILE

echo "Get list of all quota definitions using CF API /v2/quota_definitions"
export QUOTAS_DEFINITION_FILE=./$OUTPUT_DIR_NAME/service_plans.json
cf curl /v2/quota_definitions > $QUOTAS_DEFINITION_FILE
##  merge info into main Orgs output file
node ./pipeline-scripts/scripts/mergeIntoObject.js $QUOTAS_DEFINITION_FILE "quota_definitions" $ORGS_FILE
rm $QUOTAS_DEFINITION_FILE

echo "Get list of all service definitions using CF API /v2/services"
export SERVICES_FILE=./$OUTPUT_DIR_NAME/services.json
cf curl /v2/services > $SERVICES_FILE
##  merge info into main Orgs output file
node ./pipeline-scripts/scripts/mergeIntoObject.js $SERVICES_FILE "services" $ORGS_FILE
rm $SERVICES_FILE

echo "Get list of all service plan definitions using CF API /v2/service_plans"
export SERVICE_PLANS_FILE=./$OUTPUT_DIR_NAME/service_plans.json
cf curl /v2/service_plans > $SERVICE_PLANS_FILE
##  merge info into main Orgs output file
node ./pipeline-scripts/scripts/mergeIntoObject.js $SERVICE_PLANS_FILE "service_plans" $ORGS_FILE
rm $SERVICE_PLANS_FILE

echo "Get list of all buildpacks definitions using CF API /v2/buildpacks"
export BUILDPACKS_DEF_FILE=./$OUTPUT_DIR_NAME/buildpacks.json
cf curl /v2/buildpacks > $BUILDPACKS_DEF_FILE
##  merge info into main Orgs output file
node ./pipeline-scripts/scripts/mergeIntoObject.js $BUILDPACKS_DEF_FILE "buildpacks" $ORGS_FILE
rm $BUILDPACKS_DEF_FILE

# find .

cat $ORGS_FILE
