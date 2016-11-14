var chai = require('chai');
var expect = chai.expect
  , assert = chai.assert
  , should = chai.should();

var ConsolidatePCFUsageData = require(__dirname+'/../ConsolidatePCFUsageData.js');

describe('ConsolidatePCFUsageData Unit tests', function() {

  var consolidatePCFUsageData = new ConsolidatePCFUsageData();

  // findObjectByGuid
  it('findObjectByGuid() should return null for an empty quota definition object', function() {
    var emptyQuotaObject = {};
    emptyQuotaObject.resources = [];
    expect(consolidatePCFUsageData.findObjectByGuid("1234",emptyQuotaObject)).to.be.null;
  });

  it('findObjectByGuid() should return a non-null object for an existing quota definition object', function() {
    var quotaObject = initPCFObject();
    expect(consolidatePCFUsageData.findObjectByGuid("2100",quotaObject)).is.not.null;
  });

  it('findObjectByGuid() should return the object with the correct guid', function() {
    var quotaObject = initPCFObject();
    expect(consolidatePCFUsageData.findObjectByGuid("2499",quotaObject)).to.equal(quotaObject.resources[499]);
  });

  // findAppObject
  it('findAppObject() should return null for an empty quota definition object', function() {
    var emptyObject = {};
    emptyObject.resources = [];
    expect(consolidatePCFUsageData.findAppObject("MyApp",emptyObject)).to.be.null;
  });

  it('findAppObject() should return a non-null object for an existing quota definition object', function() {
    var testObject = initPCFAppsObject();
    expect(consolidatePCFUsageData.findAppObject("2100",testObject)).is.not.null;
  });

  it('findAppObject() should return the object with the correct guid', function() {
    var testObject = initPCFAppsObject();
    expect(consolidatePCFUsageData.findAppObject("2499",testObject)).to.equal(testObject.resources[499]);
  });

  // aggregateBuildpackUsage
  it('aggregateBuildpackUsage() should return an appropriately consolidated BP object for an input object with a single BP entry', function() {
    var myObject = {};
    myObject.JavaBuildpack = {};
    myObject.JavaBuildpack.instances = 10;

    var consolidatedObject = {};
    consolidatePCFUsageData.aggregateBuildpackUsage(myObject,consolidatedObject);
    assert.deepEqual(consolidatedObject,myObject);
  });

  it('aggregateBuildpackUsage() should return an appropriately consolidated BP object for an input object with multiple BP entries', function() {
    var myObject = {};
    myObject.JavaBuildpack = {};
    myObject.JavaBuildpack.instances = 10;
    myObject.NodeJsBuildpack = {};
    myObject.NodeJsBuildpack.instances = 5;

    var consolidatedObject = {};
    consolidatePCFUsageData.aggregateBuildpackUsage(myObject,consolidatedObject);
    assert.deepEqual(consolidatedObject,myObject);
  });

  it('aggregateBuildpackUsage() should return an appropriately consolidated BP object with the correct total number of BP instances', function() {
    var myObject = {};
    myObject.JavaBuildpack = {};
    myObject.JavaBuildpack.instances = 10;
    myObject.NodeJsBuildpack = {};
    myObject.NodeJsBuildpack.instances = 5;

    var consolidatedObject = {};
    consolidatedObject.JavaBuildpack = {};
    consolidatedObject.JavaBuildpack.instances = 8;
    var expectedTotalNumber = consolidatedObject.JavaBuildpack.instances+myObject.JavaBuildpack.instances;

    consolidatePCFUsageData.aggregateBuildpackUsage(myObject,consolidatedObject);
    expect(consolidatedObject.JavaBuildpack.instances).to.be.equal(expectedTotalNumber);
  });

  // aggregateServicesUsage
  it('aggregateServicesUsage() should return an appropriately consolidated object when starting with an empty consolidated object', function() {
    var myInputArray = [];
    var myObject = {};
    myObject.service_guid = "100";
    myObject.plan_guid = "200";
    myObject.instances = 5;
    myObject.duration_in_seconds = 100;
    myInputArray.push(myObject);
    var consolidateArray = [];

    consolidatePCFUsageData.aggregateServicesUsage(myInputArray,consolidateArray);
    expect(consolidateArray).to.deep.equal(myInputArray);
  });

  it('aggregateServicesUsage() should return an appropriately consolidated object when starting with a non-empty consolidated object', function() {
    var myInputArray = [];
    var myObject = {};
    myObject.service_guid = "100";
    myObject.plan_guid = "200";
    myObject.instances = 5;
    myObject.duration_in_seconds = 100;
    myInputArray.push(myObject);
    var myObject2 = {};
    myObject2.service_guid = "200";
    myObject2.plan_guid = "300";
    myObject2.instances = 10;
    myObject2.duration_in_seconds = 1200;
    myInputArray.push(myObject2);


    var consolidateArray = [];
    var myExistingObject = {};
    myExistingObject.service_guid = "100";
    myExistingObject.plan_guid = "200";
    myExistingObject.instances = 10;
    myExistingObject.duration_in_seconds = 500;
    myInputArray.push(myExistingObject);

    var expectedInstances = myObject.instances+myExistingObject.instances;
    var expectedDuration = myObject.duration_in_seconds+myExistingObject.duration_in_seconds;

    consolidatePCFUsageData.aggregateServicesUsage(myInputArray,consolidateArray);
    expect(consolidateArray[0].instances).to.equal(expectedInstances);
    expect(consolidateArray[0].duration_in_seconds).to.equal(expectedDuration);
    expect(consolidateArray.length).to.equal(2);
  });


  // processOrganization

  // saveConsolidatedObject

  // processAllOrganizations

  // initializeOutputObject

  // readUsageDataFile

  // execute


});

function initPCFObject() {
  var myObject = {};
  myObject.resources = [];
  for (var i=0;i<500;i++) {
    myObject.resources[i] = {};
    myObject.resources[i].metadata = {};
    myObject.resources[i].metadata.guid = i+2000+"";
  }
  return myObject;
}

function initPCFAppsObject() {
  var myObject = {};
  myObject.resources = [];
  for (var i=0;i<500;i++) {
    myObject.resources[i] = {};
    myObject.resources[i].entity = {};
    myObject.resources[i].entity.name = i+2000+"";
  }
  return myObject;
}

function initBPSimpleObject() {
  var myObject = {};
  myObject.instances = 10;
}
