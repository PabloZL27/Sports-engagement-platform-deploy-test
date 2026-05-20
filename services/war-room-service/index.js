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

// ─── Startup migration ─────────────────────────────────────────────────────
pool.query(
  `ALTER TABLE war_match_players ADD COLUMN IF NOT EXISTS is_ready BOOLEAN NOT NULL DEFAULT FALSE;`,
).catch((err) => console.error("migration is_ready error:", err));

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
  
      const check = await client.query(
        `SELECT status FROM war_matches WHERE match_id = $1::uuid FOR UPDATE;`,
        [matchId],
      );
      if (!check.rows[0] || check.rows[0].status !== "AGENDA_PICKING") {
        await client.query("COMMIT");
        return;
      }
  
      for (const card of tieredRoster) {
        await client.query(
          `INSERT INTO match_card_pool
             (match_id, card_id, display_name, position, headshot_url, tier)
           VALUES ($1::uuid, $2, $3, $4, $5, $6)
           ON CONFLICT (match_id, card_id) DO NOTHING;`,
          [matchId, card.cardId, card.displayName, card.position, card.headshotUrl, card.tier],
        );
      }
  
      const seatsResult = await client.query(
        `SELECT seat FROM war_match_players
         WHERE match_id = $1::uuid ORDER BY seat ASC;`,
        [matchId],
      );
      const seats = seatsResult.rows.map((r) => r.seat);
  
      const CARDS_PER_PLAYER = 5;
      const shuffled = [...tieredRoster].sort(() => Math.random() - 0.5);
      let poolIndex = 0;
  
      for (const seat of seats) {
        for (let i = 0; i < CARDS_PER_PLAYER && poolIndex < shuffled.length; i++, poolIndex++) {
          const card = shuffled[poolIndex];
  
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
  
          if (poolRow.rowCount > 0) {
            await client.query(
              `INSERT INTO player_hand_cards (match_id, seat, pool_id)
               VALUES ($1::uuid, $2, $3);`,
              [matchId, seat, poolRow.rows[0].id],
            );
          }
        }
      }
  
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
         VALUES ($1, 1, $2, 3);`,
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
         VALUES ($1, $2, $3, 3);`,
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
      `SELECT wmp.seat,
              wmp.titans_cash   AS "titansCash",
              COALESCE(wmp.is_ready, FALSE) AS "isReady",
              wmp.agenda_pick_1 AS "agendaPick1",
              wmp.agenda_pick_2 AS "agendaPick2",
              a1.name           AS "agenda1Name",
              a1.description    AS "agenda1Desc",
              a1.bonus_points   AS "agenda1Bonus",
              a2.name           AS "agenda2Name",
              a2.description    AS "agenda2Desc",
              a2.bonus_points   AS "agenda2Bonus"
       FROM war_match_players wmp
       LEFT JOIN agendas a1 ON a1.agenda_id = wmp.agenda_pick_1
       LEFT JOIN agendas a2 ON a2.agenda_id = wmp.agenda_pick_2
       WHERE wmp.match_id = $1::uuid AND wmp.account_id = $2
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
              (agenda_pick_1 IS NOT NULL) AS "agendaReady",
              COALESCE(is_ready, FALSE) AS "isReady"
       FROM war_match_players
       WHERE match_id = $1::uuid
       ORDER BY seat ASC;`,
      [matchId],
    );

    const p = participant.rows[0];
    const m = matchResult.rows[0];

    // Pending trade proposal directed at this player
    let pendingTradeForYou = null;
    const pendingTrade = await pool.query(
      `SELECT mtp.proposal_id AS "proposalId",
              mtp.from_seat   AS "fromSeat",
              mtp.cash_offer  AS "cashOffer",
              mtp.expires_at  AS "expiresAt",
              (SELECT json_build_object(
                 'handId', phc.id,
                 'name', mcp.display_name,
                 'position', mcp.position,
                 'headshotUrl', mcp.headshot_url,
                 'tier', mcp.tier
               )
               FROM player_hand_cards phc
               JOIN match_card_pool mcp ON mcp.id = phc.pool_id
               WHERE phc.id = mtp.offer_hand_ids[1]
              ) AS "offerCard",
              (SELECT json_build_object(
                 'handId', phc.id,
                 'name', mcp.display_name,
                 'position', mcp.position,
                 'headshotUrl', mcp.headshot_url,
                 'tier', mcp.tier
               )
               FROM player_hand_cards phc
               JOIN match_card_pool mcp ON mcp.id = phc.pool_id
               WHERE phc.id = mtp.request_hand_ids[1]
              ) AS "requestCard"
       FROM match_trade_proposals mtp
       WHERE mtp.match_id = $1::uuid
         AND mtp.to_seat  = $2
         AND mtp.status   = 'PENDING'
         AND mtp.expires_at > NOW()
       LIMIT 1;`,
      [matchId, p.seat],
    );

    if (pendingTrade.rowCount > 0) {
      pendingTradeForYou = pendingTrade.rows[0];
    }

    // Negotiate attempts left for the active player this turn
    let negotiateAttemptsLeft = 2;
    if (m.status === "PLAYING" && p.seat === m.activeSeat) {
      const attempts = await pool.query(
        `SELECT COUNT(*)::int AS c FROM match_trade_proposals
         WHERE match_id = $1::uuid AND turn_number = $2 AND from_seat = $3;`,
        [matchId, m.currentGlobalTurn, p.seat],
      );
      negotiateAttemptsLeft = Math.max(0, 2 - attempts.rows[0].c);
    }

    // Build agenda list for the requesting player
    const myAgendas = [];
    if (p.agendaPick1 && p.agenda1Name) {
      myAgendas.push({
        agendaId: p.agendaPick1,
        name: p.agenda1Name,
        description: p.agenda1Desc,
        bonusPoints: p.agenda1Bonus,
      });
    }
    if (p.agendaPick2 && p.agenda2Name) {
      myAgendas.push({
        agendaId: p.agendaPick2,
        name: p.agenda2Name,
        description: p.agenda2Desc,
        bonusPoints: p.agenda2Bonus,
      });
    }

    res.json({
      ...m,
      you: {
        seat: p.seat,
        titansCash: p.titansCash,
        isReady: p.isReady,
        agendaSelected: p.agendaPick1 !== null,
        agendas: myAgendas,
      },
      players: players.rows,
      pendingTradeForYou,
      negotiateAttemptsLeft,
    });
  }),
);

