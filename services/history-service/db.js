const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.HISTORY_DB_URL,
});

module.exports = { pool };
