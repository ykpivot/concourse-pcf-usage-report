var fs = require('fs');

var objectToMerge = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));

var objectKey = process.argv[3];

var objectMergeDestination = JSON.parse(fs.readFileSync(process.argv[4], 'utf8'));

console.log("Merging object "+process.argv[2]+" into "+process.argv[4]+" with key:"+process.argv[3]);

objectMergeDestination[objectKey]=objectToMerge;

console.log("Writing merged object into file system");

fs.writeFile(process.argv[4], JSON.stringify(objectMergeDestination, null, 2) , 'utf-8');
