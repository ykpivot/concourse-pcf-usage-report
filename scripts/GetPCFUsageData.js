var fs = require('fs');
var exec = require('child_process').exec;

function GetPCFUsageData() {
};

GetPCFUsageData.prototype.orgsUsageObject={};
GetPCFUsageData.prototype.OUTPUT_DIR_NAME="";
GetPCFUsageData.prototype.ORGS_USAGE_FILE="";
GetPCFUsageData.prototype.reportTimeRangeObject={};

GetPCFUsageData.prototype.execute = function() {
  this.OUTPUT_DIR_NAME="orgs-usage";
  this.ORGS_USAGE_FILE="./"+this.OUTPUT_DIR_NAME+"/pcf-orgs-usage.json";
  this.reportTimeRangeObject = JSON.parse(fs.readFileSync("./report-time-range/report-time-range.json", 'utf8'));
  this.cfLogin();
};

GetPCFUsageData.prototype.cfLogin = function() {
  var cmd_login = 'cf api '+process.env.PCF_API_ENDPOINT+' --skip-ssl-validation && cf login -u '+process.env.SYS_ADMIN_USER+' -p '+process.env.SYS_ADMIN_PASSWORD+' -o '+process.env.PCF_ORG+' -s '+process.env.PCF_SPACE;
  console.log("Issuing cf api and login commands");
  var currentGetPCFUsageDataObject = this;
  exec(cmd_login, function(error, stdout, stderr) {
    if (! currentGetPCFUsageDataObject.execError("cfLogin",error,stderr)) {
        currentGetPCFUsageDataObject.cfGetOrgs();
    }
  });
};

GetPCFUsageData.prototype.execError = function(fname,errorobj,stderrobj) {
  if (errorobj !== null) {
    console.log(fname+' exec error: ' + errorobj);
    console.log(fname+' stderr: ' + stderrobj);
    return true;
  }
  return false;
};

GetPCFUsageData.prototype.cfGetOrgs = function() {
  var cmd_getorgs = 'cf curl /v2/organizations';
  console.log("Retrieving PCF organizations");
  var currentGetPCFUsageDataObject = this;
  exec(cmd_getorgs, function(error, stdout, stderr) {
    if (! currentGetPCFUsageDataObject.execError("cfGetOrgs",error,stderr)) {
      currentGetPCFUsageDataObject.orgsUsageObject=JSON.parse(stdout, 'utf8');
      currentGetPCFUsageDataObject.orgsUsageObject.start_date=currentGetPCFUsageDataObject.reportTimeRangeObject.USAGE_START_DATE;
      currentGetPCFUsageDataObject.orgsUsageObject.end_date=currentGetPCFUsageDataObject.reportTimeRangeObject.USAGE_END_DATE;
      currentGetPCFUsageDataObject.cfGetQuotas();
    } else {
      process.exit(1);
    }
  });
};

GetPCFUsageData.prototype.cfGetQuotas = function() {
  var cf_cmd = 'cf curl /v2/quota_definitions';
  console.log("Retrieving organization quota definitions");
  var currentGetPCFUsageDataObject = this;
  exec(cf_cmd, function(error, stdout, stderr) {
    if (! currentGetPCFUsageDataObject.execError("cfGetQuotas",error,stderr)) {
      var quotasObject=JSON.parse(stdout, 'utf8');
      currentGetPCFUsageDataObject.orgsUsageObject.quota_definitions=quotasObject;
      currentGetPCFUsageDataObject.cfGetServices();
    } else {
      process.exit(1);
    }
  });
};

GetPCFUsageData.prototype.cfGetServices = function() {
  var cf_cmd = 'cf curl /v2/services';
  console.log("Retrieving services list");
  var currentGetPCFUsageDataObject = this;
  exec(cf_cmd, {maxBuffer: 1024 * 1024}, function(error, stdout, stderr) {
    if (! currentGetPCFUsageDataObject.execError("cfGetServices",error,stderr)) {
      var parsedObject=JSON.parse(stdout, 'utf8');
      currentGetPCFUsageDataObject.orgsUsageObject.services=parsedObject;
      currentGetPCFUsageDataObject.cfGetServicePlans();
    } else {
      process.exit(1);
    }
  });
};

