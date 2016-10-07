var fs = require('fs');

var orgsUsageObject = {};
var outputConsolidatedObject = {};
var reportTimeRangeObject = JSON.parse(fs.readFileSync("./report-time-range/report-time-range.json", 'utf8'));
var inputFileName="./orgs-usage/pcf-orgs-usage.json";
var outputFileName="./orgs-usage-consolidated/pcf-"+process.env.PCF_DEPLOY_NAME+"-usage-from-"+reportTimeRangeObject.USAGE_START_DATE+"-to-"+reportTimeRangeObject.USAGE_END_DATE+"_"+Math.floor(Date.now() / 1000)+".json";

init();

function init() {
  console.log("Consolidating Orgs Usage object from ["+inputFileName+"] into : "+outputFileName)
  readUsageDataFile(inputFileName);
  initializeOutputObject();
  processAllOrganizations();
  saveConsolidatedObject();
}

function readUsageDataFile(fileName) {
  orgsUsageObject = JSON.parse(fs.readFileSync(fileName, 'utf8'));
}

function initializeOutputObject() {
  outputConsolidatedObject.organizations=[];
  outputConsolidatedObject.pcf_deploy_name=process.env.PCF_DEPLOY_NAME;
  outputConsolidatedObject.start_date=orgsUsageObject.start_date;
  outputConsolidatedObject.end_date=orgsUsageObject.end_date;
  outputConsolidatedObject.total_app_instance_count=0;
  outputConsolidatedObject.total_app_memory_used_in_mb=0;
  outputConsolidatedObject.total_disk_quota_in_mb=0;
  outputConsolidatedObject.service_usages=[];
  outputConsolidatedObject.buildpack_usages={};
}

function processAllOrganizations() {
  // iterate through orgs from orgsUsageObject
  for (var item in orgsUsageObject.resources) {
      processOrganization(item);
  }
}

function saveConsolidatedObject() {
  fs.writeFile(outputFileName, JSON.stringify(outputConsolidatedObject, null, 2) , 'utf-8');
  console.log("Resulting usage report object: "+JSON.stringify(outputConsolidatedObject, null, 2));
}

