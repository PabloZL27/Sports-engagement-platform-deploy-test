module.exports = function registerMatchRoutes(app, deps) {
  const {
    pool,
    asyncRoute,
    resolveAccountIdFromRequest,
    generateInviteCode,
    broadcastMatch,
    initializeGame,
  } = deps;

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
};
