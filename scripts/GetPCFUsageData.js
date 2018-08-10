const fs = require('fs');
const execSync = require('child_process').execSync;

function GetPCFUsageData() {
}

GetPCFUsageData.prototype.OUTPUT_DIR_NAME="";
GetPCFUsageData.prototype.ORGS_USAGE_FILE="";
GetPCFUsageData.prototype.reportTimeRangeObject={};
// GetPCFUsageData.prototype.pcfAppDomain = 'sys.lsilva01.c0.pivotal.io';
GetPCFUsageData.prototype.pcfApiEndPoint = process.env.PCF_API_ENDPOINT;
GetPCFUsageData.prototype.pcfAppDmain = process.env.PCF_APPS_DOMAIN;
GetPCFUsageData.prototype.sysAdminUser = process.env.SYS_ADMIN_USER;
GetPCFUsageData.prototype.sysAdminPassword = process.env.SYS_ADMIN_PASSWORD;
GetPCFUsageData.prototype.pcfOrg = process.env.PCF_ORG;
GetPCFUsageData.prototype.pcfSpace = process.env.PCF_SPACE;

GetPCFUsageData.prototype.execute = function() {
  this.OUTPUT_DIR_NAME = "orgs-usage";
  this.ORGS_USAGE_FILE = "./" + this.OUTPUT_DIR_NAME + "/pcf-orgs-usage.json";
  this.reportTimeRangeObject = JSON.parse(fs.readFileSync("./report-time-range/report-time-range.json", 'utf8'));
  this.cfLogin();
  this.cfGetUsageData();
};

GetPCFUsageData.prototype.cfLogin = function() {
  const cmdLogin = 'cf api '
    + this.pcfApiEndPoint
    + ' --skip-ssl-validation && cf login -u '
    + this.sysAdminUser
    + ' -p '
    + this.sysAdminPassword
    + ' -o '
    + this.pcfOrg
    + ' -s '
    + this.pcfSpace;

  console.log("Issuing cf api and login commands: " + cmdLogin);
  execSync(cmdLogin);
};

GetPCFUsageData.prototype.cfGetUsageData = function() {
  // 1. Get service broker
  const cmdServiceBroker = 'cf curl /v2/service_brokers?q=name:crunchy-postgresql-odb';
  console.log('Getting service broker: ', cmdServiceBroker);
  const payloadServiceBroker = execSync(cmdServiceBroker);
  const serviceBroker = JSON.parse(payloadServiceBroker.toString('utf8'));
  const serviceBrokerGuid = serviceBroker.resources[0].metadata.guid;

  // 2. Get service plans for the broker
  const cmdServicePlans = 'cf curl /v2/service_plans?q=service_broker_guid:' + serviceBrokerGuid;
  console.log('Getting service plans: ', cmdServicePlans);
  const payloadServicePlans = execSync(cmdServicePlans);
  const servicePlans = JSON.parse(payloadServicePlans.toString('utf8'));

  // 3. Get service instances
  let serviceInstanceMap = {};
  let organizationMap = {};
  let serviceGuidMap = {};

  for (let i in servicePlans.resources) {
    const servicePlan = servicePlans.resources[i];
    const cmdServiceInstances = 'cf curl /v2/service_instances?q=service_plan_guid:' + servicePlan.metadata.guid;
    console.log('Getting service instances: ', cmdServiceInstances);
    const payloadServiceInstances = execSync(cmdServiceInstances);
    const serviceInstances = JSON.parse(payloadServiceInstances.toString('utf8'));

    for (let j in serviceInstances.resources) {
      const serviceInstance = serviceInstances.resources[j];
      const cmdSpace = 'cf curl /v2/spaces/' + serviceInstance.entity.space_guid;
      console.log('Getting space: ', cmdSpace);
      const payloadSpace = execSync(cmdSpace);
      const space = JSON.parse(payloadSpace.toString('utf8'));

      const cmdOrg = 'cf curl /v2/organizations/' + space.entity.organization_guid;
      const payloadOrg = execSync(cmdOrg);
      const org = JSON.parse(payloadOrg);

      serviceInstanceMap[serviceInstance.metadata.guid] = serviceInstance;
      organizationMap[space.entity.organization_guid] = org;
      serviceGuidMap[serviceInstance.entity.service_guid] = serviceInstance.entity.service_guid;
    }
  }

  // 4. Get Service Usages
  let serviceUsageMap = {};

  for(let orgGuid in organizationMap) {
    const cmdServiceUsage = 'curl "https://app-usage.'
      + this.pcfAppDmain
      + '/organizations/'
      + orgGuid
      + '/service_usages?start='
      + this.reportTimeRangeObject.USAGE_START_DATE
      + '&end='
      + this.reportTimeRangeObject.USAGE_END_DATE
      + '" -k -H "authorization: `cf oauth-token`"';

    console.log('Getting service usage: ', cmdServiceUsage);

    const payloadServiceUsagePerOrg = execSync(cmdServiceUsage);
    const serviceUsagePerOrg = JSON.parse(payloadServiceUsagePerOrg.toString('utf8'));

    for (let j in serviceUsagePerOrg.service_usages) {
      const serviceUsage = serviceUsagePerOrg.service_usages[j];

      // Only grab affected service usage data
      if (serviceGuidMap[serviceUsage.service_guid]) {
        serviceUsageMap[serviceUsage.service_instance_guid] = serviceUsage;
      }
    }
  }

  // 5. Get additional information
  for (let i in serviceUsageMap) {
    const serviceUsage = serviceUsageMap[i];
    const cmdEvents = 'cf curl /v2/events?q=actee:' + serviceUsage.service_instance_guid;
    const payloadEvents = execSync(cmdEvents);
    const events = JSON.parse(payloadEvents.toString('utf8'));

    for (let j in events.resources) {
      const event = events.resources[j];
      if (event.entity.type === 'audit.service_instance.create') {
        serviceUsage['created_by'] = {
          "actor": event.entity.actor,
          "actor_type": event.entity.actor_type,
          "actor_name": event.entity.actor_name,
          "actor_username": event.entity.actor_username,
          "timestamp": event.entity.timestamp,
          "organization_guid": event.entity.organization_guid,
          "organization_name": organizationMap[event.entity.organization_guid].entity.name
        }
      } else if (event.entity.type === 'audit.service_instance.delete') {
        serviceUsage['deleted_by'] = {
          "actor": event.entity.actor,
          "actor_type": event.entity.actor_type,
          "actor_name": event.entity.actor_name,
          "actor_username": event.entity.actor_username,
          "timestamp": event.entity.timestamp,
          "organization_guid": event.entity.organization_guid,
          "organization_name": organizationMap[event.entity.organization_guid].entity.name
        }
      }
    }
  }

  console.log("========================================================");
  console.log(JSON.stringify(serviceUsageMap));

  fs.writeFileSync(this.ORGS_USAGE_FILE, JSON.stringify(serviceUsageMap, null, 2) , 'utf-8');
};

module.exports = GetPCFUsageData;