function processOrganization(item) {

  var current_org_guid=orgsUsageObject.resources[item].metadata.guid;
  var current_org_object=orgsUsageObject.resources[item];
  console.log("Org: "+current_org_object.entity.name);
  var orgObject = {};
  orgObject.name=current_org_object.entity.name;
  orgObject.guid=current_org_object.metadata.guid;
  // orgObject.quota_from_spaces={};
  orgObject.total_app_instance_count=0;
  orgObject.total_app_memory_used_in_mb=0;
  orgObject.total_disk_quota_in_mb=0;
  orgObject.service_usages=[];
  orgObject.buildpack_usages={};

  // iterate through spaces from org object
  orgObject.spaces=[];

  // get org quota info
  orgObject.quota_plan={};
  var quotaDefObject = findQuotaDefinitionObject(current_org_object.entity.quota_definition_guid,orgsUsageObject.quota_definitions);
  if (quotaDefObject!=null) {
     orgObject.quota_plan = quotaDefObject.entity;
     orgObject.quota_plan.guid=current_org_object.entity.quota_definition_guid
  }

  for (var spaceObjCount in current_org_object.spaces.resources) {
    var current_space_object = current_org_object.spaces.resources[spaceObjCount];
    var newSpaceObject = {};
    console.log("   Space: "+current_space_object.entity.name);
    newSpaceObject.guid=current_space_object.metadata.guid;
    newSpaceObject.name=current_space_object.entity.name;
    // newSpaceObject.quota_plan={};
    // newSpaceObject.quota_from_apps={};

    newSpaceObject.total_app_instance_count=0;
    newSpaceObject.total_app_memory_used_in_mb=0;
    newSpaceObject.total_disk_quota_in_mb=0;

    // iterate through application usage info for the organization
    newSpaceObject.app_usages=[];
    newSpaceObject.buildpack_usages={};
    for (var appUsageObjCount in current_space_object.app_usages) {
      var current_appusage_object = current_space_object.app_usages[appUsageObjCount];
      var newAppUsageObject = {};
      newAppUsageObject.guid=current_appusage_object.app_guid;
      newAppUsageObject.name=current_appusage_object.app_name;
      newAppUsageObject.instance_count=current_appusage_object.instance_count;
      newAppUsageObject.memory_in_mb_per_instance=current_appusage_object.memory_in_mb_per_instance;
      newAppUsageObject.duration_in_seconds=current_appusage_object.duration_in_seconds;

      newAppUsageObject.total_memory_used_in_mb=newAppUsageObject.memory_in_mb_per_instance*newAppUsageObject.instance_count;

      // calculate disk quota
      newAppUsageObject.disk_quota=0;
      newAppUsageObject.total_disk_quota_in_mb=0;

      var appDefinitionObject=findAppObject(newAppUsageObject.name,current_space_object.applications);

      if (appDefinitionObject != null ) {
        newAppUsageObject.disk_quota=appDefinitionObject.entity.disk_quota;

        newAppUsageObject.total_disk_quota_in_mb=newAppUsageObject.disk_quota*newAppUsageObject.instance_count;

        // buildpack usage
        newAppUsageObject.buildpack=appDefinitionObject.entity.buildpack;
        newAppUsageObject.buildpack_name="";
        newAppUsageObject.detected_buildpack=appDefinitionObject.entity.detected_buildpack;
        newAppUsageObject.detected_buildpack_guid=appDefinitionObject.entity.detected_buildpack_guid;

        var buildpack_key=""
        if (newAppUsageObject.detected_buildpack_guid!=null){
          // get buildpack name
          var buildpackObject=findBuildpackObject(newAppUsageObject.detected_buildpack_guid,orgsUsageObject.buildpacks);
          if (buildpackObject!=null) {
            buildpack_key=buildpackObject.entity.name;
            newAppUsageObject.buildpack_name=buildpackObject.entity.name;
          } else {
            buildpack_key=newAppUsageObject.detected_buildpack_guid;
          }
        } else if (newAppUsageObject.buildpack!=null){
          buildpack_key=newAppUsageObject.buildpack;
        }
        if (buildpack_key!=""){
          if(! newSpaceObject.buildpack_usages[buildpack_key]){
            newSpaceObject.buildpack_usages[buildpack_key]= {};
            newSpaceObject.buildpack_usages[buildpack_key].guid=newAppUsageObject.detected_buildpack_guid;
            newSpaceObject.buildpack_usages[buildpack_key].name=newAppUsageObject.buildpack_name;
            newSpaceObject.buildpack_usages[buildpack_key].instances=0;
          }
          newSpaceObject.buildpack_usages[buildpack_key].instances+=newAppUsageObject.instance_count;
        }

      }

      // add app usage object to array
      newSpaceObject.app_usages.push(newAppUsageObject);

      // aggregate data into parent space object
      newSpaceObject.total_app_instance_count+=newAppUsageObject.instance_count;
      newSpaceObject.total_app_memory_used_in_mb+=newAppUsageObject.total_memory_used_in_mb;
      newSpaceObject.total_disk_quota_in_mb+=newAppUsageObject.total_disk_quota_in_mb;

    }

    // iterate through service usage
    newSpaceObject.service_usages=[];
    for (var serviceUsageObjCount in current_space_object.service_usages) {
      var current_svcusage_object = current_space_object.service_usages[serviceUsageObjCount];
      var newServiceUsageObject = {};
      // console.log("Service Usage: "+current_svcusage_object.service_name);
      newServiceUsageObject.service_guid=current_svcusage_object.service_guid;
      newServiceUsageObject.service_instance_guid=current_svcusage_object.service_guid;
      newServiceUsageObject.instances=1;
      newServiceUsageObject.service_name=current_svcusage_object.service_name;
      newServiceUsageObject.deleted=current_svcusage_object.deleted;
      newServiceUsageObject.creation=current_svcusage_object.service_instance_creation;
      newServiceUsageObject.deletion=current_svcusage_object.service_instance_deletion;
      newServiceUsageObject.plan_guid=current_svcusage_object.service_plan_guid;
      newServiceUsageObject.plan_name=current_svcusage_object.service_plan_name;
      newServiceUsageObject.duration_in_seconds=current_svcusage_object.duration_in_seconds;
      var servicePlanObject=findServicePlanObject(newServiceUsageObject.plan_guid,orgsUsageObject.service_plans);
      if (servicePlanObject!=null) {
        newServiceUsageObject.extra=servicePlanObject.entity.extra;
      }

      // add service usage object to array
      newSpaceObject.service_usages.push(newServiceUsageObject);
    }

    // aggregate data into parent org object
    orgObject.total_app_instance_count+=newSpaceObject.total_app_instance_count;
    orgObject.total_app_memory_used_in_mb+=newSpaceObject.total_app_memory_used_in_mb;
    orgObject.total_disk_quota_in_mb+=newSpaceObject.total_disk_quota_in_mb;

    // aggregate service usage from space object into parent org object
    aggregateServicesUsage(newSpaceObject.service_usages, orgObject.service_usages);

    // aggregate buildpacks usage from space object into parent org object
    aggregateBuildpackUsage(newSpaceObject.buildpack_usages, orgObject.buildpack_usages);

    // add new space object to parent org object
    orgObject.spaces.push(newSpaceObject);
  }

  // add org object to main output object
  outputConsolidatedObject.organizations.push(orgObject);

  outputConsolidatedObject.total_app_instance_count+=orgObject.total_app_instance_count;
  outputConsolidatedObject.total_app_memory_used_in_mb+=orgObject.total_app_memory_used_in_mb;
  outputConsolidatedObject.total_disk_quota_in_mb+=orgObject.total_disk_quota_in_mb;

  // aggregate service usage from org object into main parent object
  aggregateServicesUsage(orgObject.service_usages,outputConsolidatedObject.service_usages);

  // aggregate buildpacks usage from org object into global parent object
  aggregateBuildpackUsage(orgObject.buildpack_usages,outputConsolidatedObject.buildpack_usages);

  // outputConsolidatedObject.service_usages=[];

}

