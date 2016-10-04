var fs = require('fs');

var objectKey = process.argv[2];

var objectValue = process.argv[3];

var destinationObject = JSON.parse(fs.readFileSync(process.argv[4], 'utf8'));

console.log("Merging object "+process.argv[2]+" with value "+process.argv[3]+" into "+process.argv[4]);

destinationObject[objectKey]=objectValue;

console.log("Writing merged object back into file system");

fs.writeFile(process.argv[4], JSON.stringify(destinationObject, null, 2) , 'utf-8');
