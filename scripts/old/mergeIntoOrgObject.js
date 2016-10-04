var fs = require('fs');

var objectToMerge = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
var objectKey = process.argv[3];
var orgsObject = JSON.parse(fs.readFileSync(process.argv[4], 'utf8'));
var orgGuid = process.argv[5];

console.log("Merging object "+process.argv[2]+" with key:"+process.argv[3]+" into Org File "+process.argv[4]+" for Org "+process.argv[5]);

for (var orgItem in orgsObject.resources) {
  console.log("orgItem: "+orgItem);
  if (orgsObject.resources[orgItem].metadata.guid == orgGuid) {
    console.log("Org object for the guid found, merging new object")
    orgsObject.resources[orgItem][objectKey]=objectToMerge;
    break;
  }
}

console.log("Writing merged Orgs object into file system");

fs.writeFile(process.argv[4], JSON.stringify(orgsObject, null, 2) , 'utf-8');
