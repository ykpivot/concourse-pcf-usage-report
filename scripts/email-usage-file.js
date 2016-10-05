var fs = require('fs');
var nodemailer = require("nodemailer");


// create reusable transporter object using the default SMTP transport
var transporter = nodemailer.createTransport('smtps://'+process.env.SMTP_USERNAME+':'+process.env.SMTP_PASSWORD+'@'+process.env.SMTP_HOST+':'+process.env.SMTP_PORT);

var inputFileName="./orgs-usage-consolidated/pcf-usage-consolidated.json";
var usageObject = JSON.parse(fs.readFileSync(inputFileName, 'utf8'));

var reportTimeRangeObject = JSON.parse(fs.readFileSync("./report-time-range/report-time-range.json", 'utf8'));

var emailSubject="PCF Usage report from "+reportTimeRangeObject.USAGE_START_DATE+" to "+reportTimeRangeObject.USAGE_END_DATE;
var emailText="PCF Usage report:\nAPI endpoint: "+process.env.PCF_API_ENDPOINT+"\nPeriod: from "+reportTimeRangeObject.USAGE_START_DATE+" to "+reportTimeRangeObject.USAGE_END_DATE;

// setup e-mail data with unicode symbols
var mailOptions = {
  from: process.env.EMAIL_FROM,
  to: process.env.EMAIL_TO, // receiver
  subject: emailSubject, // subject
  text: emailText, // body
  html: '<b>'+emailText+'</b>', // html body
  attachments: [
          {   // file on disk as an attachment
              filename: 'pcf-usage-consolidated.json',
              path: './orgs-usage-consolidated/pcf-usage-consolidated.json', // stream this file
              contentType: 'application/json'
          }
      ]
};

// send mail with defined transport object
transporter.sendMail(mailOptions, function(error, info){
    if(error){
        return console.log(error);
    }
    console.log('Message sent: ' + info.response);
});
