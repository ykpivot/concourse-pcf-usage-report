var fs = require('fs');
var exec = require('child_process').exec;

var orgsUsageObject={};

// console.log("Env: process.env.PCF_API_ENDPOINT="+process.env.PCF_API_ENDPOINT);
// console.log("Env: process.env.PCF_APPS_DOMAIN="+process.env.PCF_APPS_DOMAIN);
// console.log("Env: process.env.SYS_ADMIN_USER="+process.env.SYS_ADMIN_USER);
// console.log("Env: process.env.SYS_ADMIN_PASSWORD="+process.env.SYS_ADMIN_PASSWORD);

var OUTPUT_DIR_NAME="orgs-usage";
var ORGS_USAGE_FILE="./"+OUTPUT_DIR_NAME+"/pcf-orgs-usage.json";

var reportTimeRangeObject = JSON.parse(fs.readFileSync("./report-time-range/report-time-range.json", 'utf8'));


init();

function init() {
  cfLogin();
}

function cfLogin() {
  var cmd_login = 'cf api '+process.env.PCF_API_ENDPOINT+' --skip-ssl-validation && cf login -u '+process.env.SYS_ADMIN_USER+' -p '+process.env.SYS_ADMIN_PASSWORD+' -o "system" -s "system"';
  console.log("Issuing cf api and login commands");
  exec(cmd_login, function(error, stdout, stderr) {
    if (! execError("cfLogin",error,stderr)) {
        cfGetOrgs();
    }
  });
}

function execError(fname,errorobj,stderrobj) {
  if (errorobj !== null) {
    console.log(fname+' exec error: ' + errorobj);
    console.log(fname+' stderr: ' + stderrobj);
    return true;
  }
  return false;
}

function cfGetOrgs() {
  var cmd_getorgs = 'cf curl /v2/organizations';
  console.log("Retrieving PCF organizations");
  exec(cmd_getorgs, function(error, stdout, stderr) {
    if (! execError("cfGetOrgs",error,stderr)) {
      orgsUsageObject=JSON.parse(stdout, 'utf8');
      orgsUsageObject.start_date=reportTimeRangeObject.USAGE_START_DATE;
      orgsUsageObject.end_date=reportTimeRangeObject.USAGE_END_DATE;
      cfGetQuotas();
    }
  });
}

function cfGetQuotas() {
  var cf_cmd = 'cf curl /v2/quota_definitions';
  console.log("Retrieving organization quota definitions");
  exec(cf_cmd, function(error, stdout, stderr) {
    if (! execError("cfGetQuotas",error,stderr)) {
      var quotasObject=JSON.parse(stdout, 'utf8');
      orgsUsageObject.quota_definitions=quotasObject;
      cfGetServices();
    }
  });
};

function cfGetServices() {
  var cf_cmd = 'cf curl /v2/services';
  console.log("Retrieving services list");
  exec(cf_cmd, function(error, stdout, stderr) {
    if (! execError("cfGetServices",error,stderr)) {
      var parsedObject=JSON.parse(stdout, 'utf8');
      orgsUsageObject.services=parsedObject;
      cfGetServicePlans();
    }
  });
};

function cfGetServicePlans() {
  var cf_cmd = 'cf curl /v2/service_plans';
  console.log("Retrieving service plans list");
  exec(cf_cmd, function(error, stdout, stderr) {
    if (! execError("cfGetServicePlans",error,stderr)) {
      var parsedObject=JSON.parse(stdout, 'utf8');
      orgsUsageObject.service_plans=parsedObject;
      cfGetBuildpacks();
    }
  });
};

function cfGetBuildpacks() {
  var cf_cmd = 'cf curl /v2/buildpacks';
  console.log("Retrieving buildpacks list");
  exec(cf_cmd, function(error, stdout, stderr) {
    if (! execError("cfGetBuildpacks",error,stderr)) {
      var parsedObject=JSON.parse(stdout, 'utf8');
      orgsUsageObject.buildpacks=parsedObject;
      cfGetOrgUsage(0);
    }
  });
}

function cfGetOrgUsage(orgIndex) {
  var current_org_object=orgsUsageObject.resources[orgIndex];
  var current_org_guid=current_org_object.metadata.guid;
  console.log("Processing organization "+current_org_object.entity.name);
  console.log("Getting all Space Quotas for the org")
  var cf_cmd = 'cf curl /v2/organizations/'+current_org_guid+'/space_quota_definitions';
  exec(cf_cmd, function(error, stdout, stderr) {
    if (! execError("cfGetOrgsUsage",error,stderr)) {
      var parsedObject=JSON.parse(stdout, 'utf8');
      orgsUsageObject.resources[orgIndex].space_quota_definitions=parsedObject;
      cfGetOrgSpaces(orgIndex,current_org_guid);
    }
  });
}

function cfGetOrgSpaces(orgIndex,orgGuid) {
  console.log("Getting all Spaces for the org")
  var cf_cmd = 'cf curl /v2/organizations/'+orgGuid+'/spaces';
  exec(cf_cmd, function(error, stdout, stderr) {
    if (! execError("cfGetOrgSpaces",error,stderr)) {
      var parsedObject=JSON.parse(stdout, 'utf8');
      orgsUsageObject.resources[orgIndex].spaces=parsedObject;
      cfGetOrgServicesUsage(orgIndex,orgGuid);
    }
  });
}

