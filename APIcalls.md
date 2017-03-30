
# PCF Usage Report producer - List of API Calls

**Work in progress.... To be finished soon**

1. Get list of all **orgs** using [CF API](https://apidocs.cloudfoundry.org/)  
   `cf curl /v2/organizations`  

1. Iterate over list of **orgs** and get Application usage for each one of them by using the [PCF Usage Service API](http://docs.pivotal.io/pivotalcf/1-10/opsguide/accounting-report.html#cf-cli):  
```   
curl "https://app-usage.<ert-app-domain>/organizations/`cf org YOUR-ORG-NAME --guid`/app_usages?start=2017-02-01&end=2017-02-28" -k -H "authorization: `cf oauth-token`"
```  

    For each space and app, we get    
```    
      "space_guid": "da664d4a-64fe-48da-ba8f-cba4c751b2ad",
      "space_name": "CarLoans",
      "app_name": "game-2048",
      "app_guid": "f664750f-5e9d-41e5-8ce8-53b45ba6cd38",
      "instance_count": 1,
      "memory_in_mb_per_instance": 1024,
      "duration_in_seconds": 353022    # $$$$$ => calculate RAM MB used in X amount of time
```

    => For each APP get DISK QUOTA and BUILDPACK(also obtained via /v2/spaces/c795c60b-aeff-49d0-ad65-d561ade7f2f0/apps):
       /v2/apps/a5fe1ae6-4e15-44d2-bf1f-e9885afcd86c
           - Disk quota: "resources[].entity.disk_quota"    $$$$$
           - Memory allocated: "resources[].entity.memory"  (just for reference, in case you want to compare with memory from previous step)
           - instances "resources[].entity.instances" (just for reference, in case you want to compare with instances from previous step)
           - detected_buildpack  "resources[].entity.detected_buildpack"  $$$$$


  $$$ ==> Group AIs, RAM use/time, DISK SPACE and BUILDPACK usage of APPS for each SPACE

  $$$ ==> AIs, RAM use/time, DISK SPACE and BUILDPACK of SPACES for each ORG
      Compare result with value returned by org API calls
         Org's instances usage:  cf curl /v2/organizations/e1ca44ed-8cdb-4655-a90e-c481c8bd07e6/instance_usage
         Org's memory usage:   cf curl /v2/organizations/e1ca44ed-8cdb-4655-a90e-c481c8bd07e6/memory_usage


***** SERVICE usage/time *****

From PCF-USAGE-SERVICE-PI get SERVICE usage for each ORG for the time period
   curl "https://app-usage.run.haas-48.pez.pivotal.io/organizations/`cf org Finance --guid`/service_usages?start=2016-09-01&end=2016-09-27" -k -H "authorization: `cf oauth-token`"
     => for each space, we get
            "duration_in_seconds": 88793.31,    $$$$$ => calculate service plan Y used in X amount of time
            "service_instance_guid": "5d1e7912-1b38-4ad0-866d-66cff6e617a2",
            "service_instance_name": "one",
            "service_instance_type": "managed_service_instance",
            "service_plan_guid": "d9baf55d-8cc2-4e3e-9352-c4723127fdbf",
            "service_plan_name": "default",
            "service_name": "concourse",
            "service_guid": "33c7a88c-002a-435d-8d0e-050a8a71c54c",
            "service_instance_creation": "2016-09-26T20:38:01.000Z",
            "service_instance_deletion": null

    Get service plan details and how it is charged per unit:
         cf curl /v2/service_plans/d9baf55d-8cc2-4e3e-9352-c4723127fdbf OR  cf curl /v2/service_plans (cache in memory)

    Add charging info to consolidated json object

  $$$ ==> Group SERVICE use/time of APPS for each SPACE

  $$$ ==> Group SERVICE use/time of SPACES for each ORG


***** QUOTA PLANS analysis by Org and Space *****  (for plan B - charge per allocated max resources/plans)

   Add info about ORGs quota_definitions and space_quota_definitions when existent, so it is available for plan B billing