function aggregateServicesUsage(originArrayObject, destinationArrayObject) {

  for (var serviceObjCount in originArrayObject) {
    // console.log("serviceObjCount="+serviceObjCount);
    var current_svcusage_object = originArrayObject[serviceObjCount];
    // console.log("current_svcusage_object="+current_svcusage_object.service_name);
    // check if service + service plan already exists
    var svcOrgPosition=-1;
    for (var serviceOrgCount in destinationArrayObject) {
      if (destinationArrayObject[serviceOrgCount].service_guid==current_svcusage_object.service_guid &&
          destinationArrayObject[serviceOrgCount].plan_guid==current_svcusage_object.plan_guid) {
            svcOrgPosition=serviceOrgCount;
            break;
      }
    }
    // console.log("svcOrgPosition="+svcOrgPosition);
    if (svcOrgPosition != -1) {
      destinationArrayObject[svcOrgPosition].instances += current_svcusage_object.instances
      destinationArrayObject[svcOrgPosition].duration_in_seconds += current_svcusage_object.duration_in_seconds
    } else {
      destinationArrayObject.push(current_svcusage_object);
    }
    // console.log("Updated services usage obj: "+JSON.stringify(orgObject.service_usages, null, 2));
  }

}

function aggregateBuildpackUsage(originArrayObject, destinationArrayObject) {

  for (var buildpack_key in originArrayObject) {
      if (originArrayObject.hasOwnProperty(buildpack_key)) {
        if(destinationArrayObject[buildpack_key]){
           destinationArrayObject[buildpack_key].instances+=originArrayObject[buildpack_key].instances;
        } else {
           destinationArrayObject[buildpack_key]=originArrayObject[buildpack_key];
        }
      }
  }

}


function findAppObject(appName, applicationsObject) {
   var returnAppObject = null;
  //  console.log("appName="+appName)

   for (var count in applicationsObject.resources) {
    //  console.log("applicationsObject="+applicationsObject.resources[count].entity.name)
       if (applicationsObject.resources[count].entity.name == appName) {
         returnAppObject=applicationsObject.resources[count];
       }
   }
   return returnAppObject;
}

function findServicePlanObject(servicePlanGuid, servicePlansObject) {
   var returnSPObject = null;
  //  console.log("servicePlanGuid="+servicePlanGuid)

   for (var count in servicePlansObject.resources) {
    //  console.log("servicePlanObject="+servicePlansObject.resources[count].metadata.guid)
       if (servicePlansObject.resources[count].metadata.guid == servicePlanGuid) {
         returnSPObject=servicePlansObject.resources[count];
       }
   }
   return returnSPObject;
}

function findBuildpackObject(buildpackGuid, buildpacksObject) {
   var returnBpObject = null;

   for (var count in buildpacksObject.resources) {
       if (buildpacksObject.resources[count].metadata.guid == buildpackGuid) {
         returnBpObject=buildpacksObject.resources[count];
       }
   }
   return returnBpObject;
}

function findQuotaDefinitionObject(quotaGuid, quotaDefinitionsObject) {
   var returnQDObject = null;

   for (var count in quotaDefinitionsObject.resources) {
       if (quotaDefinitionsObject.resources[count].metadata.guid == quotaGuid) {
         returnQDObject=quotaDefinitionsObject.resources[count];
       }
   }
   return returnQDObject;
}