function cfGetOrgServicesUsage(orgIndex,orgGuid) {
  console.log("Getting Services usage for the org")
  var cf_cmd = 'curl "https://app-usage.'+process.env.PCF_APPS_DOMAIN+'/organizations/'+orgGuid+'/service_usages?start='+reportTimeRangeObject.USAGE_START_DATE+'&end='+process.env.USAGE_END_DATE+'" -k -H "authorization: `cf oauth-token`"';
  exec(cf_cmd, function(error, stdout, stderr) {
    if (! execError("cfGetOrgServicesUsage",error,stderr)) {
      var parsedObject=JSON.parse(stdout, 'utf8');
      mergeSpaceUsageInfo(parsedObject,orgsUsageObject.resources[orgIndex].spaces);
      cfGetOrgApplicationsUsage(orgIndex,orgGuid);
    }
  });
}

function mergeSpaceUsageInfo(servicesUsageObject,spacesDetailsObject) {
  for (var item in servicesUsageObject.service_usages) {
      var current_space_guid=servicesUsageObject.service_usages[item].space_guid;
      // find corresponding space object location
      for (var spaceObjCount in spacesDetailsObject.resources) {
        // console.log("spaceObjCount: "+spaceObjCount);
        if (spacesDetailsObject.resources[spaceObjCount].metadata.guid == current_space_guid) {
          // console.log("Found space object for guid "+current_space_guid+" in array position "+spaceObjCount+". Adding services_usage field to it with contents from file "+process.argv[2])
          if (! spacesDetailsObject.resources[spaceObjCount].service_usages) {
            spacesDetailsObject.resources[spaceObjCount].service_usages = [];  // initialize array for the first time
          };
          spacesDetailsObject.resources[spaceObjCount].service_usages.push(servicesUsageObject.service_usages[item]);
          break;
        }
      }
  }
}



function cfGetOrgApplicationsUsage(orgIndex,orgGuid) {
  console.log("Getting Applications usage for the org")
  var cf_cmd = 'curl "https://app-usage.'+process.env.PCF_APPS_DOMAIN+'/organizations/'+orgGuid+'/app_usages?start='+reportTimeRangeObject.USAGE_START_DATE+'&end='+process.env.USAGE_END_DATE+'" -k -H "authorization: `cf oauth-token`"';
  exec(cf_cmd, function(error, stdout, stderr) {
    if (! execError("cfGetOrgApplicationsUsage",error,stderr)) {
      var parsedObject=JSON.parse(stdout, 'utf8');
      mergeAppsUsageInfo(parsedObject,orgsUsageObject.resources[orgIndex].spaces);
      cfGetApplicationsOfSpace(orgIndex,orgGuid,0);
    }
  });
}

function mergeAppsUsageInfo(appsUsageObject,spacesDetailsObject) {
  for (var item in appsUsageObject.app_usages) {
      var current_space_guid=appsUsageObject.app_usages[item].space_guid;
      // find corresponding space object location
      for (var spaceObjCount in spacesDetailsObject.resources) {
        // console.log("spaceObjCount: "+spaceObjCount);
        if (spacesDetailsObject.resources[spaceObjCount].metadata.guid == current_space_guid) {
          // console.log("Found space object for guid "+current_space_guid+" in array position "+spaceObjCount+". Adding app_usages field to it with contents from file "+process.argv[2])
          if (! spacesDetailsObject.resources[spaceObjCount].app_usages) {
            spacesDetailsObject.resources[spaceObjCount].app_usages = [];  // initialize array for the first time
          };
          spacesDetailsObject.resources[spaceObjCount].app_usages.push(appsUsageObject.app_usages[item]);
          break;
        }
      }
  }
}

function cfGetApplicationsOfSpace(orgIndex,orgGuid,spaceIndex) {
  if (orgsUsageObject.resources[orgIndex].spaces.resources.length>0){
    var spaceObject=orgsUsageObject.resources[orgIndex].spaces.resources[spaceIndex];
    console.log("Getting apps for space "+spaceObject.metadata.guid);
    var cf_cmd = 'cf curl /v2/spaces/'+spaceObject.metadata.guid+'/apps';
    exec(cf_cmd, function(error, stdout, stderr) {
      if (! execError("cfGetApplicationsOfSpace",error,stderr)) {
        var parsedObject=JSON.parse(stdout, 'utf8');
        spaceObject.applications=parsedObject;
        if (++spaceIndex<orgsUsageObject.resources[orgIndex].spaces.resources.length){
          cfGetApplicationsOfSpace(orgIndex,orgGuid,spaceIndex);
        } else {
          doNextOrganization(orgIndex);
        }
      }
    });
  } else {
    doNextOrganization(orgIndex);
  }
}

function doNextOrganization(orgIndex) {
  if (++orgIndex<orgsUsageObject.resources.length){
    cfGetOrgUsage(orgIndex);
  } else {
    finalize();
  }
}

function finalize() {
  fs.writeFile(ORGS_USAGE_FILE, JSON.stringify(orgsUsageObject, null, 2) , 'utf-8');
  // console.log("OrgsObject="+JSON.stringify(orgsUsageObject, null, 2));
}
