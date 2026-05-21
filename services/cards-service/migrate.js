const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.CARDS_DB_URL
});

async function migrate() {
  try {
    // Table: athletes (synced from ESPN API)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS athletes (
        athlete_id SERIAL PRIMARY KEY,
        espn_athlete_id INT UNIQUE NOT NULL,
        display_name VARCHAR(50) NOT NULL,
        weight DOUBLE PRECISION,
        height DOUBLE PRECISION,
        age INT,
        debut_year INT,
        position VARCHAR(20),
        jersey_num INT,
        headshot_url TEXT,
        athlete_status BOOLEAN DEFAULT TRUE,
        statistics_id INT
      );
    `);

    // Table: athlete_statistics
    await pool.query(`
      CREATE TABLE IF NOT EXISTS athlete_statistics (
        id SERIAL PRIMARY KEY,
        athlete_id INT NOT NULL REFERENCES athletes(athlete_id) ON DELETE CASCADE,
        espn_statistics_id INT,
        passes DOUBLE PRECISION DEFAULT 0,
        p_yards INT DEFAULT 0,
        r_yards INT DEFAULT 0,
        interceptions INT DEFAULT 0,
        touchdowns INT DEFAULT 0,
        games_played INT DEFAULT 0
      );
    `);

    // Table: cards (one per athlete, unlocked per user)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS cards (
        card_id SERIAL PRIMARY KEY,
        athlete_id INT NOT NULL REFERENCES athletes(athlete_id) ON DELETE CASCADE,
        card_image VARCHAR(100),
        rarity VARCHAR(20) NOT NULL DEFAULT 'common'
      );
    `);

    // Table: user_cards (tracks which cards each user has unlocked)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_cards (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL,
        card_id INT NOT NULL REFERENCES cards(card_id) ON DELETE CASCADE,
        unlocked_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, card_id)
      );
    `);

    // Table: user_packs (tracks how many packs each user has)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_packs (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL UNIQUE,
        packs_remaining INT DEFAULT 12
      );
    `);

    // Table: pack_openings (time-gated pack opening per user)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS pack_openings (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'OPENING',
        started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        ready_at TIMESTAMPTZ NOT NULL,
        claimed_at TIMESTAMPTZ
      );
    `);

    // Enforce max 1 active opening per user
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS pack_openings_one_active_per_user
      ON pack_openings (user_id)
      WHERE status = 'OPENING';
    `);

    // URLs de ESPN superan 255 caracteres; evita headshots truncados en DB
    await pool.query(`
      ALTER TABLE athletes
      ALTER COLUMN headshot_url TYPE TEXT USING headshot_url::TEXT;
    `);

    // Table: sync log for ESPN data
    await pool.query(`
      CREATE TABLE IF NOT EXISTS cards_sync_log (
        id SERIAL PRIMARY KEY,
        source VARCHAR(100) NOT NULL,
        sync_date TIMESTAMP NOT NULL DEFAULT NOW(),
        athletes_synced INT DEFAULT 0,
        status VARCHAR(50) NOT NULL
      );
    `);

    console.log("Migration completed successfully");
  } catch (error) {
    console.error("Migration failed:", error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
