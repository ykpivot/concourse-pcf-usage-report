var fs = require('fs');

var appsUsageObject = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));

var spacesDetailsObject = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));

console.log("Merging Apps Usage object ["+process.argv[2]+"] info into spaces object "+process.argv[3])

// iterate through appsUsageObject and merge usage info into spacesDetailsObject
for (var item in appsUsageObject.app_usages) {
    console.log("Item: "+item);
    var current_space_guid=appsUsageObject.app_usages[item].space_guid;
    console.log("current_space_guid: "+current_space_guid);
    // find corresponding space object location
    for (var spaceObjCount in spacesDetailsObject.resources) {
      console.log("spaceObjCount: "+spaceObjCount);
      if (spacesDetailsObject.resources[spaceObjCount].metadata.guid == current_space_guid) {
        console.log("Found space object for guid "+current_space_guid+" in array position "+spaceObjCount+". Adding app_usages field to it with contents from file "+process.argv[2])
        if (! spacesDetailsObject.resources[spaceObjCount].app_usages) {
          spacesDetailsObject.resources[spaceObjCount].app_usages = [];  // initialize array for the first time
        };
        spacesDetailsObject.resources[spaceObjCount].app_usages.push(appsUsageObject.app_usages[item]);
        break;
      }
    }
}
console.log("Writing updated spaces object back to "+process.argv[3])

fs.writeFile(process.argv[3], JSON.stringify(spacesDetailsObject, null, 2) , 'utf-8');
