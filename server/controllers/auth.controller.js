const authServices = require("../services/auth.service");

module.exports.register = async (req, res) => {
  try {
    await authServices.register(req);
    res.status(200).json({ message: "Register successfully!" });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ error: "Internal server error!", message: error.message });
  }
};

module.exports.login = async (req, res) => {
  try {
    let token = await authServices.login(req);
    if (!token) {
      res.status(406).json({ error: "Invalid password!" });
    } else {
      res.status(200).json({ message: "Login succeeded!", token: token });
    }
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ error: "Internal server error!", message: error.message });
  }
};
