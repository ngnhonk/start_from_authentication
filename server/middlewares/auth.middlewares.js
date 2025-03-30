const { registerSchema } = require("../utils/validate.utils");
const userServices = require("../services/user.service");
const { jwtDecode } = require("../utils/jwt.utils");

module.exports.authenticate = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res
        .status(401)
        .json({ error: "Unauthorized - No token provided" });
    }

    const decoded = jwtDecode(token);

    if (!decoded) {
      return res.status(403).json({ error: "Forbidden - Invalid token" });
    }
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(500).json({
      error: "Authentication failed",
      message: error.message,
    });
  }
};

module.exports.validateRegister = async (req, res, next) => {
  let { email, password } = req.body;
  let { error } = registerSchema.validate({ email, password });
  try {
    if (error) {
      res.status(406).json({ error: "Invalid email or password!" });
    } else {
      next();
    }
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ error: "Internal server error!", message: error.message });
  }
};

module.exports.checkEmailRegister = async (req, res, next) => {
  let { email } = req.body;
  let emailExist = await userServices.emailExist(email);

  if (emailExist) {
    res.status(409).json({ error: "Email already exist!" });
  } else {
    next();
  }
};

module.exports.checkEmailLogin = async (req, res, next) => {
  let { email } = req.body;
  let emailExist = await userServices.emailExist(email);
  if (!emailExist) {
    res.status(409).json({ error: "Invalid email!" });
  } else {
    next();
  }
};
