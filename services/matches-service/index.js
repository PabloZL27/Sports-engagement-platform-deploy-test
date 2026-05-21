const express = require("express");
const { Pool } = require("pg");
const { syncMatches } = require("./syncMatches");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 4002;

const pool = new Pool({
  connectionString: process.env.MATCHES_DB_URL
});

const DEMO_MATCH_IDS = (process.env.DEMO_MATCH_IDS || "")
  .split(",")
  .map((s) => parseInt(String(s).trim(), 10))
  .filter((n) => Number.isFinite(n));

function isDemoMatch(matchId) {
  return DEMO_MATCH_IDS.includes(Number(matchId));
}

function normalizeTicks(raw) {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }
  return [];
}

function pickTick(ticks, elapsedMs) {
  if (!ticks.length) return null;
  const e = Math.max(0, elapsedMs);
  let chosen = ticks[0];
  for (const t of ticks) {
    if (t.ms <= e) chosen = t;
    else break;
  }
  return chosen;
}

function mergeDemoIntoRow(viewRow, demoRow) {
  const base = { ...viewRow, demo_eligible: true, demo_active: false };
  if (!demoRow) {
    return { ...viewRow, demo_eligible: false, demo_active: false };
  }

  const ticks = normalizeTicks(demoRow.ticks);
  if (!ticks.length) {
    return { ...base, demo_eligible: true, demo_active: false };
  }

  if (!demoRow.started_at) {
    return base;
  }

  const elapsedMs = Number(demoRow.elapsed_ms);
  const elapsed = Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) : 0;
  const lastMs = ticks[ticks.length - 1].ms ?? 0;
  const tick = pickTick(ticks, Math.min(elapsed, lastMs));
  if (!tick) return base;

  return {
    ...viewRow,
    home_score: tick.home_score,
    away_score: tick.away_score,
    status: tick.status,
    demo_eligible: true,
    demo_active: true,
    demo_clock_label: tick.label
  };
}

app.post("/sync", async (req, res) => {
  try {
    const result = await syncMatches(2025);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Sync failed" });
  }
});

const ENABLE_AUTO_SYNC = process.env.ENABLE_AUTO_SYNC === "true";
const SYNC_INTERVAL_MS = Number(process.env.SYNC_INTERVAL_MS || 15000);

if (ENABLE_AUTO_SYNC) {
  console.log(`Auto sync enabled every ${SYNC_INTERVAL_MS}ms`);

  setInterval(async () => {
    try {
      await syncMatches(2025);
    } catch (err) {
      console.error("Auto sync failed:", err);
    }
  }, SYNC_INTERVAL_MS);
}

app.get("/health", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW() AS now");
    res.json({
      service: "matches-service",
      status: "ok",
      db: "connected",
      time: result.rows[0].now
    });
  } catch (error) {
    res.status(500).json({
      service: "matches-service",
      status: "error",
      db: "disconnected",
      error: error.message
    });
  }
});

app.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT *
      FROM match_view
      ORDER BY start_time
    `);

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

app.post("/:id/demo/play", async (req, res) => {
  const id = req.params.id;
  try {
    if (!isDemoMatch(id)) {
      return res.status(400).json({ error: "Not a demo match" });
    }
    const view = await pool.query("SELECT match_id FROM match_view WHERE match_id = $1", [id]);
    if (view.rows.length === 0) {
      return res.status(404).json({ error: "Match not found" });
    }
    await pool.query(
      `UPDATE match_demo_replay SET started_at = NOW() WHERE match_id = $1`,
      [id]
    );
    const result = await pool.query("SELECT * FROM match_view WHERE match_id = $1", [id]);
    const row = result.rows[0];
    const demoQ = await pool.query(
      `SELECT ticks, started_at,
        CASE WHEN started_at IS NULL THEN 0::float8
        ELSE EXTRACT(EPOCH FROM (NOW() - started_at)) * 1000
        END AS elapsed_ms
       FROM match_demo_replay WHERE match_id = $1`,
      [id]
    );
    res.json(mergeDemoIntoRow(row, demoQ.rows[0] || null));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/:id/demo/reset", async (req, res) => {
  const id = req.params.id;
  try {
    if (!isDemoMatch(id)) {
      return res.status(400).json({ error: "Not a demo match" });
    }
    const view = await pool.query("SELECT match_id FROM match_view WHERE match_id = $1", [id]);
    if (view.rows.length === 0) {
      return res.status(404).json({ error: "Match not found" });
    }
    await pool.query(`UPDATE match_demo_replay SET started_at = NULL WHERE match_id = $1`, [id]);
    const result = await pool.query("SELECT * FROM match_view WHERE match_id = $1", [id]);
    const row = result.rows[0];
    const demoQ = await pool.query(
      `SELECT ticks, started_at,
        CASE WHEN started_at IS NULL THEN 0::float8
        ELSE EXTRACT(EPOCH FROM (NOW() - started_at)) * 1000
        END AS elapsed_ms
       FROM match_demo_replay WHERE match_id = $1`,
      [id]
    );
    res.json(mergeDemoIntoRow(row, demoQ.rows[0] || null));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/:id", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM match_view WHERE match_id = $1", [
      req.params.id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Match not found"
      });
    }

    const row = result.rows[0];
    let merged = row;

    if (isDemoMatch(row.match_id)) {
      const demoQ = await pool.query(
        `SELECT ticks, started_at,
          CASE WHEN started_at IS NULL THEN 0::float8
          ELSE EXTRACT(EPOCH FROM (NOW() - started_at)) * 1000
          END AS elapsed_ms
         FROM match_demo_replay WHERE match_id = $1`,
        [row.match_id]
      );
      merged = mergeDemoIntoRow(row, demoQ.rows[0] || null);
    } else {
      merged = { ...row, demo_eligible: false, demo_active: false };
    }

    res.json(merged);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`matches-service listening on port ${PORT}`);
});