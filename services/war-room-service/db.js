const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.WAR_ROOM_DB_URL,
});

module.exports = { pool };