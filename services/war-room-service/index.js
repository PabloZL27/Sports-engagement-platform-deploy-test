const http = require("http");
const express = require("express");
const { WebSocketServer } = require("ws");
const crypto = require("crypto");
const { pool } = require("./db");
const { resolveAccountIdFromRequest } = require("./profile");

const app = express();
app.use(express.json());

const PORT = Number.parseInt(process.env.PORT || "4014", 10);
const CARDS_SERVICE_URL =
  process.env.CARDS_SERVICE_URL || "http://icarus-cards:4009";

// ─── Helpers ───────────────────────────────────────────────────────────────

function asyncRoute(handler) {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (error) {
      const status =
        error.status >= 400 && error.status < 600 ? error.status : 500;
      if (status >= 500) console.error("war-room-service error:", error);
      const message =
        status >= 500
          ? "Internal Server Error"
          : error.message || "Request failed";
      res.status(status).json({ status: "error", error: message });
    }
  };
}

function generateInviteCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i += 1) {
    out += alphabet[crypto.randomInt(0, alphabet.length)];
  }
  return out;
}

// ─── WebSocket registry ────────────────────────────────────────────────────

const socketsByMatch = new Map();

function removeSocket(socket) {
  if (!socket._warRoomSubscriptions?.length) return;
  for (const { matchId } of socket._warRoomSubscriptions) {
    const set = socketsByMatch.get(matchId);
    if (!set) continue;
    set.delete(socket);
    if (set.size === 0) socketsByMatch.delete(matchId);
  }
  socket._warRoomSubscriptions = [];
}

function addSocket(socket, matchId) {
  if (!socketsByMatch.has(matchId)) socketsByMatch.set(matchId, new Set());
  socketsByMatch.get(matchId).add(socket);
  if (!socket._warRoomSubscriptions) {
    socket._warRoomSubscriptions = [];
    socket.once("close", () => removeSocket(socket));
    socket.once("error", () => removeSocket(socket));
  }
  socket._warRoomSubscriptions.push({ matchId });
}

function broadcastMatch(matchId, payload, exceptSocket = null) {
  const set = socketsByMatch.get(matchId);
  if (!set) return;
  const message = JSON.stringify(payload);
  for (const ws of set) {
    if (ws === exceptSocket) continue;
    if (ws.readyState === ws.OPEN) ws.send(message);
  }
}

// ─── Cards / game initialization ───────────────────────────────────────────

async function fetchRoster() {
  const resp = await fetch(`${CARDS_SERVICE_URL}/roster`);
  if (!resp.ok)
    throw new Error(`cards-service returned ${resp.status}`);
  return resp.json();
}

function buildTieredRoster(roster) {
  const commons = roster
    .filter((c) => c.rarity === "common")
    .sort((a, b) => a.card_id - b.card_id);
  const half = Math.floor(commons.length / 2);
  const tier1Ids = new Set(commons.slice(0, half).map((c) => c.card_id));

  return roster.map((card) => {
    let tier;
    if (card.rarity === "titan") tier = 5;
    else if (card.rarity === "elite") tier = 4;
    else if (card.rarity === "rare") tier = 3;
    else tier = tier1Ids.has(card.card_id) ? 1 : 2;

    return {
      cardId: card.card_id,
      displayName: card.display_name || "Unknown",
      position: card.position || "N/A",
      headshotUrl: card.headshot_url || null,
      tier,
    };
  });
}

