const AWS = require("aws-sdk");
const fs = require("fs");
const config = require("../config/default");

const { bucket_name, bucket_region, access_key, secret_key } = config.aws_s3;

const bucketName = bucket_name;
const region = bucket_region;
const accessKeyId = access_key;
const secretAccessKey = secret_key;

const s3 = new AWS.S3({
  region,
  accessKeyId,
  secretAccessKey,
});

// uploads a file to s3
function uploadFile(file, cb) {
  const fileStream = fs.createfileStream(file.path);

  fileStream.on('open', () => {
    const uploadParams = {
      Bucket: bucketName,
      Body: fileStream,
      Key: file.id,
      ContentType: file.mimetype,
    };

    s3.upload(uploadParams, (err) => {
      if (err) return cb(err);
  
      cb(null);
    });
  });

  fileStream.on('error', (err) => {
    return cb(err);
  });
}

exports.uploadFile = uploadFile;