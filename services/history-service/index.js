const express = require("express");
const { pool } = require("./db");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 4008;
const DEFAULT_TEAM_SLUG = "tennessee-titans";

async function getHistoryPageContext(teamSlug = DEFAULT_TEAM_SLUG) {
  const result = await pool.query(
    `
      SELECT
        hp.page_id,
        hp.slug AS page_slug,
        hp.title AS page_title,
        hp.language_code,
        hp.is_published,
        t.team_id,
        t.slug AS team_slug,
        t.name AS team_name
      FROM history_pages hp
      JOIN teams t
        ON t.team_id = hp.team_id
      WHERE t.slug = $1
         OR hp.slug = $1
      ORDER BY
        CASE WHEN hp.is_published THEN 0 ELSE 1 END,
        CASE WHEN t.slug = $1 THEN 0 ELSE 1 END,
        hp.updated_at DESC NULLS LAST,
        hp.page_id DESC
      LIMIT 1
    `,
    [teamSlug],
  );

  return result.rows[0] || null;
}

async function getHeroByPageId(pageId) {
  const result = await pool.query(
    `
      SELECT
        title,
        subtitle
      FROM history_hero
      WHERE page_id = $1
      ORDER BY updated_at DESC NULLS LAST, hero_id DESC
      LIMIT 1
    `,
    [pageId],
  );

  return result.rows[0] || { title: "", subtitle: "" };
}

async function getHistoryStatsByPageId(pageId) {
  const result = await pool.query(
    `
      SELECT
        slug AS id,
        value,
        label,
        sublabel
      FROM history_stats
      WHERE page_id = $1
      ORDER BY display_order NULLS LAST, stat_id
    `,
    [pageId],
  );

  return result.rows;
}

async function getTimelineEventsByPageId(pageId) {
  const result = await pool.query(
    `
      SELECT
        te.slug AS id,
        COALESCE(te.event_year::text, TO_CHAR(te.event_date, 'YYYY')) AS year,
        te.title,
        te.description,
        te.full_story AS "fullStory",
        te.significance,
        COALESCE(te.image_url, '') AS image,
        te.image_reference_url AS "imageReferenceUrl",
        COALESCE(te.alt_text, te.title) AS alt,
        COALESCE(te.link_label, 'View Full Story') AS "linkLabel",
        COALESCE(te.external_url, '') AS "externalUrl",
        te.source_label AS "sourceLabel",
        COALESCE(facts.items, ARRAY[]::text[]) AS facts,
        te.quote,
        te.source_note AS "sourceNote"
      FROM timeline_events te
      LEFT JOIN LATERAL (
        SELECT array_agg(tef.fact_text ORDER BY tef.display_order NULLS LAST, tef.fact_id) AS items
        FROM timeline_event_facts tef
        WHERE tef.event_id = te.event_id
      ) facts ON TRUE
      WHERE te.page_id = $1
      ORDER BY te.display_order NULLS LAST, te.event_id
    `,
    [pageId],
  );

  return result.rows;
}

async function getLegendaryPlayersByPageId(pageId) {
  const result = await pool.query(
    `
      SELECT
        lp.slug AS id,
        lp.name,
        lp.position,
        lp.era,
        lp.subtitle,
        lp.short_description AS "shortDescription",
        lp.bio,
        COALESCE(stats.items, '[]'::json) AS stats,
        COALESCE(achievements.items, '[]'::json) AS achievements,
        lp.image_url AS "imageUrl",
        lp.card_image_position_class AS "cardImagePositionClass"
      FROM legendary_players lp
      LEFT JOIN LATERAL (
        SELECT json_agg(
          json_build_object(
            'label', lps.label,
            'value', lps.value
          )
          ORDER BY lps.display_order NULLS LAST, lps.player_stat_id
        ) AS items
        FROM legendary_player_stats lps
        WHERE lps.player_id = lp.player_id
      ) stats ON TRUE
      LEFT JOIN LATERAL (
        SELECT json_agg(
          lpa.achievement_text
          ORDER BY lpa.display_order NULLS LAST, lpa.achievement_id
        ) AS items
        FROM legendary_player_achievements lpa
        WHERE lpa.player_id = lp.player_id
      ) achievements ON TRUE
      WHERE lp.page_id = $1
      ORDER BY lp.display_order NULLS LAST, lp.player_id
    `,
    [pageId],
  );

  return result.rows;
}

