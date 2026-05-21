const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.CARDS_DB_URL,
  ssl: false
});

module.exports = { pool };
