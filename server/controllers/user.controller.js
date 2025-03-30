const services = require("../services/user.service");

module.exports.getUser = async (req, res) => {
  try {
    const users = await services.getUser();
    res.status(200).json(users);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Internal server error!", message: error.message });
  }
};
