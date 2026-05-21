const express = require("express");
const { Pool } = require("pg");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 4009;

const pool = new Pool({
  connectionString: process.env.CARDS_DB_URL
});

function pickUnlockedCards(lockedRows) {
  // Separate by rarity
  const commons = lockedRows.filter((c) => c.rarity === "common");
  const rares = lockedRows.filter((c) => c.rarity === "rare");
  const elites = lockedRows.filter((c) => c.rarity === "elite");
  const titans = lockedRows.filter((c) => c.rarity === "titan");

  const unlockedCards = [];

  // Pick up to 3 common cards
  const shuffledCommons = commons.sort(() => Math.random() - 0.5);
  for (let i = 0; i < Math.min(3, shuffledCommons.length); i++) {
    unlockedCards.push(shuffledCommons[i]);
  }

  // Pick 1 rare or elite card
  const rarePool = [...rares, ...elites].sort(() => Math.random() - 0.5);
  if (rarePool.length > 0) {
    unlockedCards.push(rarePool[0]);
  }

  // 20% chance for a titan card
  if (Math.random() < 0.2 && titans.length > 0) {
    const titanCard = titans[Math.floor(Math.random() * titans.length)];
    unlockedCards.push(titanCard);
  }

  return unlockedCards;
}

async function getPacksRemaining(client, userId) {
  const packResult = await client.query(
    `SELECT packs_remaining FROM user_packs WHERE user_id = $1`,
    [userId]
  );

  return packResult.rows.length > 0 ? packResult.rows[0].packs_remaining : 12;
}

// ─── Health Check ────────────────────────────────────────────
app.get("/health", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW() AS now");
    res.json({
      service: "cards-service",
      status: "ok",
      db: "connected",
      time: result.rows[0].now
    });
  } catch (error) {
    res.status(500).json({
      service: "cards-service",
      status: "error",
      db: "disconnected",
      error: error.message
    });
  }
});

