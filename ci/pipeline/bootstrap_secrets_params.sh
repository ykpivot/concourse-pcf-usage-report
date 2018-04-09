#!/bin/bash

# set the path for the secrets below to be created in vault or credhub
concourse_secrets_path="/concourse/my-team"

# VAULT or CREDHUB - targeted secrets management system
targeted_system="VAULT"

# This script assumes that:
# 1) the credhub or vault CLI is installed
# 2) you setup your vault or credhub target and login commands prior to invoking it
#    e.g. for VAULT
#    export VAULT_ADDR=https://myvaultdomain:8200
#    export VAULT_SKIP_VERIFY=true
#    export VAULT_TOKEN=vault-token
#
#    e.g. for CREDHUB
#    credhub login -s credhub-server-uri -u username -p password --skip-tls-validation

## UPDATE the secret entries below with the corresponding values for your PCF PKS environment

secrets=(
  "pcf-api-endpoint"::"https://api.system.domain.com"
  "pcf-apps-domain"::"system.domain.com"
  "pcf-sys-admin-user"::"admin"
  "pcf-sys-admin-user-password"::"my-pcf-api-password"
  "pcf-usage-report-deploy-name"::"pcf-deploy-name"
  "pcf-usage-report-org"::"system"
  "pcf-usage-report-space"::"system"
  "pcf-usage-report-s3-bucket"::"mybucket"
  "pcf-usage-report-s3-access-key-id"::"myaccesskey"
  "pcf-usage-report-s3-secret-access-key"::"mysecret"
  "pcf-usage-report-s3-region_name"::"us-west-1"
  "pcf-usage-report-email-from"::"myuser@pivotal.io"
  "pcf-usage-report-email-to"::"myuser@pivotal.io"

)

for i in "${secrets[@]}"
do
  KEY="${i%%::*}"
  VALUE="${i##*::}"
  echo "Creating secret for [$KEY]"
  if [[ $targeted_system == "VAULT" ]]; then
    vault write "${concourse_secrets_path}/${KEY}" value="${VALUE}"
  else   # CREDHUB
    credhub set -n "${concourse_secrets_path}/${KEY}" -v "${VALUE}"
  fi
done
