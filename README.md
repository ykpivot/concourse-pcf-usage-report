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
If you want to see the full sample pipeline provided in action, here is how you can set it up on your own Concourse server:

##### Pre-requisites to setup this example on your Concourse server

1. An instance of [Concourse installed](http://concourse.ci/installing.html) up-and-running.  
1. The [Concourse Fly command line interface](http://concourse.ci/fly-cli.html) installed on your local machine.

##### Configuration steps
1. Clone the sample git repository on your local machine  
     __clone https://github.com/pivotalservices/concourse-pipeline-samples.git__  
     __cd concourse-pipeline-samples/email-with-attachments__  

1. Setup the pipeline credentials file
  * Make a copy of the sample credentials file  
  __cp ci/credentials.yml.sample ci/credentials.yml__  

  * Edit _ci/credentials.yml_ and fill out all the required credentials:  
  .  
_```git-project-url```:_ the URL of the git repositor containing the pipeline scripts  
_```smtp-host```:_ your smtp host  (e.g. ```smtp.gmail.com```)  
_```smtp-port```:_ your smtp server port number  (e.g. ```465```)   
_```smtp-username```:_ your userId/email-address with the smtp server with encoded @ sign  (e.g. ```myemail%40gmai.com```)   
_```smtp-password```:_ your userId/email-address password  
_```email-from```:_ the sender email address without enconding   (e.g. ```myemail@gmail.com```)  
_```email-to```:_ the list of comma separated destination emails without encoding  (e.g. ```him@there.com,her@here.net```)   

3. Configure the sample pipeline in Concourse with the following commands:  
   __fly -t <your-concourse-alias> set-pipeline -p email-pipeline -c ci/pipeline.yml -l ci/credentials.yml__  

4. Access to the Concourse web interface, click on the list of pipelines, un-pause the _email-pipeline_ and then click on its link to visualize its pipeline diagram
5. To execute the pipeline, click on the ```send-email-with-attachment``` job and then click on the ```+``` sign to execute the pipeline.

The recipients listed you your ```email-from``` parameter should receive an email shortly after the pipeline is run successfully.

---
### Room for improvements

TBD
