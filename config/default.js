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
  "Server": {
      "port": process.env.SERVER_PORT,
      "secret" : process.env.SERVER_SECRET
  }
}