// ─── GET /roster ─────────────────────────────────────────────
// Returns all cards with athlete info. If user_id is provided
// as a query param, includes whether each card is unlocked.
app.get("/roster", async (req, res) => {
  try {
    const userId = req.query.user_id ? req.query.user_id : null;

    let query;
    let params = [];

    if (userId) {
      query = `
        SELECT
          c.card_id,
          c.card_image,
          c.rarity,
          a.athlete_id,
          a.espn_athlete_id,
          a.display_name,
          a.position,
          a.jersey_num,
          a.headshot_url,
          a.age,
          a.weight,
          a.height,
          CASE WHEN uc.id IS NOT NULL THEN TRUE ELSE FALSE END AS unlocked
        FROM cards c
        JOIN athletes a ON c.athlete_id = a.athlete_id
        LEFT JOIN user_cards uc ON uc.card_id = c.card_id AND uc.user_id = $1
        WHERE a.athlete_status = TRUE
        ORDER BY a.display_name
      `;
      params = [userId];
    } else {
      query = `
        SELECT
          c.card_id,
          c.card_image,
          c.rarity,
          a.athlete_id,
          a.espn_athlete_id,
          a.display_name,
          a.position,
          a.jersey_num,
          a.headshot_url,
          a.age,
          a.weight,
          a.height,
          FALSE AS unlocked
        FROM cards c
        JOIN athletes a ON c.athlete_id = a.athlete_id
        WHERE a.athlete_status = TRUE
        ORDER BY a.display_name
      `;
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── GET /roster/:athleteId ──────────────────────────────────
// Returns a single athlete's card with full statistics.
app.get("/roster/:athleteId", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        c.card_id,
        c.card_image,
        c.rarity,
        a.athlete_id,
        a.espn_athlete_id,
        a.display_name,
        a.position,
        a.jersey_num,
        a.headshot_url,
        a.age,
        a.weight,
        a.height,
        a.debut_year,
        s.passes,
        s.p_yards,
        s.r_yards,
        s.interceptions,
        s.touchdowns,
        s.games_played
      FROM cards c
      JOIN athletes a ON c.athlete_id = a.athlete_id
      LEFT JOIN athlete_statistics s ON s.athlete_id = a.athlete_id
      WHERE a.athlete_id = $1`,
      [req.params.athleteId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Athlete not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── GET /pack/status?user_id= ────────────────────────────────
// Returns current opening state for a user (if any)
app.get("/pack/status", async (req, res) => {
  try {
    const userId = req.query.user_id || null;
    if (!userId) return res.status(400).json({ error: "user_id is required" });

    const opening = await pool.query(
      `SELECT id, user_id, status, started_at, ready_at, claimed_at
       FROM pack_openings
       WHERE user_id = $1 AND status = 'OPENING'
       ORDER BY started_at DESC
       LIMIT 1`,
      [userId]
    );

    if (opening.rows.length === 0) {
      return res.json({ status: "NONE" });
    }

    const row = opening.rows[0];
    const readyAtMs = new Date(row.ready_at).getTime();
    const nowMs = Date.now();
    const secondsRemaining = Math.max(0, Math.ceil((readyAtMs - nowMs) / 1000));

    res.json({
      status: secondsRemaining <= 0 ? "READY" : "OPENING",
      ready_at: row.ready_at,
      seconds_remaining: secondsRemaining,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── POST /pack/start ─────────────────────────────────────────
// Starts a timed pack opening (24h). Only one active at a time.
app.post("/pack/start", async (req, res) => {
  const client = await pool.connect();
  try {
    const { user_id } = req.body;
    if (!user_id) return res.status(400).json({ error: "user_id is required" });
    const userId = user_id;

    await client.query("BEGIN");

    // if already opening, return current state
    const existing = await client.query(
      `SELECT id, ready_at FROM pack_openings WHERE user_id = $1 AND status = 'OPENING' ORDER BY started_at DESC LIMIT 1`,
      [userId]
    );
    if (existing.rows.length > 0) {
      await client.query("COMMIT");
      const readyAt = existing.rows[0].ready_at;
      const secondsRemaining = Math.max(
        0,
        Math.ceil((new Date(readyAt).getTime() - Date.now()) / 1000)
      );
      return res.json({
        status: secondsRemaining <= 0 ? "READY" : "OPENING",
        ready_at: readyAt,
        seconds_remaining: secondsRemaining,
      });
    }

    const packsRemaining = await getPacksRemaining(client, userId);
    if (packsRemaining <= 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "No packs remaining" });
    }

    // reserve/decrement immediately
    await client.query(
      `INSERT INTO user_packs (user_id, packs_remaining)
       VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET
         packs_remaining = user_packs.packs_remaining - 1`,
      [userId, 11]
    );

    const insert = await client.query(
      `INSERT INTO pack_openings (user_id, status, ready_at)
       VALUES ($1, 'OPENING', NOW() + INTERVAL '10 seconds')
       RETURNING ready_at`,
      [userId]
    );

    await client.query("COMMIT");

    res.json({
      status: "OPENING",
      ready_at: insert.rows[0].ready_at,
      seconds_remaining: 24 * 60 * 60,
    });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// ─── POST /pack/claim ─────────────────────────────────────────
// Claims a ready pack: unlocks cards and marks the opening claimed.
app.post("/pack/claim", async (req, res) => {
  const client = await pool.connect();
  try {
    const { user_id } = req.body;
    if (!user_id) return res.status(400).json({ error: "user_id is required" });
    const userId = user_id;

    await client.query("BEGIN");

    const opening = await client.query(
      `SELECT id, ready_at FROM pack_openings
       WHERE user_id = $1 AND status = 'OPENING'
       ORDER BY started_at DESC
       LIMIT 1
       FOR UPDATE`,
      [userId]
    );
    if (opening.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "No pack opening in progress" });
    }

    const readyAt = new Date(opening.rows[0].ready_at).getTime();
    if (Date.now() < readyAt) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Pack not ready yet" });
    }

    // Get cards the user doesn't own yet
    const lockedCards = await client.query(
      `SELECT c.card_id, c.rarity, a.display_name, a.position, a.jersey_num
       FROM cards c
       JOIN athletes a ON c.athlete_id = a.athlete_id
       WHERE c.card_id NOT IN (
         SELECT card_id FROM user_cards WHERE user_id = $1
       )
       AND a.athlete_status = TRUE`,
      [userId]
    );

    if (lockedCards.rows.length === 0) {
      await client.query(
        `UPDATE pack_openings SET status = 'CLAIMED', claimed_at = NOW() WHERE id = $1`,
        [opening.rows[0].id]
      );
      await client.query("COMMIT");
      return res.status(400).json({ error: "All cards already unlocked" });
    }

    const unlockedCards = pickUnlockedCards(lockedCards.rows);

    for (const card of unlockedCards) {
      await client.query(
        `INSERT INTO user_cards (user_id, card_id)
         VALUES ($1, $2)
         ON CONFLICT (user_id, card_id) DO NOTHING`,
        [userId, card.card_id]
      );
    }

    await client.query(
      `UPDATE pack_openings
       SET status = 'CLAIMED', claimed_at = NOW()
       WHERE id = $1`,
      [opening.rows[0].id]
    );

    const packsRemaining = await getPacksRemaining(client, userId);

    await client.query("COMMIT");

    res.json({
      cards_unlocked: unlockedCards,
      packs_remaining: packsRemaining,
    });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// ─── POST /pack/open ─────────────────────────────────────────
// Opens a card pack for a user. Unlocks random cards they
// don't already own: 3 common + 1 rare/elite + chance for titan.
app.post("/pack/open", async (req, res) => {
  try {
    return res
      .status(410)
      .json({ error: "Deprecated. Use POST /pack/start and POST /pack/claim." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── GET /collection/:userId ─────────────────────────────────
// Returns collection stats for a user.
app.get("/collection/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;

    const totalCards = await pool.query(
      `SELECT COUNT(*) AS total FROM cards c
       JOIN athletes a ON c.athlete_id = a.athlete_id
       WHERE a.athlete_status = TRUE`
    );

    const unlockedCards = await pool.query(
      `SELECT COUNT(*) AS unlocked FROM user_cards WHERE user_id = $1`,
      [userId]
    );

    const packsResult = await pool.query(
      `SELECT packs_remaining FROM user_packs WHERE user_id = $1`,
      [userId]
    );

    const total = parseInt(totalCards.rows[0].total);
    const unlocked = parseInt(unlockedCards.rows[0].unlocked);
    const packs = packsResult.rows.length > 0
      ? packsResult.rows[0].packs_remaining
      : 12;

    res.json({
      total_cards: total,
      unlocked_cards: unlocked,
      progress_percentage: total > 0 ? Math.round((unlocked / total) * 100) : 0,
      packs_remaining: packs
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`cards-service listening on port ${PORT}`);
});
