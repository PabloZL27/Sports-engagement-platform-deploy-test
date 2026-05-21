const { Pool } = require("pg")

const pool = new Pool({
    connectionString: process.env.COMMUNITY_DB_URL,
    ssl: false
});

module.exports = { pool };