async function getClassicMatchesByPageId(pageId) {
  const result = await pool.query(
    `
      SELECT
        slug AS id,
        title,
        season_label AS season,
        opponent,
        score,
        description,
        youtube_url AS "youtubeUrl",
        image_url AS "imageUrl",
        COALESCE(button_label, 'Watch Highlights') AS "buttonLabel"
      FROM classic_matches
      WHERE page_id = $1
      ORDER BY display_order NULLS LAST, match_id
    `,
    [pageId],
  );

  return result.rows;
}

async function getHistoryPageData(teamSlug = DEFAULT_TEAM_SLUG) {
  const page = await getHistoryPageContext(teamSlug);

  if (!page) {
    return null;
  }

  const [hero, historyStats, timelineEvents, legendaryPlayers, classicMatches] =
    await Promise.all([
      getHeroByPageId(page.page_id),
      getHistoryStatsByPageId(page.page_id),
      getTimelineEventsByPageId(page.page_id),
      getLegendaryPlayersByPageId(page.page_id),
      getClassicMatchesByPageId(page.page_id),
    ]);

  return {
    hero,
    historyStats,
    timelineEvents,
    legendaryPlayers,
    classicMatches,
  };
}

function resolveTeamSlug(req) {
  return req.params.teamSlug || req.query.teamSlug || DEFAULT_TEAM_SLUG;
}

function buildDatabaseError(error) {
  if (error.code === "42501") {
    return "Database permission denied for history-service user";
  }

  return error.message;
}

function asyncHandler(handler) {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (error) {
      console.error("history-service error:", error);
      res.status(500).json({
        status: "error",
        error: buildDatabaseError(error),
      });
    }
  };
}

app.get("/", (req, res) => {
  res.json({
    service: "history-service",
    status: "ok",
    endpoints: [
      "/health",
      "/hero",
      "/history/hero",
      "/stats",
      "/history/stats",
      "/timeline",
      "/history/timeline",
      "/players",
      "/history/players",
      "/matches",
      "/history/matches",
      "/history-page/:teamSlug",
      "/overview",
    ],
  });
});

app.get("/health", asyncHandler(async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW() AS now");
    res.json({
      service: "history-service",
      status: "ok",
      db: "connected",
      time: result.rows[0].now,
    });
  } catch (error) {
    res.status(500).json({
      service: "history-service",
      status: "error",
      db: "disconnected",
      error: error.message,
    });
  }
}));

app.get(["/hero", "/history/hero"], asyncHandler(async (req, res) => {
  const page = await getHistoryPageContext(resolveTeamSlug(req));

  if (!page) {
    return res.status(404).json({
      status: "error",
      error: "History page not found",
    });
  }

  const hero = await getHeroByPageId(page.page_id);
  res.json(hero);
}));

app.get(["/stats", "/history/stats"], asyncHandler(async (req, res) => {
  const page = await getHistoryPageContext(resolveTeamSlug(req));

  if (!page) {
    return res.status(404).json({
      status: "error",
      error: "History page not found",
    });
  }

  const historyStats = await getHistoryStatsByPageId(page.page_id);
  res.json(historyStats);
}));

app.get(["/timeline", "/history/timeline"], asyncHandler(async (req, res) => {
  const page = await getHistoryPageContext(resolveTeamSlug(req));

  if (!page) {
    return res.status(404).json({
      status: "error",
      error: "History page not found",
    });
  }

  const timelineEvents = await getTimelineEventsByPageId(page.page_id);
  res.json(timelineEvents);
}));

app.get(["/players", "/history/players"], asyncHandler(async (req, res) => {
  const page = await getHistoryPageContext(resolveTeamSlug(req));

  if (!page) {
    return res.status(404).json({
      status: "error",
      error: "History page not found",
    });
  }

  const legendaryPlayers = await getLegendaryPlayersByPageId(page.page_id);
  res.json(legendaryPlayers);
}));

app.get(["/matches", "/history/matches"], asyncHandler(async (req, res) => {
  const page = await getHistoryPageContext(resolveTeamSlug(req));

  if (!page) {
    return res.status(404).json({
      status: "error",
      error: "History page not found",
    });
  }

  const classicMatches = await getClassicMatchesByPageId(page.page_id);
  res.json(classicMatches);
}));

app.get(
  ["/history-page/:teamSlug?", "/overview", "/history/overview"],
  asyncHandler(async (req, res) => {
    const historyPage = await getHistoryPageData(resolveTeamSlug(req));

    if (!historyPage) {
      return res.status(404).json({
        status: "error",
        error: "History page not found",
      });
    }

    res.json(historyPage);
  }),
);

app.listen(PORT, () => {
  console.log(`history-service listening on port ${PORT}`);
});