// POST /matches/:matchId/start  (solo el host — seat 1)
app.post(
    "/matches/:matchId/start",
    asyncRoute(async (req, res) => {
      const { accountId } = await resolveAccountIdFromRequest(req);
      const matchId = String(req.params.matchId || "").trim();
  
      const matchResult = await pool.query(
        `SELECT status FROM war_matches WHERE match_id = $1::uuid LIMIT 1;`,
        [matchId],
      );
  
      if (matchResult.rowCount === 0) {
        res.status(404).json({ status: "error", error: "Match not found" });
        return;
      }
  
      if (matchResult.rows[0].status !== "LOBBY") {
        res.status(409).json({ status: "error", error: "Match already started" });
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
  
      if (playerResult.rows[0].seat !== 1) {
        res.status(403).json({
          status: "error",
          error: "Only the host can start",
        });
        return;
      }
  
      const countResult = await pool.query(
        `SELECT COUNT(*)::int AS c,
                COUNT(*) FILTER (WHERE COALESCE(is_ready, FALSE) = TRUE)::int AS ready_c
         FROM war_match_players WHERE match_id = $1::uuid;`,
        [matchId],
      );
  
      if (countResult.rows[0].c < 2) {
        res.status(400).json({
          status: "error",
          error: "Need at least 2 players to start",
        });
        return;
      }

      if (countResult.rows[0].ready_c < countResult.rows[0].c) {
        res.status(400).json({
          status: "error",
          error: "Not all GMs are ready yet",
        });
        return;
      }
  
      await pool.query(
        `UPDATE war_matches SET status = 'AGENDA_PICKING' WHERE match_id = $1::uuid;`,
        [matchId],
      );
  
      broadcastMatch(matchId, {
        type: "war_room_event",
        name: "agenda_picking_started",
      });
  
      res.json({ ok: true });
    }),
  );

// ─── POST /matches/:matchId/ready ─────────────────────────────────────────
app.post(
  "/matches/:matchId/ready",
  asyncRoute(async (req, res) => {
    const { accountId } = await resolveAccountIdFromRequest(req);
    const matchId = String(req.params.matchId || "").trim();
    const { ready = true } = req.body;

    const playerResult = await pool.query(
      `UPDATE war_match_players
       SET is_ready = $1
       WHERE match_id = $2::uuid AND account_id = $3
       RETURNING seat;`,
      [ready, matchId, accountId],
    );

    if (playerResult.rowCount === 0) {
      res.status(403).json({ status: "error", error: "Forbidden" });
      return;
    }

    broadcastMatch(matchId, {
      type: "war_room_event",
      name: "player_ready",
      seat: playerResult.rows[0].seat,
      ready,
    });

    res.json({ ok: true, seat: playerResult.rows[0].seat, ready });
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

// ─── Turn advancement helper ────────────────────────────────────────────────

async function advanceTurn(client, matchId, currentGlobalTurn, activeSeat, totalSeats) {
  const newGlobalTurn = currentGlobalTurn + 1;
  const newRound = Math.ceil(newGlobalTurn / totalSeats);
  const nextSeat = (activeSeat % totalSeats) + 1;

  if (newRound > 12) {
    await client.query(
      `UPDATE war_matches
       SET status = 'ENDED', active_seat = NULL,
           current_global_turn = $2, current_round = $3
       WHERE match_id = $1::uuid;`,
      [matchId, newGlobalTurn, newRound],
    );
    return { ended: true, nextSeat: null, newRound };
  }

  await client.query(
    `UPDATE war_matches
     SET active_seat = $2,
         current_global_turn = $3,
         current_round = $4
     WHERE match_id = $1::uuid;`,
    [matchId, nextSeat, newGlobalTurn, newRound],
  );

  return { ended: false, nextSeat, newRound };
}

// ─── POST /matches/:matchId/action/news ────────────────────────────────────

app.post(
  "/matches/:matchId/action/news",
  asyncRoute(async (req, res) => {
    const { accountId } = await resolveAccountIdFromRequest(req);
    const matchId = String(req.params.matchId || "").trim();

    if (!matchId) {
      res.status(400).json({ status: "error", error: "Invalid matchId" });
      return;
    }

    const matchResult = await pool.query(
      `SELECT status, active_seat AS "activeSeat",
              current_global_turn AS "currentGlobalTurn",
              current_round AS "currentRound"
       FROM war_matches WHERE match_id = $1::uuid LIMIT 1;`,
      [matchId],
    );

    if (matchResult.rowCount === 0) {
      res.status(404).json({ status: "error", error: "Match not found" });
      return;
    }

    const match = matchResult.rows[0];

    if (match.status !== "PLAYING") {
      res.status(400).json({ status: "error", error: "Match is not in progress" });
      return;
    }

    const playerResult = await pool.query(
      `SELECT seat, titans_cash AS "titansCash"
       FROM war_match_players
       WHERE match_id = $1::uuid AND account_id = $2 LIMIT 1;`,
      [matchId, accountId],
    );

    if (playerResult.rowCount === 0) {
      res.status(403).json({ status: "error", error: "Forbidden" });
      return;
    }

    const player = playerResult.rows[0];

    if (player.seat !== match.activeSeat) {
      res.status(409).json({ status: "error", error: "Not your turn" });
      return;
    }

    const cardResult = await pool.query(
      `SELECT card_id    AS "cardId",
              headline,
              story,
              cash_effect AS "cashEffect"
       FROM breaking_news_cards
       ORDER BY random()
       LIMIT 1;`,
    );

    if (cardResult.rowCount === 0) {
      res.status(500).json({ status: "error", error: "No news cards available" });
      return;
    }

    const card = cardResult.rows[0];

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const newCash = Math.max(0, player.titansCash + card.cashEffect);

      await client.query(
        `UPDATE war_match_players
         SET titans_cash = $1
         WHERE match_id = $2::uuid AND account_id = $3;`,
        [newCash, matchId, accountId],
      );

      await client.query(
        `INSERT INTO match_turns_log
           (match_id, seat, turn_number, action_type, meta)
         VALUES ($1::uuid, $2, $3, 'news', $4);`,
        [
          matchId,
          player.seat,
          match.currentGlobalTurn,
          JSON.stringify({ cardId: card.cardId, cashEffect: card.cashEffect }),
        ],
      );

      const seatsResult = await client.query(
        `SELECT COUNT(*)::int AS total
         FROM war_match_players WHERE match_id = $1::uuid;`,
        [matchId],
      );
      const totalSeats = seatsResult.rows[0].total;

      const advance = await advanceTurn(
        client,
        matchId,
        match.currentGlobalTurn,
        match.activeSeat,
        totalSeats,
      );

      await client.query("COMMIT");

      broadcastMatch(matchId, {
        type: "war_room_event",
        name: advance.ended ? "game_ended" : "turn_advanced",
        activeSeat: advance.nextSeat,
        currentRound: advance.newRound,
        seat: player.seat,
        cashDelta: card.cashEffect,
        newCash,
      });

      res.json({
        card,
        newTitansCash: newCash,
        cashDelta: card.cashEffect,
        activeSeat: advance.nextSeat,
        currentRound: advance.newRound,
        gameEnded: advance.ended,
      });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }),
);

// POST /matches/:matchId/action/buy/scout
app.post(
    "/matches/:matchId/action/buy/scout",
    asyncRoute(async (req, res) => {
      const { accountId } = await resolveAccountIdFromRequest(req);
      const matchId = String(req.params.matchId || "").trim();
  
      const matchResult = await pool.query(
        `SELECT status, active_seat AS "activeSeat"
         FROM war_matches WHERE match_id = $1::uuid LIMIT 1;`,
        [matchId],
      );
  
      if (matchResult.rowCount === 0) {
        res.status(404).json({ status: "error", error: "Match not found" });
        return;
      }
  
      const match = matchResult.rows[0];
  
      if (match.status !== "PLAYING") {
        res.status(400).json({ status: "error", error: "Match is not in progress" });
        return;
      }
  
      const playerResult = await pool.query(
        `SELECT seat, titans_cash AS "titansCash"
         FROM war_match_players
         WHERE match_id = $1::uuid AND account_id = $2 LIMIT 1;`,
        [matchId, accountId],
      );
  
      if (playerResult.rowCount === 0) {
        res.status(403).json({ status: "error", error: "Forbidden" });
        return;
      }
  
      const player = playerResult.rows[0];
  
      if (player.seat !== match.activeSeat) {
        res.status(409).json({ status: "error", error: "Not your turn" });
        return;
      }
  
      if (player.titansCash < 5) {
        res.status(400).json({ status: "error", error: "Not enough TitanCash (need 5)" });
        return;
      }
  
      const cardsResult = await pool.query(
        `SELECT id          AS "poolId",
                card_id     AS "cardId",
                display_name AS "displayName",
                position,
                headshot_url AS "headshotUrl",
                tier
         FROM match_card_pool
         WHERE match_id = $1::uuid AND taken_by_seat IS NULL
         ORDER BY random()
         LIMIT 3;`,
        [matchId],
      );
  
      if (cardsResult.rowCount === 0) {
        res.status(400).json({ status: "error", error: "No cards available in pool" });
        return;
      }
  
      res.json({ cards: cardsResult.rows });
    }),
  );
  
// POST /matches/:matchId/action/buy/pick
app.post(
    "/matches/:matchId/action/buy/pick",
    asyncRoute(async (req, res) => {
        const { accountId } = await resolveAccountIdFromRequest(req);
        const matchId = String(req.params.matchId || "").trim();
        const { poolId, discardHandId } = req.body;

        if (!poolId) {
        res.status(400).json({ status: "error", error: "poolId is required" });
        return;
        }

        const matchResult = await pool.query(
        `SELECT status,
                active_seat         AS "activeSeat",
                current_global_turn AS "currentGlobalTurn",
                current_round       AS "currentRound"
            FROM war_matches WHERE match_id = $1::uuid LIMIT 1;`,
        [matchId],
        );

        if (matchResult.rowCount === 0) {
        res.status(404).json({ status: "error", error: "Match not found" });
        return;
        }

        const match = matchResult.rows[0];

        if (match.status !== "PLAYING") {
        res.status(400).json({ status: "error", error: "Match is not in progress" });
        return;
        }

        const playerResult = await pool.query(
        `SELECT seat, titans_cash AS "titansCash"
            FROM war_match_players
            WHERE match_id = $1::uuid AND account_id = $2 LIMIT 1;`,
        [matchId, accountId],
        );

        if (playerResult.rowCount === 0) {
        res.status(403).json({ status: "error", error: "Forbidden" });
        return;
        }

        const player = playerResult.rows[0];

        if (player.seat !== match.activeSeat) {
        res.status(409).json({ status: "error", error: "Not your turn" });
        return;
        }

        if (player.titansCash < 5) {
        res.status(400).json({ status: "error", error: "Not enough TitanCash" });
        return;
        }

        const handCount = await pool.query(
        `SELECT COUNT(*)::int AS c
            FROM player_hand_cards
            WHERE match_id = $1::uuid AND seat = $2;`,
        [matchId, player.seat],
        );

        if (handCount.rows[0].c >= 6 && !discardHandId) {
        res.status(400).json({
            status: "error",
            error: "Hand is full — must provide discardHandId",
        });
        return;
        }

        const client = await pool.connect();
        try {
        await client.query("BEGIN");

        if (discardHandId) {
            const discardResult = await client.query(
            `DELETE FROM player_hand_cards
                WHERE id = $1 AND match_id = $2::uuid AND seat = $3
                RETURNING pool_id AS "poolId";`,
            [discardHandId, matchId, player.seat],
            );
            if (discardResult.rowCount > 0) {
            await client.query(
                `UPDATE match_card_pool SET taken_by_seat = NULL WHERE id = $1;`,
                [discardResult.rows[0].poolId],
            );
            }
        }

        const cardResult = await client.query(
            `SELECT id, display_name AS "displayName", tier
            FROM match_card_pool
            WHERE id = $1 AND match_id = $2::uuid AND taken_by_seat IS NULL
            FOR UPDATE;`,
            [poolId, matchId],
        );

        if (cardResult.rowCount === 0) {
            await client.query("ROLLBACK");
            res.status(409).json({ status: "error", error: "Card no longer available" });
            return;
        }

        await client.query(
            `UPDATE match_card_pool SET taken_by_seat = $1 WHERE id = $2;`,
            [player.seat, poolId],
        );

        await client.query(
            `INSERT INTO player_hand_cards (match_id, seat, pool_id)
            VALUES ($1::uuid, $2, $3);`,
            [matchId, player.seat, poolId],
        );

        const newCash = player.titansCash - 5;
        await client.query(
            `UPDATE war_match_players
            SET titans_cash = $1
            WHERE match_id = $2::uuid AND account_id = $3;`,
            [newCash, matchId, accountId],
        );

        await client.query(
            `INSERT INTO match_turns_log (match_id, seat, turn_number, action_type, meta)
            VALUES ($1::uuid, $2, $3, 'buy', $4);`,
            [matchId, player.seat, match.currentGlobalTurn, JSON.stringify({ poolId })],
        );

        const seatsResult = await client.query(
            `SELECT COUNT(*)::int AS total
            FROM war_match_players WHERE match_id = $1::uuid;`,
            [matchId],
        );

        const advance = await advanceTurn(
            client, matchId, match.currentGlobalTurn, match.activeSeat, seatsResult.rows[0].total,
        );

        await client.query("COMMIT");

        broadcastMatch(matchId, {
            type: "war_room_event",
            name: advance.ended ? "game_ended" : "turn_advanced",
            activeSeat: advance.nextSeat,
            currentRound: advance.newRound,
            seat: player.seat,
        });

        res.json({
            ok: true,
            newTitansCash: newCash,
            activeSeat: advance.nextSeat,
            currentRound: advance.newRound,
            gameEnded: advance.ended,
            card: cardResult.rows[0],
        });
        } catch (err) {
        await client.query("ROLLBACK");
        throw err;
        } finally {
        client.release();
        }
    }),
);

// POST /matches/:matchId/action/buy/forfeit
app.post(
    "/matches/:matchId/action/buy/forfeit",
    asyncRoute(async (req, res) => {
        const { accountId } = await resolveAccountIdFromRequest(req);
        const matchId = String(req.params.matchId || "").trim();

        const matchResult = await pool.query(
        `SELECT status,
                active_seat         AS "activeSeat",
                current_global_turn AS "currentGlobalTurn",
                current_round       AS "currentRound"
            FROM war_matches WHERE match_id = $1::uuid LIMIT 1;`,
        [matchId],
        );

        if (matchResult.rowCount === 0) {
        res.status(404).json({ status: "error", error: "Match not found" });
        return;
        }

        const match = matchResult.rows[0];

        const playerResult = await pool.query(
        `SELECT seat, titans_cash AS "titansCash"
            FROM war_match_players
            WHERE match_id = $1::uuid AND account_id = $2 LIMIT 1;`,
        [matchId, accountId],
        );

        if (playerResult.rowCount === 0) {
        res.status(403).json({ status: "error", error: "Forbidden" });
        return;
        }

        const player = playerResult.rows[0];

        if (player.seat !== match.activeSeat) {
        res.status(409).json({ status: "error", error: "Not your turn" });
        return;
        }

        const client = await pool.connect();
        try {
        await client.query("BEGIN");

        const newCash = Math.max(0, player.titansCash - 5);

        await client.query(
            `UPDATE war_match_players
            SET titans_cash = $1
            WHERE match_id = $2::uuid AND account_id = $3;`,
            [newCash, matchId, accountId],
        );

        await client.query(
            `INSERT INTO match_turns_log (match_id, seat, turn_number, action_type, meta)
            VALUES ($1::uuid, $2, $3, 'buy_forfeit', $4);`,
            [matchId, player.seat, match.currentGlobalTurn, JSON.stringify({ reason: "timeout" })],
        );

        const seatsResult = await client.query(
            `SELECT COUNT(*)::int AS total
            FROM war_match_players WHERE match_id = $1::uuid;`,
            [matchId],
        );

        const advance = await advanceTurn(
            client, matchId, match.currentGlobalTurn, match.activeSeat, seatsResult.rows[0].total,
        );

        await client.query("COMMIT");

        broadcastMatch(matchId, {
            type: "war_room_event",
            name: advance.ended ? "game_ended" : "turn_advanced",
            activeSeat: advance.nextSeat,
            currentRound: advance.newRound,
            seat: player.seat,
        });

        res.json({
            ok: true,
            newTitansCash: newCash,
            activeSeat: advance.nextSeat,
            currentRound: advance.newRound,
            gameEnded: advance.ended,
        });
        } catch (err) {
        await client.query("ROLLBACK");
        throw err;
        } finally {
        client.release();
        }
    }),
);

// ─── POST /matches/:matchId/action/pass ────────────────────────────────────

app.post(
    "/matches/:matchId/action/pass",
    asyncRoute(async (req, res) => {
      const { accountId } = await resolveAccountIdFromRequest(req);
      const matchId = String(req.params.matchId || "").trim();
  
      const matchResult = await pool.query(
        `SELECT status, active_seat AS "activeSeat",
                current_global_turn AS "currentGlobalTurn",
                current_round       AS "currentRound"
         FROM war_matches WHERE match_id = $1::uuid LIMIT 1;`,
        [matchId],
      );
  
      if (matchResult.rowCount === 0) {
        res.status(404).json({ status: "error", error: "Match not found" });
        return;
      }
  
      const match = matchResult.rows[0];
  
      if (match.status !== "PLAYING") {
        res.status(400).json({ status: "error", error: "Match is not in progress" });
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
  
      const player = playerResult.rows[0];
  
      if (player.seat !== match.activeSeat) {
        res.status(409).json({ status: "error", error: "Not your turn" });
        return;
      }
  
      const client = await pool.connect();
      try {
        await client.query("BEGIN");

        // Lock the match row to prevent concurrent turn advances (e.g. trade accept racing with auto-pass)
        const freshMatch = await client.query(
          `SELECT status,
                  active_seat         AS "activeSeat",
                  current_global_turn AS "currentGlobalTurn",
                  current_round       AS "currentRound"
           FROM war_matches WHERE match_id = $1::uuid FOR UPDATE LIMIT 1;`,
          [matchId],
        );

        if (freshMatch.rowCount === 0 || freshMatch.rows[0].status !== "PLAYING") {
          await client.query("ROLLBACK");
          res.status(409).json({ status: "error", error: "Match not in progress" });
          return;
        }

        const freshActiveSeat = freshMatch.rows[0].activeSeat;

        // If turn already advanced (concurrent trade accept), return current state without advancing again
        if (freshActiveSeat !== player.seat) {
          await client.query("ROLLBACK");
          res.json({
            ok: true,
            activeSeat: freshActiveSeat,
            currentRound: freshMatch.rows[0].currentRound,
            gameEnded: false,
            newTitansCash: player.titansCash ?? 0,
          });
          return;
        }

        await client.query(
          `INSERT INTO match_turns_log (match_id, seat, turn_number, action_type, meta)
           VALUES ($1::uuid, $2, $3, 'pass', '{}');`,
          [matchId, player.seat, freshMatch.rows[0].currentGlobalTurn],
        );
  
        const seatsResult = await client.query(
          `SELECT COUNT(*)::int AS total FROM war_match_players WHERE match_id = $1::uuid;`,
          [matchId],
        );
  
        const advance = await advanceTurn(
          client, matchId, freshMatch.rows[0].currentGlobalTurn, freshActiveSeat, seatsResult.rows[0].total,
        );
  
        await client.query("COMMIT");
  
        broadcastMatch(matchId, {
          type: "war_room_event",
          name: advance.ended ? "game_ended" : "turn_advanced",
          activeSeat: advance.nextSeat,
          currentRound: advance.newRound,
          seat: player.seat,
        });
  
        res.json({
          ok: true,
          activeSeat: advance.nextSeat,
          currentRound: advance.newRound,
          gameEnded: advance.ended,
        });
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    }),
  );
  
  // ─── GET /matches/:matchId/rival-hand/:targetSeat ──────────────────────────
  // Returns rival cards WITHOUT tier (profile only for negotiation)
  
  app.get(
    "/matches/:matchId/rival-hand/:targetSeat",
    asyncRoute(async (req, res) => {
      const { accountId } = await resolveAccountIdFromRequest(req);
      const matchId = String(req.params.matchId || "").trim();
      const targetSeat = Number(req.params.targetSeat);
  
      const playerResult = await pool.query(
        `SELECT seat FROM war_match_players
         WHERE match_id = $1::uuid AND account_id = $2 LIMIT 1;`,
        [matchId, accountId],
      );
  
      if (playerResult.rowCount === 0) {
        res.status(403).json({ status: "error", error: "Forbidden" });
        return;
      }
  
      if (playerResult.rows[0].seat === targetSeat) {
        res.status(400).json({ status: "error", error: "Cannot view your own hand here" });
        return;
      }
  
      const handResult = await pool.query(
        `SELECT phc.id            AS "handId",
                mcp.card_id       AS "cardId",
                mcp.display_name  AS "displayName",
                mcp.position,
                mcp.headshot_url  AS "headshotUrl",
                mcp.tier
         FROM player_hand_cards phc
         JOIN match_card_pool mcp ON mcp.id = phc.pool_id
         WHERE phc.match_id = $1::uuid AND phc.seat = $2
         ORDER BY phc.acquired_at ASC;`,
        [matchId, targetSeat],
      );
  
      res.json({ hand: handResult.rows });
    }),
  );
  
  // ─── POST /matches/:matchId/action/trade/propose ───────────────────────────
  
  app.post(
    "/matches/:matchId/action/trade/propose",
    asyncRoute(async (req, res) => {
      const { accountId } = await resolveAccountIdFromRequest(req);
      const matchId = String(req.params.matchId || "").trim();
      const { toSeat, offerHandId, requestHandId, cashOffer = 0 } = req.body;

      if (!toSeat || !offerHandId || !requestHandId) {
        res.status(400).json({ status: "error", error: "toSeat, offerHandId and requestHandId required" });
        return;
      }

      const matchResult = await pool.query(
        `SELECT status, active_seat AS "activeSeat",
                current_global_turn AS "currentGlobalTurn"
         FROM war_matches WHERE match_id = $1::uuid LIMIT 1;`,
        [matchId],
      );

      if (matchResult.rowCount === 0) {
        res.status(404).json({ status: "error", error: "Match not found" });
        return;
      }

      const match = matchResult.rows[0];

      if (match.status !== "PLAYING") {
        res.status(400).json({ status: "error", error: "Match is not in progress" });
        return;
      }

      const playerResult = await pool.query(
        `SELECT seat, titans_cash AS "titansCash"
         FROM war_match_players
         WHERE match_id = $1::uuid AND account_id = $2 LIMIT 1;`,
        [matchId, accountId],
      );

      if (playerResult.rowCount === 0) {
        res.status(403).json({ status: "error", error: "Forbidden" });
        return;
      }

      const player = playerResult.rows[0];

      if (player.seat !== match.activeSeat) {
        res.status(409).json({ status: "error", error: "Not your turn" });
        return;
      }

      if (cashOffer > 0 && player.titansCash < cashOffer) {
        res.status(400).json({ status: "error", error: "Not enough TitanCash for this offer" });
        return;
      }

      // Check attempt limits (max 2, no repeat to same seat)
      const attemptsResult = await pool.query(
        `SELECT to_seat AS "toSeat" FROM match_trade_proposals
         WHERE match_id = $1::uuid AND turn_number = $2 AND from_seat = $3;`,
        [matchId, match.currentGlobalTurn, player.seat],
      );

      if (attemptsResult.rowCount >= 2) {
        res.status(409).json({ status: "error", error: "No more negotiate attempts this turn" });
        return;
      }

      const alreadyProposedTo = attemptsResult.rows.map((r) => r.toSeat);
      if (alreadyProposedTo.includes(toSeat)) {
        res.status(409).json({ status: "error", error: "Already proposed to this GM this turn" });
        return;
      }

      // Verify offer card belongs to proposer
      const offerCheck = await pool.query(
        `SELECT 1 FROM player_hand_cards
         WHERE id = $1 AND match_id = $2::uuid AND seat = $3 LIMIT 1;`,
        [offerHandId, matchId, player.seat],
      );
      if (offerCheck.rowCount === 0) {
        res.status(400).json({ status: "error", error: "Offer card not in your hand" });
        return;
      }

      // Verify request card belongs to target
      const requestCheck = await pool.query(
        `SELECT 1 FROM player_hand_cards
         WHERE id = $1 AND match_id = $2::uuid AND seat = $3 LIMIT 1;`,
        [requestHandId, matchId, toSeat],
      );
      if (requestCheck.rowCount === 0) {
        res.status(400).json({ status: "error", error: "Requested card not in rival's hand" });
        return;
      }

      const expiresAt = new Date(Date.now() + 15_000);

      const proposal = await pool.query(
        `INSERT INTO match_trade_proposals
           (match_id, turn_number, from_seat, to_seat, offer_hand_ids, request_hand_ids, cash_offer, expires_at)
         VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8)
         RETURNING proposal_id AS "proposalId";`,
        [
          matchId,
          match.currentGlobalTurn,
          player.seat,
          toSeat,
          [offerHandId],
          [requestHandId],
          cashOffer,
          expiresAt,
        ],
      );
  
      broadcastMatch(matchId, {
        type: "war_room_event",
        name: "trade_proposed",
        toSeat,
        fromSeat: player.seat,
        proposalId: proposal.rows[0].proposalId,
      });
  
      res.json({
        ok: true,
        proposalId: proposal.rows[0].proposalId,
        attemptsLeft: 1 - attemptsResult.rowCount,
      });
    }),
  );
  
  // ─── POST /matches/:matchId/action/trade/respond ───────────────────────────
  
  app.post(
    "/matches/:matchId/action/trade/respond",
    asyncRoute(async (req, res) => {
      const { accountId } = await resolveAccountIdFromRequest(req);
      const matchId = String(req.params.matchId || "").trim();
      const { proposalId, accept } = req.body;
  
      if (!proposalId || accept === undefined) {
        res.status(400).json({ status: "error", error: "proposalId and accept required" });
        return;
      }
  
      const playerResult = await pool.query(
        `SELECT seat, titans_cash AS "titansCash"
         FROM war_match_players
         WHERE match_id = $1::uuid AND account_id = $2 LIMIT 1;`,
        [matchId, accountId],
      );
  
      if (playerResult.rowCount === 0) {
        res.status(403).json({ status: "error", error: "Forbidden" });
        return;
      }
  
      const player = playerResult.rows[0];
  
      const proposalResult = await pool.query(
        `SELECT proposal_id      AS "proposalId",
                from_seat        AS "fromSeat",
                to_seat          AS "toSeat",
                offer_hand_ids   AS "offerHandIds",
                request_hand_ids AS "requestHandIds",
                cash_offer       AS "cashOffer",
                status,
                expires_at       AS "expiresAt",
                turn_number      AS "turnNumber"
         FROM match_trade_proposals
         WHERE proposal_id = $1::uuid AND match_id = $2::uuid LIMIT 1;`,
        [proposalId, matchId],
      );
  
      if (proposalResult.rowCount === 0) {
        res.status(404).json({ status: "error", error: "Proposal not found" });
        return;
      }
  
      const proposal = proposalResult.rows[0];
  
      if (proposal.toSeat !== player.seat) {
        res.status(403).json({ status: "error", error: "This proposal is not for you" });
        return;
      }
  
      if (proposal.status !== "PENDING") {
        res.status(409).json({ status: "error", error: "Proposal already resolved" });
        return;
      }
  
      if (new Date(proposal.expiresAt) < new Date()) {
        await pool.query(
          `UPDATE match_trade_proposals SET status = 'EXPIRED' WHERE proposal_id = $1::uuid;`,
          [proposalId],
        );
        res.status(409).json({ status: "error", error: "Proposal expired" });
        return;
      }
  
      const newStatus = accept ? "ACCEPTED" : "REJECTED";
  
      await pool.query(
        `UPDATE match_trade_proposals SET status = $1 WHERE proposal_id = $2::uuid;`,
        [newStatus, proposalId],
      );
  
      if (!accept) {
        // Check if this was the last possible attempt for the active player
        const attemptsLeft = await pool.query(
          `SELECT COUNT(*)::int AS c FROM match_trade_proposals
           WHERE match_id = $1::uuid AND turn_number = $2 AND from_seat = $3;`,
          [matchId, proposal.turnNumber, proposal.fromSeat],
        );
  
        broadcastMatch(matchId, {
          type: "war_room_event",
          name: "trade_rejected",
          fromSeat: proposal.fromSeat,
          toSeat: proposal.toSeat,
          attemptsUsed: attemptsLeft.rows[0].c,
        });
  
        res.json({ ok: true, accepted: false });
        return;
      }
  
      // Accept: swap cards + transfer cash
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
  
        // Swap offer card → target's hand
        const offerPoolRow = await client.query(
          `SELECT mcp.id AS "poolId"
           FROM player_hand_cards phc
           JOIN match_card_pool mcp ON mcp.id = phc.pool_id
           WHERE phc.id = $1 AND phc.match_id = $2::uuid LIMIT 1;`,
          [proposal.offerHandIds[0], matchId],
        );
        if (offerPoolRow.rowCount > 0) {
          const poolId = offerPoolRow.rows[0].poolId;
          await client.query(`UPDATE match_card_pool SET taken_by_seat = $1 WHERE id = $2;`, [proposal.toSeat, poolId]);
          await client.query(`UPDATE player_hand_cards SET seat = $1 WHERE match_id = $2::uuid AND pool_id = $3;`, [proposal.toSeat, matchId, poolId]);
        }

        // Swap request card → proposer's hand
        const requestPoolRow = await client.query(
          `SELECT mcp.id AS "poolId"
           FROM player_hand_cards phc
           JOIN match_card_pool mcp ON mcp.id = phc.pool_id
           WHERE phc.id = $1 AND phc.match_id = $2::uuid LIMIT 1;`,
          [proposal.requestHandIds[0], matchId],
        );
        if (requestPoolRow.rowCount > 0) {
          const poolId = requestPoolRow.rows[0].poolId;
          await client.query(`UPDATE match_card_pool SET taken_by_seat = $1 WHERE id = $2;`, [proposal.fromSeat, poolId]);
          await client.query(`UPDATE player_hand_cards SET seat = $1 WHERE match_id = $2::uuid AND pool_id = $3;`, [proposal.fromSeat, matchId, poolId]);
        }
  
        // Transfer cash if any
        if (proposal.cashOffer > 0) {
          await client.query(
            `UPDATE war_match_players
             SET titans_cash = titans_cash - $1
             WHERE match_id = $2::uuid AND seat = $3;`,
            [proposal.cashOffer, matchId, proposal.fromSeat],
          );
          await client.query(
            `UPDATE war_match_players
             SET titans_cash = titans_cash + $1
             WHERE match_id = $2::uuid AND seat = $3;`,
            [proposal.cashOffer, matchId, proposal.toSeat],
          );
        }
  
        // Log for both players
        await client.query(
          `INSERT INTO match_turns_log (match_id, seat, turn_number, action_type, meta)
           VALUES ($1::uuid, $2, $3, 'trade_accepted', $4);`,
          [matchId, proposal.fromSeat, proposal.turnNumber, JSON.stringify({ proposalId })],
        );
  
        // Advance turn — lock the row to prevent concurrent pass racing with this accept
        const matchRow = await client.query(
          `SELECT active_seat AS "activeSeat",
                  current_global_turn AS "currentGlobalTurn",
                  current_round AS "currentRound"
           FROM war_matches WHERE match_id = $1::uuid FOR UPDATE LIMIT 1;`,
          [matchId],
        );
  
        const seatsResult = await client.query(
          `SELECT COUNT(*)::int AS total FROM war_match_players WHERE match_id = $1::uuid;`,
          [matchId],
        );
  
        const advance = await advanceTurn(
          client, matchId,
          matchRow.rows[0].currentGlobalTurn,
          matchRow.rows[0].activeSeat,
          seatsResult.rows[0].total,
        );
  
        await client.query("COMMIT");
  
        broadcastMatch(matchId, {
          type: "war_room_event",
          name: advance.ended ? "game_ended" : "trade_accepted_turn_advanced",
          activeSeat: advance.nextSeat,
          currentRound: advance.newRound,
          fromSeat: proposal.fromSeat,
          toSeat: proposal.toSeat,
        });
  
        res.json({
          ok: true,
          accepted: true,
          activeSeat: advance.nextSeat,
          currentRound: advance.newRound,
          gameEnded: advance.ended,
        });
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    }),
  );
  
  // ─── GET /matches/:matchId/results ────────────────────────────────────────
  
  app.get(
    "/matches/:matchId/results",
    asyncRoute(async (req, res) => {
      const { accountId } = await resolveAccountIdFromRequest(req);
      const matchId = String(req.params.matchId || "").trim();
  
      const playerResult = await pool.query(
        `SELECT seat FROM war_match_players
         WHERE match_id = $1::uuid AND account_id = $2 LIMIT 1;`,
        [matchId, accountId],
      );
  
      if (playerResult.rowCount === 0) {
        res.status(403).json({ status: "error", error: "Forbidden" });
        return;
      }
  
      const playersResult = await pool.query(
        `SELECT seat, titans_cash AS "titansCash",
                agenda_pick_1 AS "agendaPick1",
                agenda_pick_2 AS "agendaPick2"
         FROM war_match_players
         WHERE match_id = $1::uuid ORDER BY seat ASC;`,
        [matchId],
      );
  
      const results = await Promise.all(
        playersResult.rows.map(async (p) => {
          const handResult = await pool.query(
            `SELECT mcp.tier
             FROM player_hand_cards phc
             JOIN match_card_pool mcp ON mcp.id = phc.pool_id
             WHERE phc.match_id = $1::uuid AND phc.seat = $2;`,
            [matchId, p.seat],
          );
  
          const tiers = handResult.rows.map((r) => r.tier);
          const handTotal = tiers.reduce((s, t) => s + t, 0);
  
          const logsResult = await pool.query(
            `SELECT action_type AS "actionType"
             FROM match_turns_log
             WHERE match_id = $1::uuid AND seat = $2;`,
            [matchId, p.seat],
          );
          const actions = logsResult.rows.map((r) => r.actionType);
          const newsCount = actions.filter((a) => a === "news").length;
          const tradesDone = actions.filter((a) => a === "trade_accepted").length;
  
          let agendaBonus = 0;
          const agendaDetails = [];
  
          for (const agendaId of [p.agendaPick1, p.agendaPick2].filter(Boolean)) {
            const agendaRow = await pool.query(
              `SELECT name, description, bonus_points AS "bonusPoints", condition_type AS "conditionType"
               FROM agendas WHERE agenda_id = $1 LIMIT 1;`,
              [agendaId],
            );
            if (agendaRow.rowCount === 0) continue;
            const agenda = agendaRow.rows[0];
  
            let achieved = false;
            const c = agenda.conditionType;
  
            if (c === "hand_max_value") achieved = Math.max(...tiers, 0) >= 5;
            else if (c === "hand_count_eq") achieved = tiers.length === 6;
            else if (c === "hand_low_value_count") achieved = tiers.filter((t) => t <= 2).length >= 3;
            else if (c === "hand_high_value_count") achieved = tiers.filter((t) => t >= 4).length >= 4;
            else if (c === "titans_cash_gte") achieved = p.titansCash >= 5;
            else if (c === "hand_few_high_total") achieved = tiers.length <= 4 && handTotal >= 12;
            else if (c === "hand_all_low") achieved = tiers.length === 6 && tiers.every((t) => t <= 3);
            else if (c === "hand_mid_high_count") achieved = tiers.filter((t) => t >= 3).length >= 5;
            else if (c === "hand_value_count") achieved = tiers.filter((t) => t === 3).length >= 3;
            else if (c === "hand_value_count_high") achieved = tiers.filter((t) => t === 5).length >= 2;
            else if (c === "hand_combo") achieved = tiers.includes(4) && tiers.includes(5);
            else if (c === "hand_total_range") achieved = handTotal >= 15 && handTotal <= 20;
            else if (c === "hand_min_value") achieved = tiers.filter((t) => t >= 2).length >= 5;
            else if (c === "trades_completed") achieved = tradesDone >= 2;
            else if (c === "no_trades") achieved = tradesDone === 0;
            else if (c === "trade_accepted") achieved = tradesDone >= 1;
            else if (c === "news_drawn") achieved = newsCount >= 3;
  
            if (achieved) {
                agendaBonus += agenda.bonusPoints;
              } else {
                agendaBonus -= agenda.bonusPoints;
              }
              agendaDetails.push({ ...agenda, achieved });
          }
  
          return {
            seat: p.seat,
            handTotal,
            agendaBonus,
            totalScore: handTotal + agendaBonus,
            tiers,
            titansCash: p.titansCash,
            agendas: agendaDetails,
          };
        }),
      );
  
      const winner = results.reduce((best, p) =>
        p.totalScore > best.totalScore ? p : best,
      );
  
      res.json({ results, winnerSeat: winner.seat });
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