async function initializeGame(matchId) {
  const roster = await fetchRoster();
  const tieredRoster = buildTieredRoster(roster);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Guard: only start once
    const check = await client.query(
      `SELECT status FROM war_matches WHERE match_id = $1::uuid FOR UPDATE;`,
      [matchId],
    );
    if (!check.rows[0] || check.rows[0].status !== "LOBBY") {
      await client.query("COMMIT");
      return;
    }

    // Insert full card pool for this match
    for (const card of tieredRoster) {
      await client.query(
        `INSERT INTO match_card_pool
           (match_id, card_id, display_name, position, headshot_url, tier)
         VALUES ($1::uuid, $2, $3, $4, $5, $6)
         ON CONFLICT (match_id, card_id) DO NOTHING;`,
        [
          matchId,
          card.cardId,
          card.displayName,
          card.position,
          card.headshotUrl,
          card.tier,
        ],
      );
    }

    // Get player seats
    const seatsResult = await client.query(
      `SELECT seat FROM war_match_players
       WHERE match_id = $1::uuid ORDER BY seat ASC;`,
      [matchId],
    );
    const seats = seatsResult.rows.map((r) => r.seat);

    // Deal 1 tier-1 card to each player
    const tier1Pool = tieredRoster
      .filter((c) => c.tier === 1)
      .sort(() => Math.random() - 0.5);

    for (let i = 0; i < seats.length && i < tier1Pool.length; i++) {
      const card = tier1Pool[i];
      const seat = seats[i];

      await client.query(
        `UPDATE match_card_pool SET taken_by_seat = $1
         WHERE match_id = $2::uuid AND card_id = $3;`,
        [seat, matchId, card.cardId],
      );

      const poolRow = await client.query(
        `SELECT id FROM match_card_pool
         WHERE match_id = $1::uuid AND card_id = $2 LIMIT 1;`,
        [matchId, card.cardId],
      );

      await client.query(
        `INSERT INTO player_hand_cards (match_id, seat, pool_id)
         VALUES ($1::uuid, $2, $3);`,
        [matchId, seat, poolRow.rows[0].id],
      );
    }

    // Transition to PLAYING
    await client.query(
      `UPDATE war_matches
       SET status = 'PLAYING',
           current_round = 1,
           current_global_turn = 1,
           active_seat = 1
       WHERE match_id = $1::uuid;`,
      [matchId],
    );

    await client.query("COMMIT");

    broadcastMatch(matchId, { type: "war_room_event", name: "game_started" });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

// ─── REST endpoints ────────────────────────────────────────────────────────

app.get(
  "/health",
  asyncRoute(async (_req, res) => {
    const result = await pool.query("SELECT NOW() AS now");
    res.json({
      service: "war-room-service",
      status: "ok",
      db: "connected",
      time: result.rows[0].now,
    });
  }),
);

// POST /matches
app.post(
  "/matches",
  asyncRoute(async (_req, res) => {
    const { accountId } = await resolveAccountIdFromRequest(_req);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      let inviteCode = generateInviteCode();
      for (let attempt = 0; attempt < 8; attempt += 1) {
        const clash = await client.query(
          "SELECT 1 FROM war_matches WHERE invite_code = $1 LIMIT 1;",
          [inviteCode],
        );
        if (clash.rowCount === 0) break;
        inviteCode = generateInviteCode();
      }

      const inserted = await client.query(
        `INSERT INTO war_matches (invite_code, status, current_round, current_global_turn)
         VALUES ($1, 'LOBBY', 0, 0)
         RETURNING match_id          AS "matchId",
                   invite_code       AS "inviteCode",
                   status,
                   current_round     AS "currentRound",
                   current_global_turn AS "currentGlobalTurn";`,
        [inviteCode],
      );

      const match = inserted.rows[0];

      await client.query(
        `INSERT INTO war_match_players (match_id, seat, account_id, titans_cash)
         VALUES ($1, 1, $2, 0);`,
        [match.matchId, accountId],
      );

      await client.query("COMMIT");
      res.status(201).json({ ...match, seat: 1 });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }),
);

// POST /matches/join/:inviteCode
app.post(
  "/matches/join/:inviteCode",
  asyncRoute(async (req, res) => {
    const { accountId } = await resolveAccountIdFromRequest(req);
    const inviteCode = String(req.params.inviteCode || "").trim();

    if (!inviteCode || inviteCode.length > 16) {
      res.status(400).json({ status: "error", error: "Invalid inviteCode" });
      return;
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const matchResult = await client.query(
        `SELECT match_id          AS "matchId",
                invite_code       AS "inviteCode",
                status,
                current_round     AS "currentRound",
                current_global_turn AS "currentGlobalTurn"
         FROM war_matches WHERE invite_code = $1 LIMIT 1;`,
        [inviteCode],
      );

      if (matchResult.rowCount === 0) {
        await client.query("ROLLBACK");
        res.status(404).json({ status: "error", error: "Match not found" });
        return;
      }

      const matchRow = matchResult.rows[0];

      const existingSeat = await client.query(
        `SELECT seat FROM war_match_players
         WHERE match_id = $1 AND account_id = $2 LIMIT 1;`,
        [matchRow.matchId, accountId],
      );

      if (existingSeat.rowCount > 0) {
        await client.query("COMMIT");
        res.json({
          ...matchRow,
          seat: existingSeat.rows[0].seat,
          rejoined: true,
        });
        return;
      }

      const countResult = await client.query(
        `SELECT COUNT(*)::int AS c FROM war_match_players WHERE match_id = $1;`,
        [matchRow.matchId],
      );

      const seated = countResult.rows[0].c;

      if (seated >= 3) {
        await client.query("ROLLBACK");
        res.status(409).json({ status: "error", error: "Match is full" });
        return;
      }

      const nextSeat = seated + 1;

      await client.query(
        `INSERT INTO war_match_players (match_id, seat, account_id, titans_cash)
         VALUES ($1, $2, $3, 0);`,
        [matchRow.matchId, nextSeat, accountId],
      );

      await client.query("COMMIT");

      broadcastMatch(matchRow.matchId, {
        type: "war_room_event",
        name: "player_joined",
        seat: nextSeat,
      });

      res.status(200).json({ ...matchRow, seat: nextSeat });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }),
);

// GET /matches/:matchId
app.get(
  "/matches/:matchId",
  asyncRoute(async (req, res) => {
    const { accountId } = await resolveAccountIdFromRequest(req);
    const matchId = String(req.params.matchId || "").trim();

    if (!matchId) {
      res.status(400).json({ status: "error", error: "Invalid matchId" });
      return;
    }

    const participant = await pool.query(
      `SELECT seat,
              titans_cash   AS "titansCash",
              agenda_pick_1 AS "agendaPick1"
       FROM war_match_players
       WHERE match_id = $1::uuid AND account_id = $2
       LIMIT 1;`,
      [matchId, accountId],
    );

    if (participant.rowCount === 0) {
      res.status(403).json({ status: "error", error: "Forbidden" });
      return;
    }

    const matchResult = await pool.query(
      `SELECT match_id            AS "matchId",
              invite_code         AS "inviteCode",
              status,
              current_round       AS "currentRound",
              current_global_turn AS "currentGlobalTurn",
              active_seat         AS "activeSeat"
       FROM war_matches
       WHERE match_id = $1::uuid
       LIMIT 1;`,
      [matchId],
    );

    if (matchResult.rowCount === 0) {
      res.status(404).json({ status: "error", error: "Match not found" });
      return;
    }

    const players = await pool.query(
      `SELECT seat,
              titans_cash AS "titansCash",
              (agenda_pick_1 IS NOT NULL) AS "agendaReady"
       FROM war_match_players
       WHERE match_id = $1::uuid
       ORDER BY seat ASC;`,
      [matchId],
    );

    const p = participant.rows[0];

    res.json({
      ...matchResult.rows[0],
      you: {
        seat: p.seat,
        titansCash: p.titansCash,
        agendaSelected: p.agendaPick1 !== null,
      },
      players: players.rows,
    });
  }),
);

// GET /agendas
app.get(
  "/agendas",
  asyncRoute(async (req, res) => {
    await resolveAccountIdFromRequest(req);
    const result = await pool.query(
      `SELECT agenda_id    AS "agendaId",
              name,
              description,
              bonus_points AS "bonusPoints"
       FROM agendas
       ORDER BY random()
       LIMIT 4;`,
    );
    res.json({ agendas: result.rows });
  }),
);

// POST /matches/:matchId/agendas
app.post(
  "/matches/:matchId/agendas",
  asyncRoute(async (req, res) => {
    const { accountId } = await resolveAccountIdFromRequest(req);
    const matchId = String(req.params.matchId || "").trim();
    const { agendaId1, agendaId2 } = req.body;

    if (!agendaId1 || !agendaId2 || agendaId1 === agendaId2) {
      res.status(400).json({
        status: "error",
        error: "Must pick exactly 2 different agendas",
      });
      return;
    }

    const playerResult = await pool.query(
      `SELECT seat, agenda_pick_1
       FROM war_match_players
       WHERE match_id = $1::uuid AND account_id = $2
       LIMIT 1;`,
      [matchId, accountId],
    );

    if (playerResult.rowCount === 0) {
      res.status(403).json({ status: "error", error: "Forbidden" });
      return;
    }

    if (playerResult.rows[0].agenda_pick_1 !== null) {
      res.status(409).json({
        status: "error",
        error: "Agendas already selected",
      });
      return;
    }

    await pool.query(
      `UPDATE war_match_players
       SET agenda_pick_1 = $1, agenda_pick_2 = $2
       WHERE match_id = $3::uuid AND account_id = $4;`,
      [agendaId1, agendaId2, matchId, accountId],
    );

    const readyResult = await pool.query(
      `SELECT COUNT(*) FILTER (WHERE agenda_pick_1 IS NOT NULL) AS ready,
              COUNT(*) AS total
       FROM war_match_players
       WHERE match_id = $1::uuid;`,
      [matchId],
    );

    const allReady =
      Number(readyResult.rows[0].ready) ===
      Number(readyResult.rows[0].total);

    broadcastMatch(matchId, {
      type: "war_room_event",
      name: "agenda_selected",
      seat: playerResult.rows[0].seat,
      allReady,
    });

    if (allReady) {
      initializeGame(matchId).catch((err) =>
        console.error("initializeGame failed:", err),
      );
    }

    res.json({ ok: true, allReady });
  }),
);

// GET /matches/:matchId/hand
app.get(
  "/matches/:matchId/hand",
  asyncRoute(async (req, res) => {
    const { accountId } = await resolveAccountIdFromRequest(req);
    const matchId = String(req.params.matchId || "").trim();

    if (!matchId) {
      res.status(400).json({ status: "error", error: "Invalid matchId" });
      return;
    }

    const playerResult = await pool.query(
      `SELECT seat FROM war_match_players
       WHERE match_id = $1::uuid AND account_id = $2 LIMIT 1;`,
      [matchId, accountId],
    );

    if (playerResult.rowCount === 0) {
      res.status(403).json({ status: "error", error: "Forbidden" });
      return;
    }

    const seat = playerResult.rows[0].seat;

    const handResult = await pool.query(
      `SELECT phc.id,
              mcp.card_id      AS "cardId",
              mcp.display_name AS "displayName",
              mcp.position,
              mcp.headshot_url AS "headshotUrl",
              mcp.tier,
              phc.acquired_at  AS "acquiredAt"
       FROM player_hand_cards phc
       JOIN match_card_pool mcp ON mcp.id = phc.pool_id
       WHERE phc.match_id = $1::uuid AND phc.seat = $2
       ORDER BY phc.acquired_at ASC;`,
      [matchId, seat],
    );

    res.json({ hand: handResult.rows, seat });
  }),
);

// ─── WebSocket ─────────────────────────────────────────────────────────────

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/socket" });

wss.on("connection", (socket) => {
  let handshakeDone = false;

  const fail = (code, reason) => {
    try {
      socket.close(code, reason);
    } catch (_) {
      /* ignore */
    }
  };

  socket.once("message", async (raw) => {
    try {
      const text = Buffer.isBuffer(raw)
        ? raw.toString("utf8")
        : String(raw ?? "");
      const parsed = JSON.parse(text);

      if (!parsed || parsed.type !== "auth") {
        fail(1008, "Handshake required");
        return;
      }

      const matchId = String(parsed.matchId || "").trim();
      let authorizationHeader = parsed.authorizationHeader;

      if (Array.isArray(authorizationHeader)) {
        authorizationHeader = authorizationHeader[0] || "";
      }

      if (
        !matchId ||
        typeof authorizationHeader !== "string" ||
        !authorizationHeader
      ) {
        fail(1008, "Invalid handshake payload");
        return;
      }

      const fakeReq = { headers: { authorization: authorizationHeader } };

      let accountId;
      try {
        const resolved = await resolveAccountIdFromRequest(fakeReq);
        accountId = resolved.accountId;
      } catch (error) {
        fail(error.status === 401 ? 4401 : 4400, "Unauthorized");
        return;
      }

      const membership = await pool.query(
        `SELECT seat FROM war_match_players
         WHERE match_id = $1::uuid AND account_id = $2
         LIMIT 1;`,
        [matchId, accountId],
      );

      if (membership.rowCount === 0) {
        fail(4403, "Forbidden");
        return;
      }

      const seat = membership.rows[0].seat;
      handshakeDone = true;

      addSocket(socket, matchId);

      socket.send(JSON.stringify({ type: "hello", matchId, seat }));

      broadcastMatch(
        matchId,
        { type: "war_room_event", name: "socket_connected", seat },
        socket,
      );

      socket.on("message", (nextRaw) => {
        const payload = Buffer.isBuffer(nextRaw)
          ? nextRaw.toString("utf8")
          : String(nextRaw ?? "");
        socket.send(JSON.stringify({ type: "noopEcho", payload }));
      });
    } catch (error) {
      console.error("websocket auth/handshake error:", error);
      fail(1011, "Server error");
    }
  });

  setTimeout(() => {
    if (!handshakeDone) fail(1008, "Auth timeout");
  }, 10_000);
});

server.listen(PORT, () => {
  console.log(`war-room-service listening on port ${PORT}`);
});