GetPCFUsageData.prototype.cfGetServicePlans = function() {
  var cf_cmd = 'cf curl /v2/service_plans';
  console.log("Retrieving service plans list");
  var currentGetPCFUsageDataObject = this;
  exec(cf_cmd, function(error, stdout, stderr) {
    if (! currentGetPCFUsageDataObject.execError("cfGetServicePlans",error,stderr)) {
      var parsedObject=JSON.parse(stdout, 'utf8');
      currentGetPCFUsageDataObject.orgsUsageObject.service_plans=parsedObject;
      currentGetPCFUsageDataObject.cfGetBuildpacks();
    } else {
      process.exit(1);
    }
  });
};

GetPCFUsageData.prototype.cfGetBuildpacks = function() {
  var cf_cmd = 'cf curl /v2/buildpacks';
  console.log("Retrieving buildpacks list");
  var currentGetPCFUsageDataObject = this;
  exec(cf_cmd, function(error, stdout, stderr) {
    if (! currentGetPCFUsageDataObject.execError("cfGetBuildpacks",error,stderr)) {
      var parsedObject=JSON.parse(stdout, 'utf8');
      currentGetPCFUsageDataObject.orgsUsageObject.buildpacks=parsedObject;
      currentGetPCFUsageDataObject.cfGetOrgUsage(0);
    } else {
      process.exit(1);
    }
  });
};

GetPCFUsageData.prototype.cfGetOrgUsage = function(orgIndex) {
  var currentGetPCFUsageDataObject = this;
  var current_org_object=currentGetPCFUsageDataObject.orgsUsageObject.resources[orgIndex];
  var current_org_guid=current_org_object.metadata.guid;
  console.log("Processing organization "+current_org_object.entity.name);
  console.log("Getting all Space Quotas for the org")
  var cf_cmd = 'cf curl /v2/organizations/'+current_org_guid+'/space_quota_definitions';
  exec(cf_cmd, function(error, stdout, stderr) {
    if (! currentGetPCFUsageDataObject.execError("cfGetOrgsUsage",error,stderr)) {
      var parsedObject=JSON.parse(stdout, 'utf8');
      currentGetPCFUsageDataObject.orgsUsageObject.resources[orgIndex].space_quota_definitions=parsedObject;
      currentGetPCFUsageDataObject.cfGetOrgSpaces(orgIndex,current_org_guid);
    } else {
      process.exit(1);
    }
  });
};

GetPCFUsageData.prototype.cfGetOrgSpaces = function(orgIndex,orgGuid) {
  console.log("Getting all Spaces for the org")
  var cf_cmd = 'cf curl /v2/organizations/'+orgGuid+'/spaces';
  var currentGetPCFUsageDataObject = this;
  exec(cf_cmd, function(error, stdout, stderr) {
    if (! currentGetPCFUsageDataObject.execError("cfGetOrgSpaces",error,stderr)) {
      var parsedObject=JSON.parse(stdout, 'utf8');
      currentGetPCFUsageDataObject.orgsUsageObject.resources[orgIndex].spaces=parsedObject;
      currentGetPCFUsageDataObject.cfGetOrgServicesUsage(orgIndex,orgGuid);
    } else {
      process.exit(1);
    }
  });
};

GetPCFUsageData.prototype.cfGetOrgServicesUsage = function(orgIndex,orgGuid) {
  console.log("Getting Services usage for the org")
  var cf_cmd = 'curl "https://app-usage.'+process.env.PCF_APPS_DOMAIN+'/organizations/'+orgGuid+'/service_usages?start='+this.reportTimeRangeObject.USAGE_START_DATE+'&end='+this.reportTimeRangeObject.USAGE_END_DATE+'" -k -H "authorization: `cf oauth-token`"';
  var currentGetPCFUsageDataObject = this;
  exec(cf_cmd, function(error, stdout, stderr) {
    if (! currentGetPCFUsageDataObject.execError("cfGetOrgServicesUsage",error,stderr)) {
      var parsedObject=JSON.parse(stdout, 'utf8');
      if (parsedObject.error) {
        console.log("Error while issuing command ["+cf_cmd+"]:\n"+JSON.stringify(parsedObject, null, 2));
        process.exit(1);
      }
      currentGetPCFUsageDataObject.mergeSpaceUsageInfo(parsedObject,currentGetPCFUsageDataObject.orgsUsageObject.resources[orgIndex].spaces);
      currentGetPCFUsageDataObject.cfGetOrgApplicationsUsage(orgIndex,orgGuid);
    } else {
      process.exit(1);
    }
  });
};

