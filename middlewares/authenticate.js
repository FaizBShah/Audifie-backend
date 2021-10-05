const jwt = require("jwt-simple");
const HTTPError = require("../errorMessage");
const Users = require("../model/user");
const config = require("../config/default");

const authenticate = (req, res, next) => {
  try {
    if (!req.headers.authorization) throw new HTTPError(400, "User not logged in");
    if (!req.headers.authorization.startsWith("Bearer ")) throw new HTTPError(400, "Invalid Token");

    const jwtToken = req.headers.authorization.slice(7);
    const { email, expires_in } = jwt.decode(jwtToken, config.Server.secret);

    if (!email || !expires_in) throw new HTTPError(400, "Invalid Token");

    const user = Users.findOne({ email });
    if (!user) throw new HTTPError(400, "User doesn't exist");

    if (expires_in >= Date.now()) throw new HTTPError(400, "Token expired");

    next();
  } catch(err) {
    return res.status(err.statusCode || 400).json({ status: "error", message: err.message || "User not logged in" });
  }
}

module.exports = authenticate;