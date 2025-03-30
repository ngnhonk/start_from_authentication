const express = require("express");
const server = express();
const cors = require("cors");
const bodyParser = require("body-parser");
const morgan = require("morgan");
const dotenv = require("dotenv");
const cors = require("cors");
dotenv.config();
const PORT = process.env.PORT || 3000;

server.use(cors());
server.use(bodyParser.json());
server.use(bodyParser.urlencoded({ extended: true }));
server.use(express.static("public"));
server.use(morgan("dev"));

// Define routes
const userRoutes = require("./routes/user.routes");
const authRoutes = require("./routes/auth.routes");

// Use routes
server.use("/api/users", userRoutes);
server.use("/api/auth", authRoutes);

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}: http://localhost:${PORT}`);
});
