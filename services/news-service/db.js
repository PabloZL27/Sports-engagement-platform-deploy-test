const { Pool } = require("pg");

const NEWS_DB_URL = process.env.NEWS_DB_URL;
const NEWS_DB_MANAGE_SCHEMA = process.env.NEWS_DB_MANAGE_SCHEMA === "true";

let pool;
let schemaPromise;

function getPool() {
  if (!NEWS_DB_URL) {
    throw new Error("Missing NEWS_DB_URL environment variable.");
  }

  if (!pool) {
    pool = new Pool({
      connectionString: NEWS_DB_URL,
    });
  }

  return pool;
}

async function ensureSchema() {
  if (!NEWS_DB_MANAGE_SCHEMA) {
    return;
  }

  if (!schemaPromise) {
    schemaPromise = (async () => {
      const client = await getPool().connect();

      try {
        await client.query(`
          CREATE TABLE IF NOT EXISTS source (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL
          );
        `);

        await client.query(`
          CREATE UNIQUE INDEX IF NOT EXISTS source_name_key
          ON source (name);
        `);

        await client.query(`
          CREATE TABLE IF NOT EXISTS article (
            article_id SERIAL PRIMARY KEY,
            source_id INTEGER NOT NULL REFERENCES source(id),
            url TEXT NOT NULL,
            title TEXT NOT NULL DEFAULT '',
            description TEXT NOT NULL DEFAULT '',
            author TEXT NOT NULL DEFAULT '',
            url_to_image TEXT NOT NULL DEFAULT '',
            content TEXT NOT NULL DEFAULT '',
            published_at TIMESTAMPTZ NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );
        `);

        await client.query(`
          CREATE UNIQUE INDEX IF NOT EXISTS article_url_key
          ON article (url);
        `);

        await client.query(`
          CREATE INDEX IF NOT EXISTS article_source_id_idx
          ON article (source_id);
        `);
      } finally {
        client.release();
      }
    })().catch((error) => {
      schemaPromise = null;
      throw error;
    });
  }

  return schemaPromise;
}

module.exports = { ensureSchema, getPool, NEWS_DB_MANAGE_SCHEMA, NEWS_DB_URL };
