const express = require("express");
const { Pool } = require("pg");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 4003;

/** Antigüedad mínima de un mensaje antes de borrarlo (ms). Por defecto 30 minutos. */
const CHAT_MESSAGE_MAX_AGE_MS = Math.max(
  60_000,
  parseInt(process.env.ROOMS_CHAT_MESSAGE_MAX_AGE_MS || "", 10) ||
    parseInt(process.env.ROOMS_CHAT_PRUNE_INTERVAL_MS || "", 10) ||
    1_800_000,
);

/** Cada cuánto ejecutar la limpieza (ms). Por defecto 1 minuto. */
const CHAT_PRUNE_CHECK_INTERVAL_MS = Math.max(
  30_000,
  parseInt(process.env.ROOMS_CHAT_PRUNE_CHECK_INTERVAL_MS || "", 10) || 60_000,
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

function parseAvatarUrl(value) {
  if (value == null) return null;
  const s = String(value).trim().slice(0, 500);
  if (!s.startsWith("http://") && !s.startsWith("https://")) return null;
  return s;
}

async function ensureChatSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS chat_participants (
      room_id INTEGER NOT NULL,
      user_id TEXT NOT NULL,
      display_name VARCHAR(80),
      last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (room_id, user_id)
    )
  `);

  await pool.query(`
    INSERT INTO chat_participants (room_id, user_id, display_name, last_message_at)
    SELECT
      m.room_id,
      m.user_id,
      (
        SELECT m2.display_name
        FROM chat_messages m2
        WHERE m2.room_id = m.room_id
          AND m2.user_id = m.user_id
          AND m2.display_name IS NOT NULL
          AND TRIM(m2.display_name) <> ''
        ORDER BY m2.sent_at DESC, m2.id DESC
        LIMIT 1
      ) AS display_name,
      MAX(m.sent_at) AS last_message_at
    FROM chat_messages m
    GROUP BY m.room_id, m.user_id
    ON CONFLICT (room_id, user_id) DO NOTHING
  `);

  await pool.query(`
    ALTER TABLE chat_messages
    ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500)
  `);
}

async function upsertChatParticipant(roomId, userId, displayName) {
  await pool.query(
    `INSERT INTO chat_participants (room_id, user_id, display_name, last_message_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (room_id, user_id)
     DO UPDATE SET
       last_message_at = NOW(),
       display_name = COALESCE(EXCLUDED.display_name, chat_participants.display_name)`,
    [roomId, userId, displayName]
  );
}

async function deleteExpiredChatMessages() {
  try {
    const r = await pool.query(
      `
      DELETE FROM chat_messages m
      WHERE m.sent_at < NOW() - ($1::float8 * INTERVAL '1 millisecond')
      `,
      [CHAT_MESSAGE_MAX_AGE_MS],
    );
    if (r.rowCount > 0) {
      console.log(
        "chat prune: eliminado(s)",
        r.rowCount,
        `mensaje(s) con más de ${CHAT_MESSAGE_MAX_AGE_MS / 1000}s de antigüedad`,
      );
    }
  } catch (e) {
    console.error("chat prune", e);
  }
}

setInterval(deleteExpiredChatMessages, CHAT_PRUNE_CHECK_INTERVAL_MS);

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
      `SELECT m.id, m.room_id, m.user_id, m.content, m.sent_at, m.display_name, m.avatar_url
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
  const avatarUrl = parseAvatarUrl(req.body?.avatar_url);

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
      `INSERT INTO chat_messages (room_id, user_id, content, display_name, avatar_url)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, room_id, user_id, content, sent_at, display_name, avatar_url`,
      [roomId, userId, content, displayName, avatarUrl]
    );
    await upsertChatParticipant(roomId, userId, displayName);
    res.status(201).json({ message: ins.rows[0] });
  } catch (error) {
    console.error("messages insert", error);
    res.status(500).json({ error: error.message || "Error al enviar mensaje" });
  }
});

app.get("/match/:matchId/participants", async (req, res) => {
  const matchId = parseInt(req.params.matchId, 10);
  if (!Number.isFinite(matchId)) {
    return res.status(400).json({ error: "match_id inválido" });
  }

  try {
    const result = await pool.query(
      `SELECT p.user_id, p.display_name, p.last_message_at
       FROM chat_participants p
       INNER JOIN chatrooms c ON c.room_id = p.room_id
       WHERE c.match_id = $1
       ORDER BY p.last_message_at DESC`,
      [matchId]
    );
    res.json({ participants: result.rows });
  } catch (error) {
    console.error("participants list", error);
    res.status(500).json({
      error: error.message || "Error al listar participantes",
    });
  }
});

app.listen(PORT, async () => {
  try {
    await ensureChatSchema();
    console.log("chat schema ready");
  } catch (e) {
    console.error("chat schema init failed", e);
  }
  console.log(`rooms-service listening on port ${PORT}`);
  console.log(
    `chat prune: cada ${CHAT_PRUNE_CHECK_INTERVAL_MS / 1000}s se eliminan mensajes con más de ${CHAT_MESSAGE_MAX_AGE_MS / 1000}s`,
  );
});