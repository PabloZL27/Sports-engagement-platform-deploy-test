const express = require("express");
const { ensureSchema, getPool, NEWS_DB_URL } = require("./db");

const app = express();
app.use(express.json());
app.use((req, res, next) => {
  console.log(`${req.method} ${req.originalUrl}`);
  next();
});

const PORT = process.env.PORT || 4011;
const NEWS_API_BASE_URL =
  process.env.NEWS_API_BASE_URL || "https://newsapi.org/v2/everything";
const NEWS_API_KEY = process.env.NEWS_API_KEY || process.env.VITE_NEWS_API_KEY;
const NEWS_QUERY = process.env.NEWS_QUERY || "tennessee-titans";
const NEWS_PAGE_SIZE = Number.parseInt(process.env.NEWS_PAGE_SIZE || "24", 10);
const NEWS_SORT = process.env.NEWS_SORT || "publishedAt";
const NEWS_LANGUAGE = process.env.NEWS_LANGUAGE || "en";

function normalizeArticle(article) {
  return {
    source: {
      name: article.source?.name || "Unknown",
    },
    url: article.url || "",
    title: article.title || "",
    description: article.description || "",
    author: article.author || "",
    urlToImage: article.urlToImage || "",
    content: article.content || "",
    publishedAt: article.publishedAt || null,
  };
}

function buildNewsUrl(options = {}) {
  const pageSize = options.pageSize || NEWS_PAGE_SIZE;
  const sortBy = options.sortBy || NEWS_SORT;
  const query = options.q || NEWS_QUERY;

  const url = new URL(NEWS_API_BASE_URL);
  url.searchParams.set("q", query);
  url.searchParams.set("apiKey", NEWS_API_KEY || "");
  url.searchParams.set("pageSize", String(pageSize));
  url.searchParams.set("sortBy", sortBy);
  url.searchParams.set("language", NEWS_LANGUAGE);

  return url;
}

async function saveArticlesToDB(articles) {
  const safeArticles = Array.isArray(articles) ? articles : [];
  await ensureSchema();
  const client = await getPool().connect();

  let insertedArticles = 0;
  let insertedSources = 0;

  try {
    await client.query("BEGIN");

    for (const article of safeArticles) {
      if (!article.url) {
        continue;
      }

      const sourceName = article.source?.name || "Unknown";

      const sourceResult = await client.query(
        `
        INSERT INTO source (name)
        VALUES ($1)
        ON CONFLICT (name)
        DO NOTHING
        RETURNING id
        `,
        [sourceName]
      );

      let sourceId;

      if (sourceResult.rows.length > 0) {
        sourceId = sourceResult.rows[0].id;
        insertedSources += 1;
      } else {
        const existing = await client.query(
          `SELECT id FROM source WHERE name = $1`,
          [sourceName]
        );

        if (existing.rows.length === 0) {
          throw new Error(`Source not found after conflict: ${sourceName}`);
        }

        sourceId = existing.rows[0].id;
      }

      const articleResult = await client.query(
        `
        INSERT INTO article (
          source_id,
          url,
          title,
          description,
          author,
          url_to_image,
          content,
          published_at
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        ON CONFLICT (url) DO NOTHING
        RETURNING 1
        `,
        [
          sourceId,
          article.url,
          article.title,
          article.description,
          article.author,
          article.urlToImage,
          article.content,
          article.publishedAt,
        ]
      );

      if (articleResult.rows.length > 0) {
        insertedArticles += 1;
      }
    }

    await client.query("COMMIT");

    return {
      receivedCount: safeArticles.length,
      insertedSources,
      insertedArticles,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function fetchArticles(options = {}) {
  if (!NEWS_API_KEY) {
    throw new Error("Missing NEWS_API_KEY environment variable.");
  }

  const response = await fetch(buildNewsUrl(options).toString());
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || `HTTP error ${response.status}`);
  }

  return Array.isArray(data.articles)
    ? data.articles.map(normalizeArticle)
    : [];
}

app.get("/health", (req, res) => {
  res.json({
    service: "news-service",
    status: "ok",
    apiKeyConfigured: Boolean(NEWS_API_KEY),
    dbConfigured: Boolean(NEWS_DB_URL),
    query: NEWS_QUERY,
    pageSize: NEWS_PAGE_SIZE,
    sortBy: NEWS_SORT,
  });
});

app.get("/", async (req, res) => {
  try {
    const articles = await fetchArticles({ pageSize: 24 });

    res.json({
      service: "news-service",
      query: NEWS_QUERY,
      articles,
    });
  } catch (error) {
    res.status(500).json({
      service: "news-service",
      status: "error",
      error: error.message,
    });
  }
});

app.get("/articles", async (req, res) => {
  try {
    const articles = await fetchArticles({ pageSize: 24 });

    res.json({
      service: "news-service",
      query: NEWS_QUERY,
      articles,
    });
  } catch (error) {
    res.status(500).json({
      service: "news-service",
      status: "error",
      error: error.message,
    });
  }
});

app.post("/articles/sync", async (req, res) => {
  try {
    const articles = await fetchArticles({ pageSize: 24 });
    const dbResult = await saveArticlesToDB(articles);

    res.json({
      service: "news-service",
      status: "ok",
      query: NEWS_QUERY,
      ...dbResult,
    });
  } catch (error) {
    console.error("Error saving articles:", error);

    res.status(500).json({
      service: "news-service",
      status: "error",
      error: error.message,
    });
  }
});

app.get("/popular-one", async (req, res) => {
  try {
    const articles = await fetchArticles({
      pageSize: 1,
      sortBy: "relevancy",
      q: "tennessee-titans",
    });

    res.json({
      service: "news-service",
      query: "tennessee-titans",
      sortBy: "relevancy",
      pageSize: 1,
      articles,
    });
  } catch (error) {
    res.status(500).json({
      service: "news-service",
      status: "error",
      error: error.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`news-service listening on port ${PORT}`);
});
