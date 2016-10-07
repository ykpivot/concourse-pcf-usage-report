# PCF Usage Report producer - a Concourse pipeline sample

Pivotal Cloud Foundry provides a set of [application usage collection APIs](http://docs.pivotal.io/pivotalcf/1-8/opsguide/accounting-report.html#cf-cli) that can be used to retrieve and compile applications and services usage of all organizations and spaces defined in a deployment.  

This sample Concourse pipeline leverages the [PCF app usage API](http://docs.pivotal.io/pivotalcf/1-8/opsguide/accounting-report.html#cf-cli) along with the standard open source [Cloud Foundry APIs](https://apidocs.cloudfoundry.org/) to collect and consolidate a PCF usage report in JSON format.

The pipeline uses Node.js scripts under-the-covers and can be easily tweaked and customized for your organization needs in terms of how the report is built and results calculated.

A place holder step for when the produced JSON report can be fed into a billing system is also provided.
