var express = require("express");
var router = express.Router();
const jwt = require("jwt-simple");
const nodemailer = require("nodemailer");
const axios = require("axios");
const bcrypt = require("bcrypt");
const Users = require("../model/user");
const HTTPError = require("../errorMessage");
const config = require("../config/default");


//Email sending configurations
const smtpConfig = {
   host: config.aws_ses.host,
   port: config.aws_ses.port,
   auth: {
     user: config.aws_ses.smtp_user,
     pass: config.aws_ses.smtp_password,
   },
};


//email transport configuration
const transporter = nodemailer.createTransport(smtpConfig);

//Function for sending email
const sendMail = (mailOptions) => {
new Promise((resolve, reject) => {
  transporter.sendMail(mailOptions, (error, info) => {
  if (error) {
      return reject(error);
  } 
  else {
    console.log("email sent successfully");
    return resolve(info);
         }
     });
  });
 };


//Function for generating random number for verification code
const generateRandomNumber = (length) => {
  const arr = [];
  while (arr.length < length) {
    const randomNumber = Math.floor(Math.random() * 9) + 1;
    if (arr.indexOf(randomNumber) > -1) continue;
    arr[arr.length] = randomNumber;
  }
  return arr.join("");
};


//Code for sending sms (otp sending)
//{need to be coded}


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

    let email = req.body.email;
    const name = req.body.name;
    const password = req.body.password;
    //const phone=req.body.phone;

    if (!email) throw new HTTPError(400, "Email not found");

    const re = /^(([^<>()[\]\\.,;:\s@\\"]+(\.[^<>()[\]\\.,;:\s@\\"]+)*)|(\\".+\\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    const validEmail = re.test(email);
    if (!validEmail) throw new HTTPError(400, "Email Invalid");

    //const ph_re= /^\+?\d.\s?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$/
    //const validPhone = ph_re.test(phone);
    //if (!validPhone) throw new HTTPError(400, "Phone Number is Invalid");

    if (!password) throw new HTTPError(400, "Password not found");
    if (password.length < 6 || password.length > 32) throw new HTTPError(400, "Password invalid");

    if (!name) throw new HTTPError(400, "Name is required while sign up");

    const user = await Users.findOne({ email });

    if (user) throw new HTTPError(400, "User already exists");

    const verification_code = generateRandomNumber(6);

    const newUser = new Users({
      email,
      name,
      password,
      is_logged_in: false,
      email_confirmed: false,
      verification_code,
    });

    bcrypt.genSalt(10, (err, salt) => {
      if (err) throw new HTTPError(400, "Login Failed");

      bcrypt.hash(newUser.password, salt, (err, hash) => {
        if (err) throw new HTTPError(400, "Login Failed");
        
        newUser.password = hash;
        newUser.save()
          .then((newUser) => {
            res.status(200).json({ status: "ok" });

            // email message 
            const mailOptions = {
              from: `"${config.aws_ses.from_name}" <${config.aws_ses.from_email}>`,
              to: newUser.email,
              subject: "Email Verification Code",
              text: `Your Email Verification Code is : ${verification_code}`,
            };

            sendMail(mailOptions);
          })
          .catch((err) => res.status(err.statusCode || 400).json({ status: "error", message: err.message || "Login Failed" }));
      });
    });
  } catch (err) {
    return res.status(err.statusCode || 400).json({ status: "error", message: err.message || "Login Failed" });
  }
});


/**
 * @api {post} /mail/verify
 * @apiName verify
 * 
 * @apiParam {String} Email id of the user (Mandatory)
 * @apiParam {String} Verification Code of the user (Mandatory)
 * 
 * @apiSuccess {object} status of verification.
 * 
 */


router.route("/mail/verify").post(async (req,res) => {
  try{
    if(!req.body) throw new HTTPError(400, "Request body empty");
    let email=req.body.email;
    const code=req.body.code;

    if (!email) throw new HTTPError(400, "Email not found");
    email=email.toLowerCase();

    if(!code) throw new HTTPError(400, "Verification code not provided");

    const user = await Users.findOne({email});

    if(user.email_confirmed==true) throw new HTTPError(400, "Email already verfified");
    else{
    if(user.verification_code===code){
      user.email_confirmed=true;
      user.verification_code="";
      user.save(() => {
        res.send(200).json({status: "Email Verified"});
      });
    }
    else{
      res.status(400).json({status: "error" , message: "Verification Failed"});
    }
    }
  }
  catch (err){
    return res.status(err.statusCode || 400).json({ status: "error", message: err.message });
    }
});


/**
 * @api {post} /forgetpass/request forget password request
 * @apiName forget_password_request
 *  
 * @apiParam {String} email id of the user
 * 
 * @apiSuccess {object} status of forget password request
 */

