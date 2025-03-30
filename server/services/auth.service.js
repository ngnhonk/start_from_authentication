const bcrypt = require("bcrypt");
const userServices = require("../services/user.service");
const { hashPassword, checkPassword } = require("../utils/bcrypt.utils");
const {jwtSign} = require('../utils/jwt.utils');

module.exports.register = async (req) => {
  const { email, password } = req.body;
  let hashed = await hashPassword(password);
  await userServices.createUser(email, hashed);
  return;
};

module.exports.login = async (req) => {
  const { email, password } = req.body;
  let user = await userServices.getUserByEmail(email);
  let check = await checkPassword(password, user.hash_password);
  if (check) {
    let token = jwtSign(user);
    return token;
  } else {
    return (token = false);
  }
};
