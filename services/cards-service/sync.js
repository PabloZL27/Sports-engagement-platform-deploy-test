const { Pool } = require("pg");
const fetch = require("node-fetch");

const pool = new Pool({
  connectionString: process.env.CARDS_DB_URL
});

const ESPN_ROSTER_URL =
  "https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/10/roster";

const ESPN_STATS_URL = (espnAthleteId) =>
  `https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/athletes/${espnAthleteId}/statistics`;

const RARITY_WEIGHTS = ["common", "common", "common", "rare", "elite", "titan"];

function assignRarity() {
  return RARITY_WEIGHTS[Math.floor(Math.random() * RARITY_WEIGHTS.length)];
}

/**
 * Finds a stat value by name within the splits.categories array.
 * categories is an array like: [{ name: "general", stats: [{ name: "gamesPlayed", value: 17 }, ...] }, ...]
 */
function extractStat(categories, categoryName, statName) {
  const category = categories.find((c) => c.name === categoryName);
  if (!category) return null;
  const stat = (category.stats || []).find((s) => s.name === statName);
  return stat != null ? (stat.value ?? null) : null;
}

async function fetchAthleteStats(espnAthleteId) {
  try {
    const response = await fetch(ESPN_STATS_URL(espnAthleteId));
    if (!response.ok) {
      // 404 is expected for players with no stats (e.g., rookies, practice squad)
      if (response.status === 404) return null;
      throw new Error(`ESPN stats API returned ${response.status}`);
    }

    const data = await response.json();

    // The stats live inside splits[0].categories (regular season, current year)
    const splits = data.splits?.categories
      ? data.splits.categories          // flat structure
      : data.splits?.splits?.[0]?.categories; // nested structure

    if (!splits) return null;

    const gamesPlayed    = extractStat(splits, "general",  "gamesPlayed");
    const passes         = extractStat(splits, "passing",  "completions");
    const pYards         = extractStat(splits, "passing",  "passingYards");
    const passingTDs     = extractStat(splits, "passing",  "passingTouchdowns");
    const interceptions  = extractStat(splits, "passing",  "interceptions");
    const rYards         = extractStat(splits, "rushing",  "rushingYards");
    const rushingTDs     = extractStat(splits, "rushing",  "rushingTouchdowns");
    const receivingTDs   = extractStat(splits, "receiving", "receivingTouchdowns");

    // Total touchdowns = passing + rushing + receiving (null-safe)
    const touchdowns =
      (passingTDs ?? 0) + (rushingTDs ?? 0) + (receivingTDs ?? 0) || null;

    return { gamesPlayed, passes, pYards, interceptions, rYards, touchdowns };
  } catch (err) {
    console.warn(`  ⚠ Could not fetch stats for ESPN ID ${espnAthleteId}: ${err.message}`);
    return null;
  }
}

async function syncRoster() {
  console.log("Fetching Tennessee Titans roster from ESPN...");

  try {
    const response = await fetch(ESPN_ROSTER_URL);
    if (!response.ok) {
      throw new Error(`ESPN API responded with status ${response.status}`);
    }

    const data = await response.json();
    const groups = data.athletes || [];

    let athletesSynced = 0;

    for (const group of groups) {
      const players = group.items || [];

      for (const player of players) {
        const espnId = parseInt(player.id);
        const displayName = player.displayName || player.fullName;
        const position = player.position?.abbreviation || null;
        const jerseyNum = player.jersey ? parseInt(player.jersey) : null;
        const age = player.age || null;
        const weight = player.weight || null;
        const height = player.height || null;
        const headshotUrl = player.headshot?.href || null;
        const experienceYears = player.experience?.years || 0;
        const debutYear =
          experienceYears > 0 ? new Date().getFullYear() - experienceYears : null;

        // 1. Upsert athlete
        const athleteResult = await pool.query(
          `INSERT INTO athletes (espn_athlete_id, display_name, weight, height, age, debut_year, position, jersey_num, headshot_url, athlete_status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE)
           ON CONFLICT (espn_athlete_id) DO UPDATE SET
             display_name = EXCLUDED.display_name,
             weight       = EXCLUDED.weight,
             height       = EXCLUDED.height,
             age          = EXCLUDED.age,
             debut_year   = EXCLUDED.debut_year,
             position     = EXCLUDED.position,
             jersey_num   = EXCLUDED.jersey_num,
             headshot_url = EXCLUDED.headshot_url,
             athlete_status = TRUE
           RETURNING athlete_id`,
          [espnId, displayName, weight, height, age, debutYear, position, jerseyNum, headshotUrl]
        );

        const athleteId = athleteResult.rows[0].athlete_id;

        // 2. Fetch and upsert statistics
        const stats = await fetchAthleteStats(espnId);
        if (stats) {
          await pool.query(
            `INSERT INTO athlete_statistics
               (athlete_id, games_played, passes, p_yards, r_yards, interceptions, touchdowns)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (athlete_id) DO UPDATE SET
               games_played   = EXCLUDED.games_played,
               passes         = EXCLUDED.passes,
               p_yards        = EXCLUDED.p_yards,
               r_yards        = EXCLUDED.r_yards,
               interceptions  = EXCLUDED.interceptions,
               touchdowns     = EXCLUDED.touchdowns,
               updated_at     = NOW()`,
            [
              athleteId,
              stats.gamesPlayed,
              stats.passes,
              stats.pYards,
              stats.rYards,
              stats.interceptions,
              stats.touchdowns,
            ]
          );
        }

        // 3. Create card if it doesn't exist yet
        await pool.query(
          `INSERT INTO cards (athlete_id, rarity)
           VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [athleteId, assignRarity()]
        );

        athletesSynced++;
        const statsTag = stats ? `✓ stats` : `– no stats`;
        console.log(`  Synced: ${displayName} (${position} #${jerseyNum}) [${statsTag}]`);
      }
    }

    // Log sync
    await pool.query(
      `INSERT INTO cards_sync_log (source, athletes_synced, status)
       VALUES ($1, $2, $3)`,
      ["espn_api", athletesSynced, "success"]
    );

    console.log(`\nSync complete: ${athletesSynced} athletes synced.`);
  } catch (error) {
    await pool.query(
      `INSERT INTO cards_sync_log (source, athletes_synced, status)
       VALUES ($1, $2, $3)`,
      ["espn_api", 0, `error: ${error.message}`]
    ).catch(() => {});

    console.error("Sync failed:", error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

syncRoster();
