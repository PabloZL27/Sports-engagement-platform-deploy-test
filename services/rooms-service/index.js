const express = require("express");
const { Pool } = require("pg");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 4003;

/** Cada cuánto borrar el mensaje más antiguo por partido (ms). Por defecto 2 minutos. */
const CHAT_PRUNE_INTERVAL_MS = Math.max(
  30_000,
  parseInt(process.env.ROOMS_CHAT_PRUNE_INTERVAL_MS || "", 10) || 120_000
);

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseUuidUserId(value) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw || !UUID_RE.test(raw)) return null;
  return raw.toLowerCase();
}

function parseDisplayName(value) {
  if (value == null) return null;
  const s = String(value)
    .replace(/[\r\n\u0000]/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 80);
  return s.length ? s : null;
}

const pool = new Pool({
  connectionString: process.env.ROOMS_DB_URL,
});

async function deleteOldestMessagePerMatchRoom() {
  try {
    const r = await pool.query(`
      DELETE FROM chat_messages m
      WHERE m.id IN (
        SELECT id FROM (
          SELECT m2.id,
            ROW_NUMBER() OVER (
              PARTITION BY c.match_id
              ORDER BY m2.sent_at ASC, m2.id ASC
            ) AS rn
          FROM chat_messages m2
          INNER JOIN chatrooms c ON c.room_id = m2.room_id
        ) oldest
        WHERE oldest.rn = 1
      )
    `);
    if (r.rowCount > 0) {
      console.log(
        "chat prune: eliminado(s)",
        r.rowCount,
        "mensaje(s) más antiguo(s) (uno por partido con chat)"
      );
    }
  } catch (e) {
    console.error("chat prune", e);
  }
}

setInterval(deleteOldestMessagePerMatchRoom, CHAT_PRUNE_INTERVAL_MS);

async function getRoomIdByMatch(matchId) {
  const r = await pool.query(
    "SELECT room_id FROM chatrooms WHERE match_id = $1",
    [matchId]
  );
  return r.rows[0]?.room_id ?? null;
}

async function ensureRoom(matchId, userId) {
  const existing = await getRoomIdByMatch(matchId);
  if (existing != null) return existing;

  try {
    const ins = await pool.query(
      `INSERT INTO chatrooms (match_id, created_by, active_users_count)
       VALUES ($1, $2, 0)
       RETURNING room_id`,
      [matchId, userId]
    );
    return ins.rows[0].room_id;
  } catch (e) {
    if (e.code === "23505") {
      const again = await getRoomIdByMatch(matchId);
      if (again != null) return again;
    }
    throw e;
  }
}

app.get("/health", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW() AS now");
    res.json({
      service: "rooms-service",
      status: "ok",
      db: "connected",
      time: result.rows[0].now,
    });
  } catch (error) {
    res.status(500).json({
      service: "rooms-service",
      status: "error",
      db: "disconnected",
      error: error.message,
    });
  }
});

app.post("/match/:matchId/bootstrap", async (req, res) => {
  const matchId = parseInt(req.params.matchId, 10);
  const userId = parseUuidUserId(req.body?.user_id);
  if (!Number.isFinite(matchId) || userId == null) {
    return res.status(400).json({
      error: "match_id numérico y user_id UUID (Supabase) requeridos",
    });
  }
  try {
    const roomId = await ensureRoom(matchId, userId);
    await pool.query(
      `INSERT INTO chatroom_members (room_id, user_id, status)
       VALUES ($1, $2, 'active')
       ON CONFLICT (room_id, user_id)
       DO UPDATE SET status = EXCLUDED.status`,
      [roomId, userId]
    );
    res.json({ room_id: roomId, match_id: matchId });
  } catch (error) {
    console.error("bootstrap", error);
    res.status(500).json({ error: error.message || "Error en bootstrap" });
  }
});

app.get("/match/:matchId/messages", async (req, res) => {
  const matchId = parseInt(req.params.matchId, 10);
  if (!Number.isFinite(matchId)) {
    return res.status(400).json({ error: "match_id inválido" });
  }
  const limit = Math.min(parseInt(req.query.limit, 10) || 100, 500);
  try {
    const result = await pool.query(
      `SELECT m.id, m.room_id, m.user_id, m.content, m.sent_at, m.display_name
       FROM chat_messages m
       INNER JOIN chatrooms c ON c.room_id = m.room_id
       WHERE c.match_id = $1
       ORDER BY m.sent_at ASC, m.id ASC
       LIMIT $2`,
      [matchId, limit]
    );
    res.json({ messages: result.rows });
  } catch (error) {
    console.error("messages list", error);
    res.status(500).json({ error: error.message || "Error al listar mensajes" });
  }
});

app.post("/match/:matchId/messages", async (req, res) => {
  const matchId = parseInt(req.params.matchId, 10);
  const userId = parseUuidUserId(req.body?.user_id);
  const content = (req.body?.content || "").trim().slice(0, 500);
  const displayName = parseDisplayName(req.body?.display_name);

  if (!Number.isFinite(matchId) || userId == null) {
    return res.status(400).json({
      error: "match_id numérico y user_id UUID (Supabase) requeridos",
    });
  }
  if (!content) {
    return res.status(400).json({ error: "content requerido" });
  }

  try {
    const roomId = await getRoomIdByMatch(matchId);
    if (roomId == null) {
      return res.status(404).json({
        error: "Sala no encontrada. Llama primero a POST .../bootstrap",
      });
    }

    const ins = await pool.query(
      `INSERT INTO chat_messages (room_id, user_id, content, display_name)
       VALUES ($1, $2, $3, $4)
       RETURNING id, room_id, user_id, content, sent_at, display_name`,
      [roomId, userId, content, displayName]
    );
    res.status(201).json({ message: ins.rows[0] });
  } catch (error) {
    console.error("messages insert", error);
    res.status(500).json({ error: error.message || "Error al enviar mensaje" });
  }
});

app.listen(PORT, () => {
  console.log(`rooms-service listening on port ${PORT}`);
  console.log(
    `chat prune: cada ${CHAT_PRUNE_INTERVAL_MS / 1000}s se elimina el mensaje más antiguo por partido`
  );
});