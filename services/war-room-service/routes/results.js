module.exports = function registerResultRoutes(app, deps) {
  const {
    pool,
    asyncRoute,
    resolveAccountIdFromRequest,
    evaluateAgendas,
  } = deps;

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

          const { agendaBonus, agendaDetails } = await evaluateAgendas(
            p,
            tiers,
            handTotal,
            actions,
          );
  
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
};
