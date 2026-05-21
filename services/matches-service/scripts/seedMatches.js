require("dotenv").config();
const { Pool } = require("pg");

const ESPN_TEAM_ID = 10;
const SEASON_YEAR = Number(process.env.SEASON_YEAR || 2025);

const ESPN_SCHEDULE_URL =
  `https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/${ESPN_TEAM_ID}/schedule?season=${SEASON_YEAR}`;

const pool = new Pool({
  connectionString: process.env.MATCHES_DB_URL,
});

function toNullableNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function mapStatus(statusName) {
  if (!statusName) return "upcoming";

  const normalized = statusName.toLowerCase();

  if (normalized.includes("final")) return "finished";
  if (normalized.includes("in_progress") || normalized.includes("progress")) return "live";
  if (normalized.includes("scheduled") || normalized.includes("pre")) return "upcoming";

  return normalized;
}

async function upsertSeason(client, year) {
  await client.query(
    `
    INSERT INTO season (year)
    VALUES ($1)
    ON CONFLICT (year) DO NOTHING
    `,
    [year]
  );
}

async function upsertVenue(client, venue) {
  if (!venue) return null;

  const espnVenueId = venue.id ? String(venue.id) : null;
  const name = venue.fullName || venue.name || null;
  const city = venue.address?.city || null;
  const state = venue.address?.state || null;
  const location = [city, state].filter(Boolean).join(", ") || null;

  const result = await client.query(
    `
    INSERT INTO venues (espn_venue_id, name, city, state, location)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (espn_venue_id)
    WHERE espn_venue_id IS NOT NULL
    DO UPDATE SET
      name = EXCLUDED.name,
      city = EXCLUDED.city,
      state = EXCLUDED.state,
      location = EXCLUDED.location
    RETURNING id
    `,
    [espnVenueId, name, city, state, location]
  );

  return result.rows[0].id;
}

async function upsertTeam(client, team) {
  const espnTeamId = toNullableNumber(team.id);
  const abbreviation = team.abbreviation || null;
  const location = team.location || null;
  const displayName = team.displayName || team.name || null;
  const logoUrl = team.logo || team.logos?.[0]?.href || null;

  const result = await client.query(
    `
    INSERT INTO team (espn_team_id, abbreviation, location, display_name, logo_url)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (espn_team_id)
    WHERE espn_team_id IS NOT NULL
    DO UPDATE SET
      abbreviation = EXCLUDED.abbreviation,
      location = EXCLUDED.location,
      display_name = EXCLUDED.display_name,
      logo_url = EXCLUDED.logo_url
    RETURNING id
    `,
    [espnTeamId, abbreviation, location, displayName, logoUrl]
  );

  return result.rows[0].id;
}

async function upsertMatch(client, event, venueId) {
  const espnEventId = toNullableNumber(event.id);
  const weekNum = event.week?.number || null;
  const week = event.week?.text || (weekNum ? `Week ${weekNum}` : null);

  const status =
    mapStatus(event.status?.type?.name) ||
    mapStatus(event.status?.type?.state);

  const result = await client.query(
    `
    INSERT INTO matches (
      espn_event_id,
      season_year,
      week_num,
      week,
      name,
      short_name,
      start_time,
      venue_id,
      status
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    ON CONFLICT (espn_event_id)
    WHERE espn_event_id IS NOT NULL
    DO UPDATE SET
      season_year = EXCLUDED.season_year,
      week_num = EXCLUDED.week_num,
      week = EXCLUDED.week,
      name = EXCLUDED.name,
      short_name = EXCLUDED.short_name,
      start_time = EXCLUDED.start_time,
      venue_id = EXCLUDED.venue_id,
      status = EXCLUDED.status
    RETURNING match_id
    `,
    [
      espnEventId,
      SEASON_YEAR,
      weekNum,
      week,
      event.name || null,
      event.shortName || null,
      event.date || null,
      venueId,
      status,
    ]
  );

  return result.rows[0].match_id;
}

async function upsertGameTeam(client, matchId, teamId, competitor, espnEventId) {
  const homeAway = competitor.homeAway === "home";
  const score = toNullableNumber(competitor.score);

  const winner =
    competitor.winner === undefined || competitor.winner === null
      ? null
      : Boolean(competitor.winner);

  await client.query(
    `
    INSERT INTO game (espn_event_id, match_id, team_id, home_away, score_value, winner)
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (match_id, team_id)
    DO UPDATE SET
      espn_event_id = EXCLUDED.espn_event_id,
      home_away = EXCLUDED.home_away,
      score_value = EXCLUDED.score_value,
      winner = EXCLUDED.winner
    `,
    [espnEventId, matchId, teamId, homeAway, score, winner]
  );
}

async function seedMatches() {
  const client = await pool.connect();

  try {
    console.log(`Fetching ESPN schedule: ${ESPN_SCHEDULE_URL}`);

    const response = await fetch(ESPN_SCHEDULE_URL);

    if (!response.ok) {
      throw new Error(`ESPN request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const events = data.events || [];

    console.log(`Found ${events.length} events`);

    await client.query("BEGIN");

    await upsertSeason(client, SEASON_YEAR);

    for (const event of events) {
      const competition = event.competitions?.[0];
      if (!competition) continue;

      const venueId = await upsertVenue(client, competition.venue);
      const matchId = await upsertMatch(client, event, venueId);

      const competitors = competition.competitors || [];

      for (const competitor of competitors) {
        const teamId = await upsertTeam(client, competitor.team);
        await upsertGameTeam(client, matchId, teamId, competitor, toNullableNumber(event.id));
      }

      console.log(`Synced match ${event.id}: ${event.name}`);
    }

    // ⚡ DEMO STATE OVERRIDE

    // 1. poner todo como upcoming
    await client.query(`
      UPDATE matches
      SET status = 'upcoming'
    `);

    await client.query(`
      UPDATE game
      SET score_value = NULL,
          winner = NULL
    `);


    // 2. partido terminado (Week 1)
    await client.query(`
      UPDATE matches
      SET status = 'finished'
      WHERE week_num = 1
    `);

    await client.query(`
      UPDATE game
      SET score_value = CASE 
        WHEN home_away = true THEN 24
        ELSE 17
      END,
      winner = CASE 
        WHEN home_away = true THEN true
        ELSE false
      END
      WHERE match_id = (
        SELECT match_id FROM matches WHERE week_num = 1 LIMIT 1
      )
    `);


    // 3. partido en vivo (Week 2)
    await client.query(`
      UPDATE matches
      SET status = 'live'
      WHERE week_num = 2
    `);

    await client.query(`
      UPDATE game
      SET score_value = CASE 
        WHEN home_away = true THEN 14
        ELSE 10
      END,
      winner = NULL
      WHERE match_id = (
        SELECT match_id FROM matches WHERE week_num = 2 LIMIT 1
      )
    `);

    await client.query("COMMIT");

    console.log("Matches seed completed successfully");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Seed failed:", error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

seedMatches();