GetPCFUsageData.prototype.mergeSpaceUsageInfo = function(servicesUsageObject,spacesDetailsObject) {
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
};

GetPCFUsageData.prototype.cfGetOrgApplicationsUsage = function(orgIndex,orgGuid) {
  console.log("Getting Applications usage for the org")
  var cf_cmd = 'curl "https://app-usage.'+process.env.PCF_APPS_DOMAIN+'/organizations/'+orgGuid+'/app_usages?start='+this.reportTimeRangeObject.USAGE_START_DATE+'&end='+this.reportTimeRangeObject.USAGE_END_DATE+'" -k -H "authorization: `cf oauth-token`"';
  // console.log("Command: "+cf_cmd);
  var currentGetPCFUsageDataObject = this;
  exec(cf_cmd, function(error, stdout, stderr) {
    if (! currentGetPCFUsageDataObject.execError("cfGetOrgApplicationsUsage",error,stderr)) {
      var parsedObject=JSON.parse(stdout, 'utf8');
      if (parsedObject.error) {
        console.log("Error while issuing command ["+cf_cmd+"]:\n"+JSON.stringify(parsedObject, null, 2));
        process.exit(1);
      }
      currentGetPCFUsageDataObject.mergeAppsUsageInfo(parsedObject,currentGetPCFUsageDataObject.orgsUsageObject.resources[orgIndex].spaces);
      currentGetPCFUsageDataObject.cfGetApplicationsOfSpace(orgIndex,orgGuid,0);
    } else {
      process.exit(1);
    }
  });
};

GetPCFUsageData.prototype.mergeAppsUsageInfo = function(appsUsageObject,spacesDetailsObject) {
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
};

GetPCFUsageData.prototype.cfGetApplicationsOfSpace = function(orgIndex,orgGuid,spaceIndex) {
  var currentGetPCFUsageDataObject = this;
  if (currentGetPCFUsageDataObject.orgsUsageObject.resources[orgIndex].spaces.resources.length>0){
    var spaceObject=currentGetPCFUsageDataObject.orgsUsageObject.resources[orgIndex].spaces.resources[spaceIndex];
    console.log("Getting apps for space "+spaceObject.metadata.guid);
    var cf_cmd = 'cf curl /v2/spaces/'+spaceObject.metadata.guid+'/apps';
    exec(cf_cmd, function(error, stdout, stderr) {
      if (! currentGetPCFUsageDataObject.execError("cfGetApplicationsOfSpace",error,stderr)) {
        var parsedObject=JSON.parse(stdout, 'utf8');
        spaceObject.applications=parsedObject;
        if (++spaceIndex<currentGetPCFUsageDataObject.orgsUsageObject.resources[orgIndex].spaces.resources.length){
          currentGetPCFUsageDataObject.cfGetApplicationsOfSpace(orgIndex,orgGuid,spaceIndex);
        } else {
          currentGetPCFUsageDataObject.doNextOrganization(orgIndex);
        }
      } else {
        process.exit(1);
      }
    });
  } else {
    currentGetPCFUsageDataObject.doNextOrganization(orgIndex);
  }
};

GetPCFUsageData.prototype.doNextOrganization = function(orgIndex) {
  if (++orgIndex<this.orgsUsageObject.resources.length){
    this.cfGetOrgUsage(orgIndex);
  } else {
    this.finalizeProcess();
  }
};

GetPCFUsageData.prototype.finalizeProcess = function() {
  fs.writeFile(this.ORGS_USAGE_FILE, JSON.stringify(this.orgsUsageObject, null, 2) , 'utf-8');
  //console.log("OrgsObject="+JSON.stringify(this.orgsUsageObject, null, 2));
};

module.exports = GetPCFUsageData;
