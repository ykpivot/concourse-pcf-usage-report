var fs = require('fs');

var orgObject = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));

// console.log(JSON.stringify(orgObject, null, 2));

var appGuid = process.argv[3];

var appDetailsObject = JSON.parse(fs.readFileSync(process.argv[4], 'utf8'));

// console.log(JSON.stringify(appDetailsObject, null, 2));

// find the right location in orgObject

console.log("Searching "+process.argv[2]+" for application object "+process.argv[3])
for (var item in orgObject.app_usages) {
    if (orgObject.app_usages[item].app_guid == appGuid) {
      console.log("Found object "+process.argv[3]+" in array position "+item+". Adding app_details field to it with contents from file "+process.argv[4])
      orgObject.app_usages[item].app_details = appDetailsObject;
      break;
    }
}
console.log("Writing updated object back to "+process.argv[2])

fs.writeFile(process.argv[2], JSON.stringify(orgObject, null, 2) , 'utf-8');
