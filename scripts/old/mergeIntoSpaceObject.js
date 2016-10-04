var fs = require('fs');

var objectToMerge = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
var objectKey = process.argv[3];
var spacesObject = JSON.parse(fs.readFileSync(process.argv[4], 'utf8'));
var spaceGuid = process.argv[5];

console.log("Merging object "+process.argv[2]+" with key:"+process.argv[3]+" into Spaces File "+process.argv[4]+" for space "+process.argv[5]);

for (var orgItem in spacesObject.resources) {
  console.log("orgItem: "+orgItem);
  if (spacesObject.resources[orgItem].metadata.guid == spaceGuid) {
    console.log("Space object for the guid found, merging new object")
    spacesObject.resources[orgItem][objectKey]=objectToMerge;
    break;
  }
}

console.log("Writing merged Orgs object into file system");

fs.writeFile(process.argv[4], JSON.stringify(orgsObject, null, 2) , 'utf-8');
