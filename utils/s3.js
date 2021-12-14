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
  secretAccessKey
});

// Uploads a file to s3
exports.uploadFile = (file, cb) => {
  const fileStream = fs.createReadStream(file.path);

  fileStream.on('open', () => {
    const uploadOpts = {
      Bucket: bucketName,
      Body: fileStream,
      Key: file.id,
      ContentType: file.mimetype,
    };

    s3.upload(uploadOpts, (err) => {
      if (err) return cb(err);
  
      cb(null);
    });
  });

  fileStream.on('error', (err) => {
    return cb(err);
  });
}

// Deletes the files from s3
exports.deleteFile = (fileId, cb) => {
  const deleteOpts = {
    Bucket: bucketName,
    Delete: {
      Objects: [
        { Key: fileId },
        { Key: fileId + "_audio" },
        { Key: fileId + "_text" }
      ]
    }
  }

  s3.deleteObjects(deleteOpts, (err) => {
    if (err) return cb(err);
  
    cb(null);
  });
}