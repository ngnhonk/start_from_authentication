const db = require("../configs/database");

module.exports.getUser = async () => {
  let users = await db("users").select("*");
  return users;
};

module.exports.deleteUser = async (id) => {
  await db("users").where({ id }).del();
  return;
};

module.exports.createUser = async (email, hash_password) => {
  let provider = "local";
  let [id] = await db("users").insert({ email, hash_password, provider });
  return id;
};

module.exports.emailExist = async (email) => {
  let exists = await db("users").where({ email }).first();
  return !!exists;
};

module.exports.getUserByEmail = async (email) => {
  let [user] = await db("users").where({ email }).select("*");
  return user;
};
