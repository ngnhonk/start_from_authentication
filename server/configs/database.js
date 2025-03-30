const knex = require("knex");

const config = {
  development: {
    client: "mysql2",
    connection: {
      host: "localhost",
      database: "chat_server",
      user: "root",
      password: "honk2004",
    },
  },
};

const db = knex(config.development);

module.exports = db;
