var express = require("express");
var router = express.Router();
const jwt = require("jwt-simple");
const nodemailer = require("nodemailer");
const request = require("request");
const Users = require("../model/user");
const HTTPError = require("../errorMessage");
const config = require("../config/default.json");


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

    email=email.toLowerCase();

    const verification_code = generateRandomNumber(6);

    const newUser = new Users({
      email,
      name,
      password,
      is_logged_in: false,
      email_confirmed: false,
      verification_code,
    });

    newUser.save(() => {
      const token = jwt.encode(newUser, config.Server.secret);
      res.status(200).json({ status: "ok", token: `JWT ${token}` });

      // email message 
      const mailOptions = {
      from: `"${config.aws_ses.from_name}" <${config.aws_ses.from_email}>`,
      to: newUser.email,
      subject: "Email Verification Code",
      text: `Your Email Verification Code is : ${verification_code}`,
      };

      sendMail(mailOptions);
    });
  } catch (err) {
    return res.status(err.statusCode || 400).json({ status: "error", message: err.message });
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
    const google_token = req.body.google_token;
    if(!google_token) throw new HTTPError(400,"Access Code is Missing");
 
    const config={}
 
    config.url="https://graph.google.com/me";
    config.headers={};
    config.headers.Authorization=`OAuth ${google_token}`
 
    request(config, async (err,response,body)=>{
      if(err){
        return res.status(400).json({status: "Error", message: "Google token missing"})
      }
      else{
        const data = JSON.parse(body)
        console.log(data)
        console.log(Users)
        const userObj = await Users.findOne({email: data.email, "profile_id": data.id});

        if (userObj) {
          return res.status(400).json({status: "Error", message: "User already exists"});
        }

        const { email, name } = data;
        const password = generateRandomNumber(14);
        
        const newUser = new Users({
          email,
          name,
          password,
          is_logged_in: false,
          email_confirmed: true
        });

        newUser.save(() => {
          res.status(200).json({ status: "ok", message: 'User signed up' });
        });
      }
    })
  }
  catch(err){
    return res.status(err.statusCode || 400).json({status: "error",message: err.message});
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
    const fb_token = req.body.fb_token;
    if(!fb_token) throw new HTTPError(400,"Access Code is Missing");
 
    const config={}
 
    config.url="https://graph.facebook.com/me";
    config.headers={};
    config.headers.Authorization=`OAuth ${fb_token}`
 
    request(config, async (err,response,body)=>{
      if(err){
        return res.status(400).json({status: "Error", message: "fb token missing"})
      }
      else{
        const data = JSON.parse(body)
        console.log(data)
        console.log(Users)
        const userObj = await Users.findOne({email: data.email, "profile_id": data.id});

        if (userObj) {
          return res.status(400).json({status: "Error", message: "User already exists"});
        }

        const { email, name } = data;
        const password = generateRandomNumber(14);
        
        const newUser = new Users({
          email,
          name,
          password,
          is_logged_in: false,
          email_confirmed: true
        });

        newUser.save(() => {
          res.status(200).json({ status: "ok", message: 'User signed up' });
        });
      }
    })
  }
  catch(err){
    return res.status(err.statusCode || 400).json({status: "error",message: err.message});
  }
});


module.exports = router;

