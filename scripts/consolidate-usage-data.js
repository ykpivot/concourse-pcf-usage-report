var fs = require('fs');

var orgsUsageObject = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));

console.log("Consolidating Orgs Usage object ["+process.argv[2]+"] info into object "+process.argv[3])

// initialize output object`
var outputConsolidatedObject = {};
outputConsolidatedObject.resources=[];
outputConsolidatedObject.start_date=orgsUsageObject.start_date;
outputConsolidatedObject.end_date=orgsUsageObject.end_date;

// iterate through orgs from orgsUsageObject
for (var item in orgsUsageObject.resources) {
    var current_org_guid=orgsUsageObject.resources[item].metadata.guid;
    // console.log("current_org_guid: "+current_org_guid);

    var current_org_object=orgsUsageObject.resources[item];
    console.log("Org: "+current_org_object.entity.name);

    var orgObject = {};
    orgObject.name=current_org_object.entity.name;
    orgObject.guid=current_org_object.metadata.guid;
    orgObject.quota_plan={};
    orgObject.quota_from_spaces={};
    orgObject.total_app_instance_count=0;
    orgObject.total_app_memory_used_in_mb=0;
    orgObject.total_disk_quota_in_mb=0;
    orgObject.service_usages=[];
    orgObject.buildpack_usages={};

    // iterate through spaces from org object
    orgObject.spaces=[];

    for (var spaceObjCount in current_org_object.spaces.resources) {
      var current_space_object = current_org_object.spaces.resources[spaceObjCount];
      var newSpaceObject = {};
      console.log("   Space: "+current_space_object.entity.name);
      newSpaceObject.guid=current_space_object.metadata.guid;
      newSpaceObject.name=current_space_object.entity.name;
      newSpaceObject.quota_plan={};
      newSpaceObject.quota_from_apps={};

      newSpaceObject.total_app_instance_count=0;
      newSpaceObject.total_app_memory_used_in_mb=0;
      newSpaceObject.total_disk_quota_in_mb=0;

      // iterate through app usage
      newSpaceObject.app_usages=[];
      newSpaceObject.buildpack_usages={};
      for (var appUsageObjCount in current_space_object.app_usages) {
        var current_appusage_object = current_space_object.app_usages[appUsageObjCount];
        var newAppUsageObject = {};
        // console.log("App Usage: "+current_appusage_object.app_name);
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
      for (var serviceObjCount in newSpaceObject.service_usages) {
        console.log("serviceObjCount="+serviceObjCount);
        var current_svcusage_object = newSpaceObject.service_usages[serviceObjCount];
        console.log("current_svcusage_object="+current_svcusage_object.service_name);
        // check if service + service plan already exists
        var svcOrgPosition=-1;
        for (var serviceOrgCount in orgObject.service_usages) {
          if (orgObject.service_usages[serviceOrgCount].service_guid==current_svcusage_object.service_guid &&
              orgObject.service_usages[serviceOrgCount].plan_guid==current_svcusage_object.plan_guid) {
                svcOrgPosition=serviceOrgCount;
                break;
          }
        }
        console.log("svcOrgPosition="+svcOrgPosition);
        if (svcOrgPosition != -1) {
          orgObject.service_usages[svcOrgPosition].instances += current_svcusage_object.instances
          orgObject.service_usages[svcOrgPosition].duration_in_seconds += current_svcusage_object.duration_in_seconds
        } else {
          orgObject.service_usages.push(current_svcusage_object);
        }
        console.log("Updated services usage obj: "+JSON.stringify(orgObject.service_usages, null, 2));
      }

      // aggregate buildpacks usage from space object into parent org object
      for (var buildpackKey in newSpaceObject.buildpack_usages) {
          if (newSpaceObject.buildpack_usages.hasOwnProperty(buildpackKey)) {
            if(orgObject.buildpack_usages[buildpack_key]){
               orgObject.buildpack_usages[buildpack_key].instances+=newSpaceObject.buildpack_usages[buildpack_key].instances;
            } else {
               orgObject.buildpack_usages[buildpack_key]=newSpaceObject.buildpack_usages[buildpack_key];
            }
          }
      }

      // add new space object to parent org object
      orgObject.spaces.push(newSpaceObject);
    }

    // add org object to main output object
    outputConsolidatedObject.resources.push(orgObject);

}
console.log("Writing updated spaces object back to "+process.argv[3])
fs.writeFile(process.argv[3], JSON.stringify(outputConsolidatedObject, null, 2) , 'utf-8');

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
