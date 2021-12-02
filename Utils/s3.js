const S3 = require("aws-sdk/clients/s3");
const fs = require("fs");
require("dotenv").config();

const bucketName = process.env.AWS_BUCKET_NAME;
const region = process.env.AWS_BUCKET_REGION;
const accessKeyId = process.env.AWS_ACCESS_KEY;
const secretAccessKey = process.env.AWS_SECRET_KEY;

const s3 = new S3({
  region,
  accessKeyId,
  secretAccessKey,
});

// uploads a file to s3

function uploadFile(file) {
  const fileStream = fs.createReadStream(file.path);

  const uploadParams = {
    Bucket: bucketName,
    Body: fileStream,
    Key: file.filename,
    ContentType: file.mimetype,
  };

  return new Promise(async (resolve) => {
    let result = await s3.upload(uploadParams).promise();

    resolve(result);
  });
}

exports.uploadFile = uploadFile;

// downloads a file from s3
