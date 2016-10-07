![PCF Usage Report producer sample pipeline](https://github.com/pivotalservices/concourse-pcf-usage-report/raw/master/common/images/pcf_usage.png)

# PCF Usage Report producer - a Concourse pipeline sample

Pivotal Cloud Foundry provides a set of [application usage collection APIs](http://docs.pivotal.io/pivotalcf/1-8/opsguide/accounting-report.html#cf-cli) that can be used to retrieve and compile applications and services usage of all organizations and spaces defined in a deployment.  

This sample Concourse pipeline leverages the [PCF app usage API](http://docs.pivotal.io/pivotalcf/1-8/opsguide/accounting-report.html#cf-cli) along with the standard open source [Cloud Foundry APIs](https://apidocs.cloudfoundry.org/) to collect and consolidate a PCF usage report in JSON format.

The pipeline uses Node.js scripts under-the-covers and can be easily tweaked and customized for your organization needs in terms of how the report is built and results calculated.

A placeholder step is provided for the produced JSON report to be fed into a billing system.

### Pipeline functionality

The pipeline performs the following steps:

![PCF Usage Report producer pipeline screenshot](https://github.com/pivotalservices/concourse-pcf-usage-report/raw/master/common/images/pipeline_annotated.png)

1. Pipeline tasks and scripts are retrieved from a git repository  

2. Usage data and quota information is retrieved from the PCF deployment:  
   - Organization, space, applications, services and buildpack information, along with memory and space quotas are retrieved using [Cloud Foundry APIs](https://apidocs.cloudfoundry.org/)  
   - Applications and services usage data is retrieved using [PCF app usage API](http://docs.pivotal.io/pivotalcf/1-8/opsguide/accounting-report.html#cf-cli)  
   The collect data is then processed and consolidated into a single output JSON report file (see object schema further below).
   If an error occurs in this step, a notification email is sent to the appropriate recipients (configurable).

3. The produced consolidated JSON object is stored into a file repository (an S3 bucket in this example)  

4. The next job is notified about the new report that got created in the file repository and then processes it accordingly, for instance, by feeding of that information into a billing system. In this sample pipeline, that is just a placeholder job without an actual implementation  

5. A notification email is sent to the appropriate (configurable) recipients about the successful PCF usage report creation

---
### JSON Report schema

TBD
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

3. Configure the sample pipeline in Concourse with the following commands:  
   __fly -t <your-concourse-alias> set-pipeline -p pcf-usage-pipeline -c ci/pipeline/pcf-usage-report-simple.yml -l ci/pipeline/credentials.yml__  

4. Access to the Concourse web interface, click on the list of pipelines, un-pause the _pcf-usage-pipeline_ and then click on its link to visualize its pipeline diagram  

5. To execute the pipeline, click on the ```retrieve-and-process-pcf-usage-data``` job and then click on the ```+``` sign to execute the pipeline.

The recipients listed you your ```email-to``` parameter should receive an email shortly after the pipeline is run successfully.

---
### Customizing and making the pipeline ready for production

- enable timer resource
- time period of report
TBD

---
### Potential improvements and extensions

TBD
---
### Notes

Note 1: dependency on PCF API for accuracy of results

TBD
