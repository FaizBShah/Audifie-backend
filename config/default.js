require('dotenv').config();

module.exports = {
  "aws_ses": {
      "host": process.env.AWS_SES_HOST,
      "port": process.env.AWS_SES_PORT,
      "smtp_user": process.env.AWS_SES_SMTP_USER,
      "smtp_password": process.env.AWS_SES_SMTP_PASSWORD,
      "from_name": process.env.AWS_SES_FROM_NAME,
      "from_email": process.env.AWS_SES_FROM_EMAIL
  },
  "aws_s3": {
    "bucket_name": process.env.AWS_BUCKET_NAME,
    "bucket_region": process.env.AWS_BUCKET_REGION,
    "access_key": process.env.AWS_ACCESS_KEY,
    "secret_key": process.env.AWS_SECRET_KEY
  },
  "google": {
    "app_id": process.env.GOOGLE_APP_ID,
    "app_secret": process.env.GOOGLE_APP_SECRET
  },
  "facebook": {
    "app_id": process.env.FB_APP_ID,
    "app_secret": process.env.FB_APP_SECRET
  },
  "Server": {
    "port": process.env.SERVER_PORT,
    "secret" : process.env.SERVER_SECRET
  },
  "client": {
    "domain": process.env.CLIENT_DOMAIN
  }
}