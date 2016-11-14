![PCF Usage Report producer sample pipeline](https://github.com/pivotalservices/concourse-pcf-usage-report/raw/master/common/images/pcf_usage.png)

# PCF Usage Report producer - a Concourse pipeline sample  

Pivotal Cloud Foundry (PCF) provides a set of [accounting report APIs](http://docs.pivotal.io/pivotalcf/1-8/opsguide/accounting-report.html#cf-cli) that can be used to retrieve and compile applications and services usage data of all organizations and spaces of a PCF deployment.  

This sample Concourse pipeline leverages the [PCF accounting report API](http://docs.pivotal.io/pivotalcf/1-8/opsguide/accounting-report.html#cf-cli) along with the standard open source [Cloud Foundry APIs](https://apidocs.cloudfoundry.org/) to collect usage data for all organizations in a PCF deployment and consolidate it into a single output report.  

The pipeline's scripts can be easily tweaked and customized for each deployment's needs in terms of how the report is built and results calculated (see section _"Customizing the pipeline"_ below).

A placeholder step is provided for the produced JSON report to be fed into a billing system.

### Pipeline functionality

![PCF Usage Report producer pipeline screenshot](https://github.com/pivotalservices/concourse-pcf-usage-report/raw/master/common/images/pipeline_annotated.png)

1. The pipeline is automatically triggered by a time resource (e.g. once a month).  
   Pipeline tasks and scripts are retrieved from a git repository.  

2. Usage data and quota information is retrieved from the PCF deployment:  
   - Organization, space, applications, services and buildpack information, along with memory and space quotas are retrieved using [Cloud Foundry APIs](https://apidocs.cloudfoundry.org/)  
   - Applications and services usage data is retrieved using [PCF accounting report API](http://docs.pivotal.io/pivotalcf/1-8/opsguide/accounting-report.html#cf-cli)  
   The collect data is then processed and consolidated into a single output JSON report file (see object schema further below).
   If an error occurs in this step, a notification email is sent to the appropriate recipients (configurable).

3. The produced consolidated JSON object is stored into a file repository (an S3 bucket in this example)  

4. The next job is notified about the new report that got created in the file repository and then processes it accordingly, for instance, by feeding of that information into a billing system. In this sample pipeline, that is just a placeholder job without an actual implementation  

5. A notification email is sent to the appropriate (configurable) recipients about the successful PCF usage report creation  

---
### How to setup and run the sample pipeline  

Here is how you can set up the pipeline on your own Concourse server:  

##### Pre-requisites to setup this example on your Concourse server  

1. An instance of [Concourse installed](http://concourse.ci/installing.html) up-and-running.  
1. The [Concourse Fly command line interface](http://concourse.ci/fly-cli.html) installed on your local machine.  

##### Configuration steps  

1. Clone the sample git repository on your local machine  
     __clone https://github.com/pivotalservices/concourse-pcf-usage-report.git__  
     __cd concourse-pcf-usage-report__  

1. Setup the pipeline credentials file  
  * Make a copy of the sample credentials file  
  __cp ci/pipeline/credentials.yml.sample ci/pipeline/credentials.yml__  

  * Edit _ci/pipeline/credentials.yml_ and fill out all the required credentials:  
  .  
_```git-project-url```:_ the URL of the git repository containing the pipeline scripts  
_```pcf-api-endpoint```:_ targeted PCF API endpoint (e.g. ```https://api.run.mydomain.com```)  
_```pcf-apps-domain```:_ targeted PCF applications domain (e.g. ```run.mydomain.com```)   
_```pcf-sys-admin-user```:_ PCF admin user ID to login to cf API (e.g. ```admin```)   
_```pcf-sys-admin-user-password```:_ password of PCF admin user above  
_```pcf-deploy-name```:_ ID or label for the targeted PCF deployment (e.g. ```production```)   
_```s3-bucket```:_ ID of the AWS S3 bucket to upload the usage report to (e.g. ```mys3bucket```)   
_```s3-access-key-id```:_ access key of the user with write access to the AWS S3 bucket  
_```s3-secret-access-key```:_ Secret access key of the user with write access to the AWS S3 bucket       
_```s3-region_name```:_ AWS S3 bucket region name (e.g. ```us-west-1```)   
_```email-from```:_ the email address of the notification sender   (e.g. ```myemail@gmail.com```)  
_```email-to```:_ the list of comma separated destination emails without encoding  (e.g. ```him@there.com,her@here.net```)   
.
3. Configure the sample pipeline in Concourse with the following commands:  
   __fly -t <your-concourse-alias> set-pipeline -p pcf-usage-pipeline -c ci/pipeline/pcf-usage-report-simple.yml -l ci/pipeline/credentials.yml__  

4. Access to the Concourse web interface, click on the list of pipelines, un-pause the ```pcf-usage-pipeline``` and then click on its link to visualize its pipeline diagram  

5. To execute the pipeline, click on the ```retrieve-and-process-pcf-usage-data``` job and then click on the ```+``` sign to execute the pipeline.

If the pipeline jobs run successfully, then the produced JSON report will be saved to the targeted file repository and an email will be sent to the recipients listed in the ```email-to``` configuration parameter.  

---
### Customizing the pipeline

- **Enable the time resource trigger**  
  The time resource that automatically triggers the pipeline is commented out/disable in the sample code.  
  In order to have it enabled, remove the comments of the two lines that will enable the resource in the pipeline definition file ( [ci/pipeline/pcf-usage-report-simple.yml](https://github.com/pivotalservices/concourse-pcf-usage-report/blob/master/ci/pipeline/pcf-usage-report-simple.yml#L46)) and repeat step 3 of the pipeline setup instructions above.

- **Customize the time range of the report**  
  By default, the time range set by the report is the last month's initial and end dates.  
  In order to change it, look for task ```define-report-time-range``` of pipeline definition file ( [ci/pipeline/pcf-usage-report-simple.yml](https://github.com/pivotalservices/concourse-pcf-usage-report/blob/master/ci/pipeline/pcf-usage-report-simple.yml#L71)) and change the two line of bash scripts that calculate the initial and end dates to be used by the pipeline scripts.  
  The sample provides a commented out code to set those two dates to be the beginning of the current month until the current date (see below).   
  After changing these dates, repeat step 3 of the pipeline setup instructions above.     
  ```
  date1=$(date -d "$(date +%Y-%m-01)" +"%Y-%m-01")
  date -d "$(date +%Y-%m-%d)" +"{ 'USAGE_START_DATE':'$date1', 'USAGE_END_DATE':'%Y-%m-%d' }" > ./report-time-range/report-time-range.json
  ```

- **Skip the 'system' or any other organization in the report**  
  You can update script [get-usage-data.js](https://github.com/pivotalservices/concourse-pcf-usage-report/blob/master/scripts/get-usage-data.js) to remove any undesired organization from the usage report. You just need to include a surrounding **if** statement to method ```cfGetOrgUsage()```, like this:  
  ```  
  function cfGetOrgUsage(orgIndex) {
    var current_org_object=orgsUsageObject.resources[orgIndex];
    var current_org_guid=current_org_object.metadata.guid;
    if (current_org_object.entity.name!="system") {   // <====== Add this if statement
      console.log("Processing organization "+current_org_object.entity.name);
      ...
      ...
      }
          process.exit(1);
        }
      });
    } else {  // <====== Add this else statement
      doNextOrganization(orgIndex);
    }
  }
  ```  

- **Save the produced report to an artifact repository or to another file server**  
  You can replace the S3 bucket resource used in the sample pipeline with another resource that will allow you to do both a get and a put actions with it, such as the ones for [Artifactory](https://github.com/mborges-pivotal/artifactory-resource), [FTP](https://github.com/aequitas/concourse-ftp-resource) or [git](https://github.com/concourse/git-resource).  
  The get action is required for the automatic detection of a new file saved to the repository by the __feed-report-into-billing-system__ pipeline job. The put, obviously, is required for the report file to be saved to the repository.  

---
### Potential improvements and extensions to the pipeline  

- **Include additional pre-calculation of usage metrics in the output report**  
  The usage report currently includes only total memory, total instances, total time and total GB of storage used. Additional fields could be calculated and added to Apps, Spaces, Orgs and main parent objects, such as average Gb of memory per hour, or average instances for the period, etc., depending on the charge-back model adopted by the PCF foundation owner.  

- **Companion PCF Consumption Report Analysis web application**   
  The produced JSON report file could be fed to a web application that creates a dashboard for visualization of PCF Consumption Analysis and/or Charge Back Model What-If scenarios.  


---
### JSON schema of the output usage report  

```javascript
{
  "pcf_deploy_name": "string",  // PCF deployment ID set in the pipeline
  "start_date": "YYYY-MM-DD",   // report start date set in the pipeline
  "end_date": "YYYY-MM-DD",     // report end date set in the pipeline
  "total_app_instance_count": integer,  // total of app instances in all orgs
  "total_app_memory_used_in_mb": integer, // total MB of memory used in all orgs
  "total_disk_quota_in_mb": integer, // total of Disk space quota in all orgs
  "service_usages": [...], // array of consolidated service usages in all orgs
  "buildpack_usages": {...} // consolidated list of buildpack instances used in all orgs
  }
  "organizations": [    // array of organization objects and corresponding usage data
    {  // organization object
      "name": "string", // name of organization
      "guid": "string",  // guid of organization
      "total_app_instance_count": integer,  // total number of app instances for the org
      "total_app_memory_used_in_mb": integer, // total MB of memory used by all apps in the org
      "total_disk_quota_in_mb": integer, // total of disk quota for all apps in the org
      "service_usages": [...],  // consolidated array of service usages by all spaces in the org
      "buildpack_usages": {...}; // consolidated list of buildpacks used by all spaces in the org   
      "spaces": [  // array of all spaces of this org and corresponding usage data
        { // space object
          "guid": "string",   // space guid
          "name": "string",   // name of the space
          "total_app_instance_count": integer,  // number of app instances in the space
          "total_app_memory_used_in_mb": integer,  // total app memory used in the space
          "total_disk_quota_in_mb": integer, // total disk quota for all apps in the space
          "app_usages": [ // array of applications usage data for the space
            { // app usage object
              "guid": "string",  // application guid
              "name": "string",  // application name
              "instance_count": integer,  // number of instances of the application`
              "memory_in_mb_per_instance": integer, // memory used per each instance
              "duration_in_seconds": integer, // uptime for the application
              "total_memory_used_in_mb": integer, // total memory used by all instances of the application
              "disk_quota": integer,  // disk quota in MB per instance of the application
              "total_disk_quota_in_mb": integer,  // total disk quota for all instances of the application
              "buildpack": string,  // buildpack ID used by the application
              "buildpack_name": "string",  // buildpack name used by the application
              "detected_buildpack":  "string", // detected buildpack name used by the application when applicable
              "detected_buildpack_guid": "string " // detected buildpack guid used by the application when applicable
            },
            ... // more application usage objects go here
          ],
          "buildpack_usages": { // list of buildpacks and number of instances used by the apps in the space
            "string": {     // name or ID of the buildpack
              "guid": "string",   // buildpack guid
              "name": "string",  // name or ID of the buildpack
              "instances": instances   // number of instances of this buildpack used in the space
            },
            ... // more buildpack usage objects go here
          },
          "service_usages": [  // array of services usage data objects for the space
            {
              "service_guid": "string",  // service guid
              "service_instance_guid": "string",  // service instance guid
              "instances": integer,  // number of instances of this service in all spaces of the org
              "service_name": "string",  // name of the service
              "deleted": boolean,   // indicate whether or not the service is deleted
              "creation": "timestamp",  // time of creation of the service
              "deletion": "timestamp",  // time of deletion of the service. Null if not applicable
              "plan_guid": "string",  // guid of the service plan of this instance
              "plan_name": "string",  // name of the service plan
              "duration_in_seconds": integer    // total number of seconds used by all spaces of the org for this service instance
            },
            ... // more service usage objects go here
          ]
        },
        ... // more space objects go here
      ],
      "quota_plan": { // quota plan object assigned to the organization
        "name": "string",  // name of the quota plan
        "non_basic_services_allowed": boolean,
        "total_services": integer, // max number of services allowed, -1 for unlimited
        "total_routes": integer,  // max number of routes allowed, -1 for unlimited
        "total_private_domains": integer,  // max number of private domains, -1 for unlimited
        "memory_limit": integer,  // memory limit for all apps/spaces in the org, -1 for unlimited
        "trial_db_allowed": boolean,
        "instance_memory_limit": integer, // memory limit per each app instance, -1 for unlimited
        "app_instance_limit": integer,  // max number of application instances, , -1 for unlimited
        "app_task_limit": integer,  // max number of tasks, , -1 for unlimited
        "total_service_keys": integer,  // max number of service keys, , -1 for unlimited
        "total_reserved_route_ports": integer, // max reserved route ports
        "guid": "string"  // quota plan guid
      }
    },
    ... // more organization objects go here
  ],
}
```

---
### Notes

- **Note 1**: the accuracy of the produced report depends on the accuracy of the [PCF app usage API](http://docs.pivotal.io/pivotalcf/1-8/opsguide/accounting-report.html#cf-cli).  

- **Note 2**: this pipeline will only work for Pivotal Cloud Foundry deployments and versions which contain the [PCF accounting report applications](http://docs.pivotal.io/pivotalcf/1-8/opsguide/accounting-report.html) deployed by default.  
