const jwt = require("jsonwebtoken");
const HTTPError = require("../errorMessage");
const config = require("../config/default");

const authenticate = (req, res, next) => {
  try {
    if (!req.cookies || !req.cookies.token) throw new HTTPError(400, "User not logged in");

    const jwtToken = req.cookies.token;

    const verified = jwt.verify(jwtToken, config.Server.secret);

    if (!verified) throw new HTTPError(400, "Invalid Token");

    req.user = verified;

    next();
  } catch(err) {
    // Clear token cookie
    res.clearCookie("token");
    return res.status(err.statusCode || 400).json({ success: false, message: err.message || "User not logged in" });
  }
}

module.exports = authenticate;