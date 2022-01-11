const AWS = require("aws-sdk");
const fs = require("fs");
const config = require("../config/default");

const { 
  files_bucket_name,
  audio_bucket_name,
  text_bucket_name,
  marks_bucket_name,
  bucket_region,
  access_key,
  secret_key,
} = config.aws_s3;

const filesBucketName = files_bucket_name;
const audioBucketName = audio_bucket_name;
const textBucketName = text_bucket_name;
const marksBucketName = marks_bucket_name;
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
      Bucket: filesBucketName,
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
  const deleteOpts = [
    { Bucket: filesBucketName, Key: fileId },
    { Bucket: audioBucketName, Key: fileId + '_audio.mp3' },
    { Bucket: marksBucketName, Key: fileId + '_speechmarks.marks' },
    { Bucket: textBucketName, Key: fileId + '_text.txt' }
  ]
  
  const deletePromise = deleteOpts.map(opts => s3.deleteObject(opts).promise());

  Promise.all(deletePromise)
  .then(() => cb(null))
  .catch((err) => cb(err));
}

// Get audio files from s3
exports.getAudioFiles = async (fileId, cb) => {
  try {
    const numSecsInDay = 60 * 60 * 24;

    const audioOpts = {
      Bucket: audioBucketName,
      Key: fileId + '_audio.mp3'
    };

    const marksOpts = {
      Bucket: marksBucketName,
      Key: fileId + '_speechmarks.marks'
    };

    await s3.headObject(audioOpts).promise();
    await s3.headObject(marksOpts).promise();

    const audioUrl = await s3.getSignedUrlPromise('getObject', {...audioOpts, Expires: numSecsInDay});
    const speechUrl = await s3.getSignedUrlPromise('getObject', {...marksOpts, Expires: numSecsInDay});

    return cb(null, { audioUrl, speechUrl });
  } catch (err) {
    return cb(err);
  }
}