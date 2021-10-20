const jwt = require("jsonwebtoken");
const HTTPError = require("../errorMessage");
const config = require("../config/default");

const authenticate = (req, res, next) => {
  try {
    if (!req.headers.authorization) throw new HTTPError(400, "User not logged in");
    if (!req.headers.authorization.startsWith("Bearer ")) throw new HTTPError(400, "Invalid Token");

    const jwtToken = req.headers.authorization.split(" ")[1];

    const verified = jwt.verify(jwtToken, config.Server.secret);

    if (!verified) throw new HTTPError(400, "Invalid Token");

    req.user = verified;

    next();
  } catch(err) {
    return res.status(err.statusCode || 400).json({ success: false, message: err.message || "User not logged in" });
  }
}

module.exports = authenticate;