const jwt = require("jsonwebtoken");

module.exports.jwtSign = (user) => {
  return jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, {
    expiresIn: "60m",
  });
};

module.exports.jwtDecode = (token) => {
  return jwt.decode(token, process.env.JWT_SECRET);
};
