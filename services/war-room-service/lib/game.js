const { pool } = require("../db");

const CARDS_SERVICE_URL =
  process.env.CARDS_SERVICE_URL || "http://icarus-cards:4009";

let broadcastMatch = () => {};

function setBroadcast(fn) {
  broadcastMatch = fn;
}

async function fetchRoster() {
  const resp = await fetch(`${CARDS_SERVICE_URL}/roster`);
  if (!resp.ok) throw new Error(`cards-service returned ${resp.status}`);
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
      for (
        let i = 0;
        i < CARDS_PER_PLAYER && poolIndex < shuffled.length;
        i++, poolIndex++
      ) {
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

async function advanceTurn(
  client,
  matchId,
  currentGlobalTurn,
  activeSeat,
  totalSeats,
) {
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

async function evaluateAgendas(p, tiers, handTotal, actions) {
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
    else if (c === "hand_low_value_count")
      achieved = tiers.filter((t) => t <= 2).length >= 3;
    else if (c === "hand_high_value_count")
      achieved = tiers.filter((t) => t >= 4).length >= 4;
    else if (c === "titans_cash_gte") achieved = p.titansCash >= 5;
    else if (c === "hand_few_high_total")
      achieved = tiers.length <= 4 && handTotal >= 12;
    else if (c === "hand_all_low")
      achieved = tiers.length === 6 && tiers.every((t) => t <= 3);
    else if (c === "hand_mid_high_count")
      achieved = tiers.filter((t) => t >= 3).length >= 5;
    else if (c === "hand_value_count")
      achieved = tiers.filter((t) => t === 3).length >= 3;
    else if (c === "hand_value_count_high")
      achieved = tiers.filter((t) => t === 5).length >= 2;
    else if (c === "hand_combo") achieved = tiers.includes(4) && tiers.includes(5);
    else if (c === "hand_total_range")
      achieved = handTotal >= 15 && handTotal <= 20;
    else if (c === "hand_min_value")
      achieved = tiers.filter((t) => t >= 2).length >= 5;
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

  return { agendaBonus, agendaDetails };
}

module.exports = {
  setBroadcast,
  fetchRoster,
  buildTieredRoster,
  initializeGame,
  advanceTurn,
  evaluateAgendas,
};
