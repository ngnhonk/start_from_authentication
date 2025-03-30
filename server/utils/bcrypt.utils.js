const bcrypt = require("bcrypt");
const round = 10;

module.exports.hashPassword = async (plain) => {
  let hashed = bcrypt.hashSync(plain, round);
  return hashed;
};

module.exports.checkPassword = async (plain, hashed) => {
  let result = bcrypt.compareSync(plain, hashed);
  return !!result;
};
