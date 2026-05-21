const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.MATCHES_DB_URL,
});

const TEAM_ID = 10;

function toSafeInt(value) {
  if (value === undefined || value === null || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

async function syncMatches(season = 2025) {
  const url = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/${TEAM_ID}/schedule?season=${season}`;

  console.log("Fetching ESPN data...");
  const res = await fetch(url);
  const data = await res.json();

  const events = data.events || [];

  for (const event of events) {
    const espnEventId = toSafeInt(event.id, null);
    if (espnEventId === null) continue;

    const liveMatch = await pool.query(
      `
      SELECT match_id
      FROM matches
      WHERE espn_event_id = $1
        AND status = 'live'
      `,
      [espnEventId]
    );

    if (liveMatch.rowCount === 0) continue;

    const matchId = liveMatch.rows[0].match_id;

    const competition = event.competitions?.[0];
    if (!competition) continue;

    const status = competition.status.type.name; // STATUS_SCHEDULED, STATUS_IN_PROGRESS, STATUS_FINAL

    const home = competition.competitors.find(c => c.homeAway === "home");
    const away = competition.competitors.find(c => c.homeAway === "away");

    let homeScore = null;
    let awayScore = null;

    if (status === "STATUS_IN_PROGRESS" || status === "STATUS_FINAL") {
      homeScore = toSafeInt(home?.score);
      awayScore = toSafeInt(away?.score);
    }

    if (homeScore === null && awayScore === null) {
      const currentScores = await pool.query(
        `
        SELECT home_away, score_value
        FROM game
        WHERE match_id = $1
        `,
        [matchId]
      );

      const homeCurrent = currentScores.rows.find(r => r.home_away === true)?.score_value ?? 0;
      const awayCurrent = currentScores.rows.find(r => r.home_away === false)?.score_value ?? 0;

      homeScore = Number(homeCurrent) + 3;
      awayScore = Number(awayCurrent);
    }


    if (homeScore !== null) {
      await pool.query(
        `
        UPDATE game
        SET score_value = $1,
            winner = $2
        WHERE match_id = $3
          AND team_id = (
            SELECT id FROM team WHERE espn_team_id = $4
          )
        `,
        [homeScore, Boolean(home?.winner), matchId, toSafeInt(home?.team?.id, null)]
      );
    }

    if (awayScore !== null) {
      await pool.query(
        `
        UPDATE game
        SET score_value = $1,
            winner = $2
        WHERE match_id = $3
          AND team_id = (
            SELECT id FROM team WHERE espn_team_id = $4
          )
        `,
        [awayScore, Boolean(away?.winner), matchId, toSafeInt(away?.team?.id, null)]
      );
    }

    console.log(`Updated match ${espnEventId}: ${homeScore}-${awayScore}`);
  }

  return { success: true };
}

module.exports = { syncMatches };