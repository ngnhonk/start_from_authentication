const knex = require("knex");

const config = {
  development: {
    client: "mysql2",
    connection: {
      host: "localhost",
      database: "your_db",
      user: "your_user",
      password: "your_password",
    },
  },
};

const db = knex(config.development);

module.exports = db;
