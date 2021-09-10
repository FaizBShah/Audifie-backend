const aws = require('aws-sdk');
const config = require('../config/default.json');


aws.config.update({
    region: config['aws_sns'].region,
    accessKeyId: config['aws-credentials'].accessKeyId,
    secretAccessKey: config['aws-credentials'].secretAccessKey
});

var sns = new aws.SNS();

sns.setSMSAttributes({
    attributes: {DefaultSMSType: "Transactional"}
},(err,data)=>{
    if(err){
        console.log(err);
    }
    else{
        console.log(`The response: ${data}`);
    }
});

exports.sendSMS=(phoneNumber,Body) => {
    var params = {
        Message: Body,
        MessageStructure: 'string',
        PhoneNumber: phoneNumber
    };
    new Promise((resolve,reject) => {
        sns.publish(params, (error,data) => {
            if(error){
                return reject(error);
            }
            else{
                console.log("SMS sent successfully!!!");
                resolve (data);
            }
        });
    });
}






