const express = require("express");
const { randomUUID } = require("crypto");
const { pool } = require("./db");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 4012;
const MAX_CATEGORY_LENGTH = 100;
const MAX_SUBJECT_LENGTH = 160;
const MAX_MESSAGE_LENGTH = 1500;
const MAX_IMAGES = 5;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODERATION_MODEL = process.env.OPENAI_MODERATION_MODEL || "omni-moderation-latest";
const BLOCKED_WORDS = new Set([
  "chingada",
  "chingado",
  "chingar",
  "chingas",
  "chingues",
  "cojuda",
  "cojudo",
  "cojer",
  "culera",
  "culero",
  "estupida",
  "estupido",
  "idiota",
  "imbecil",
  "mierda",
  "pene",
  "pendeja",
  "pendejo",
  "pinche",
  "puta",
  "puto",
]);

function getImageUrls(value) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) return null;

  const urls = value.map((item) => (typeof item === "string" ? item.trim() : ""));
  if (urls.some((item) => !item)) return null;

  return urls;
}

function normalizeForModeration(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function findBlockedWord(value) {
  const tokens = normalizeForModeration(value)
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  for (const token of tokens) {
    if (BLOCKED_WORDS.has(token)) {
      return token;
    }
  }

  return null;
}

async function moderateWithOpenAI(subject, message) {
  if (!OPENAI_API_KEY) {
    return { enabled: false, flagged: false };
  }

  const response = await fetch("https://api.openai.com/v1/moderations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODERATION_MODEL,
      input: `Subject: ${subject}\nMessage: ${message}`,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    const apiError = data && data.error && data.error.message
      ? data.error.message
      : "OpenAI moderation request failed";
    throw new Error(apiError);
  }

  const result = Array.isArray(data.results) ? data.results[0] : null;

  return {
    enabled: true,
    flagged: Boolean(result && result.flagged),
    categories: result && result.categories ? result.categories : {},
  };
}

app.get("/health", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW() AS now");
    res.json({
      service: "feedback-service",
      status: "ok",
      db: "connected",
      time: result.rows[0].now
    });
  } catch (error) {
    res.status(500).json({
      service: "feedback-service",
      status: "error",
      db: "disconnected",
      error: error.message
    });
  }
});

app.post("/", async (req, res) => {
  try {
    const category = typeof req.body.category === "string" ? req.body.category.trim() : "";
    const subject = typeof req.body.subject === "string" ? req.body.subject.trim() : "";
    const message = typeof req.body.message === "string" ? req.body.message.trim() : "";
    const imageUrls = getImageUrls(req.body.image_urls);
    const blockedSubjectWord = findBlockedWord(subject);
    const blockedMessageWord = findBlockedWord(message);

    if (!category) return res.status(400).json({ error: "category is required" });
    if (!subject) return res.status(400).json({ error: "subject is required" });
    if (!message) return res.status(400).json({ error: "message is required" });
    if (category.length > MAX_CATEGORY_LENGTH) {
      return res.status(400).json({ error: `category must be ${MAX_CATEGORY_LENGTH} characters or fewer` });
    }
    if (subject.length > MAX_SUBJECT_LENGTH) {
      return res.status(400).json({ error: `subject must be ${MAX_SUBJECT_LENGTH} characters or fewer` });
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({ error: `message must be ${MAX_MESSAGE_LENGTH} characters or fewer` });
    }
    if (imageUrls === null) {
      return res.status(400).json({ error: "image_urls must be an array of non-empty strings" });
    }
    if (imageUrls.length > MAX_IMAGES) {
      return res.status(400).json({ error: `image_urls supports a maximum of ${MAX_IMAGES} images` });
    }
    if (blockedSubjectWord) {
      return res.status(400).json({ error: "subject contains offensive language" });
    }
    if (blockedMessageWord) {
      return res.status(400).json({ error: "message contains offensive language" });
    }

    const moderation = await moderateWithOpenAI(subject, message);
    if (moderation.flagged) {
      return res.status(400).json({
        error: "feedback was blocked by moderation",
        moderation: moderation.categories,
      });
    }

    const result = await pool.query(
      `INSERT INTO recommendations (id, category, subject, message, image_urls, created_at)
       VALUES ($1, $2, $3, $4, $5::jsonb, NOW())
       RETURNING id, category, subject, message, image_urls, created_at`,
      [randomUUID(), category, subject, message, JSON.stringify(imageUrls)]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (OPENAI_API_KEY && /OpenAI moderation/i.test(error.message)) {
      return res.status(503).json({ error: "moderation service unavailable" });
    }
    res.status(500).json({ error: error.message });
  }
});

app.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, category, subject, message, image_urls, created_at
       FROM recommendations
       ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/:id", async (req, res) => {
  try {
    if (!UUID_RE.test(req.params.id)) {
      return res.status(400).json({ error: "Invalid feedback id" });
    }

    const result = await pool.query(
      `SELECT id, category, subject, message, image_urls, created_at
       FROM recommendations
       WHERE id = $1
       LIMIT 1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Feedback not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`feedback-service listening on port ${PORT}`);
});
