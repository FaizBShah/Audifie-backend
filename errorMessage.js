const HTTPError = function HTTPError(statusCode, message) {
  const error = {
    message,
  };
  error.statusCode = statusCode;
  return error;
};

module.exports = HTTPError;
