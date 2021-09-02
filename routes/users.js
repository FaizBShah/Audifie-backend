var express = require("express");
var router = express.Router();

// const nodemailer = require("nodemailer");

const Users = require("../model/user");
const HTTPError = require("../errorMessage");
// const config = require("../config/default.json");

// const smtpConfig = {
//   host: config.aws_ses.host,
//   port: config.aws_ses.port,
//   auth: {
//     user: config.aws_ses.smtp_user,
//     pass: config.aws_ses.smtp_password,
//   },
// };

//email transport config for later use
// const transporter = nodemailer.createTransport(smtpConfig);

// const sendMail = (mailOptions) => {
//   new Promise((resolve, reject) => {
//     transporter.sendMail(mailOptions, (error, info) => {
//       if (error) {
//         return reject(error);
//       } else {
//         console.log("email send");
//         return resolve(info);
//       }
//     });
//   });
// };

/**
 * @api {post} /users/signup/ signup
 * @apiName signup_request
 *
 * @apiParam {String} Email ID of the user.
 * @apiParam {String} password Mandatory password.
 * @apiParam {String} Name of the user.
 *
 * @apiSuccess {String} status response status string.
 * @apiSuccess {Boolean} email_confirmed  Email confirmation status.
 * @apiSuccess {Object} user logged in status.
 */

router.route("/signup").post(async (req, res) => {
  try {
    if (!req.body) throw new HTTPError(400, "Post data invalid");

    const email = req.body.email;
    const name = req.body.name;
    const password = req.body.password;

    if (!email) throw new HTTPError(400, "Email not found");

    const re = /^(([^<>()[\]\\.,;:\s@\\"]+(\.[^<>()[\]\\.,;:\s@\\"]+)*)|(\\".+\\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    const validEmail = re.test(email);
    if (!validEmail) throw new HTTPError(400, "Email Invalid");

    if (!password) throw new HTTPError(400, "Password not found");
    if (password.length < 6 || password.length > 32) throw new HTTPError(400, "Password invalid");

    if (!name) throw new HTTPError(400, "Name is required while sign up");

    const generateRandomNumber = (length) => {
      const arr = [];
      while (arr.length < length) {
        const randomNumber = Math.floor(Math.random() * 9) + 1;
        if (arr.indexOf(randomNumber) > -1) continue;
        arr[arr.length] = randomNumber;
      }
      return arr.join("");
    };

    const email_verification_code = generateRandomNumber(6);

    const newUser = new Users({
      email,
      name,
      password,
      is_logged_in: false,
      email_confirmed: false,
      email_verification_code,
    });

    const existingUser = await Users.findOne({ email });
    if (existingUser) throw new HTTPError(400, "Email already in use");
    else {
      newUser.save(() => {
        res.status(200).json({ status: "ok" });

        // email message option for later use
        // const mailOptions = {
        //   from: `"${config.aws_ses.from_name}" <${config.aws_ses.from_email}>`,
        //   to: newUser.email,
        //   subject: "Email Verification Code",
        //   text: `Your Email Verification Code : ${email_verification_code}`,
        // };

        // sendMail(mailOptions);
      });
    }
  } catch (err) {
    return res.status(err.statusCode || 400).json({ status: "error", message: err.message });
  }
});

/**
 * @api {post} /users/login/ login
 * @apiName login_request
 *
 * @apiParam {String} Email ID of the user.
 * @apiParam {String} password Mandatory password.
 *
 * @apiSuccess {String} status response status string.
 * @apiSuccess {Object} user logged in status.
 */

router.route("/login").post(async (req, res) => {
  try {
    if (!req.body) throw new HTTPError(400, "Request body empty");
    let email = req.body.email;
    const password = req.body.password;
    const ip = req.headers["x-forwarded-for"];

    if (!email) throw new HTTPError(400, "Email not found");
    email = email.toLowerCase();
    const re = /^(([^<>()[\]\\.,;:\s@\\"]+(\.[^<>()[\]\\.,;:\s@\\"]+)*)|(\\".+\\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    const validEmail = re.test(email);
    if (!validEmail) throw new HTTPError(400, "Email is invalid");

    if (!password) throw new HTTPError(400, "Password missing");
    if (password.length < 6 || password.length > 64) throw new HTTPError(400, "password is invalid");

    const user = await Users.findOne({ email });
    if (!user) throw new HTTPError(400, "Invalid user");
    else {
      user.comparePassword(req.body.password, (err, isMatch) => {
        if (isMatch && !err) {
          user.is_logged_in = true;
          user.save(() => {
            res.status(200).json({ status: "logged in" });
          });
        } else {
          res.status(400).send({ status: "error", message: "Sign In failed" });
        }
      });
    }
  } catch (err) {
    return res.status(err.statusCode || 400).json({ status: "error", message: err.message });
  }
});

module.exports = router;
