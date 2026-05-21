module.exports = function registerActionRoutes(app, deps) {
  const {
    pool,
    asyncRoute,
    resolveAccountIdFromRequest,
    broadcastMatch,
    advanceTurn,
  } = deps;

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
};