router.route('/forgetpass/request').post(async (req,res) => {
  try{
    let email=req.body.email;

    if(!email) throw new HTTPError(400, "Request Body Empty");

    email=email.toLowerCase();
    const user= await Users.findOne({email});

    let code=req.body.fg_code;

    if(!code){

      let forget_pass_code=generateRandomNumber(6);
      user.verification_code=forget_pass_code;

      user.save(() => {
        res.send(200).json({status: "Forget password code generated"});

        // email message 
        const mailOptions = {
        from: `"${config.aws_ses.from_name}" <${config.aws_ses.from_email}>`,
        to: user.email,
        subject: "Forget Password Request Code",
        text: `Your Forget Password Request Verification Code is : ${forget_pass_code}`,
        };
  
        sendMail(mailOptions);

      });
    }
    else{
      if(user.verification_code===code){
        user.verification_code="";
        res.status(200).json({status: "Forget password code verified successfully"});
      }
      else{
        res.status(400).json({status: "error" , message: "Verification Failed"});
      }
    }  
  }
  catch(err){
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
    // const ip = req.headers["x-forwarded-for"];

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
          const token = jwt.encode(user, config.Server.secret);
          user.save(() => {
            res.status(200).json({ status: "logged in", token: `JWT ${token}` });
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


/**
 * @api {post} /users/googlesignup/ signup through Google
 * @apiName google_signup_request
 *
 * @apiParam {String} Google Access Token of the user.
 *
 * @apiSuccess {String} status response status string.
 * @apiSuccess {Object} user signed up status.
 */

 router.route("/googlesignup").post(async (req,res) => {
  try{
    const google_code = req.body.google_code;
    if(!google_code) throw new HTTPError(400,"Access Code is Missing");
 
    const { data: { access_token, expires_in } } = await axios({
      url: `https://oauth2.googleapis.com/token`,
      method: 'post',
      data: {
        client_id: config.google.app_id,
        client_secret: config.google.app_secret,
        redirect_uri: 'https://www.example.com/authenticate/google',
        grant_type: 'authorization_code',
        google_code,
      },
    });

    const { data: { email, given_name, family_name } } = await axios({
      url: 'https://www.googleapis.com/oauth2/v2/userinfo',
      method: 'get',
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    const user = await Users.findOne({ email });

    if (!user) {
      const newUser = new Users({
        email,
        name: given_name + " " + family_name,
        password: generateRandomNumber(14),
        is_logged_in: false,
        email_confirmed: true,
      });
  
      bcrypt.genSalt(10, (err, salt) => {
        if (err) throw new HTTPError(400, "Login Failed");
  
        bcrypt.hash(newUser.password, salt, (err, hash) => {
          if (err) throw new HTTPError(400, "Login Failed");
          
          newUser.password = hash;
          newUser.save()
            .then((user) => {
              user.expires_in = expires_in;
              const token = jwt.encode(user, config.Server.secret);
              res.status(200).json({ status: "ok", token: `JWT ${token}`, auth: 'Google' });
            })
            .catch((err) => res.status(err.statusCode || 400).json({ status: "error", message: err.message || "Login Failed" }));
        });
      });
    }
    else {
      user.expires_in = expires_in;
      const token = jwt.encode(user, config.Server.secret);
      res.status(200).json({ status: "ok", token: `JWT ${token}`, auth: 'Google' });
    }
  }
  catch(err){
    return res.status(err.statusCode || 400).json({status: "error", message: err.message || "Login Failed" });
  }
});


/**
 * @api {post} /users/fbsignup/ signup through FB
 * @apiName fb_signup_request
 *
 * @apiParam {String} FB Access Token of the user.
 *
 * @apiSuccess {String} status response status string.
 * @apiSuccess {Object} user signed up status.
 */

router.route("/fbsignup").post(async (req,res) => {
  try{
    const fb_code = req.body.fb_code;
    if(!fb_code) throw new HTTPError(400,"Access Code is Missing");
 
    const { data: { access_token, expires_in } } = await axios({
      url: 'https://graph.facebook.com/v4.0/oauth/access_token',
      method: 'get',
      params: {
        client_id: config.facebook.app_id,
        client_secret: config.facebook.app_secret,
        redirect_uri: 'https://www.example.com/authenticate/facebook/',
        fb_code,
      },
    });

    const { data: { email, first_name, last_name } } = await axios({
      url: 'https://graph.facebook.com/me',
      method: 'get',
      params: {
        fields: ['id', 'email', 'first_name', 'last_name'].join(','),
        access_token: access_token,
      },
    });

    const user = await Users.findOne({ email });

    if (!user) {
      const newUser = new Users({
        email,
        name: first_name + " " + last_name,
        password: generateRandomNumber(14),
        is_logged_in: false,
        email_confirmed: true,
      });
  
      bcrypt.genSalt(10, (err, salt) => {
        if (err) throw new HTTPError(400, "Login Failed");
  
        bcrypt.hash(newUser.password, salt, (err, hash) => {
          if (err) throw new HTTPError(400, "Login Failed");
          
          newUser.password = hash;
          newUser.save()
            .then((user) => {
              user.expires_in = expires_in;
              const token = jwt.encode(user, config.Server.secret);
              res.status(200).json({ status: "ok", token: `JWT ${token}`, auth: 'Facebook' });
            })
            .catch((err) => res.status(err.statusCode || 400).json({ status: "error", message: err.message || "Login Failed" }));
        });
      });
    }
    else {
      user.expires_in = expires_in;
      const token = jwt.encode(user, config.Server.secret);
      res.status(200).json({ status: "ok", token: `JWT ${token}`, auth: 'Facebook' });
    }
  }
  catch(err){
    return res.status(err.statusCode || 400).json({status: "error", message: err.message || "Login Failed" });
  }
});


module.exports = router;

