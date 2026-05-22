const crypto = require("crypto");
const { pool } = require("../db");

function asyncRoute(handler) {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (error) {
      const status =
        error.status >= 400 && error.status < 600 ? error.status : 500;
      if (status >= 500) console.error("war-room-service error:", error);
      const message =
        status >= 500
          ? "Internal Server Error"
          : error.message || "Request failed";
      res.status(status).json({ status: "error", error: message });
    }
  };
}

function generateInviteCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i += 1) {
    out += alphabet[crypto.randomInt(0, alphabet.length)];
  }
  return out;
}

pool
  .query(
    `ALTER TABLE war_match_players ADD COLUMN IF NOT EXISTS is_ready BOOLEAN NOT NULL DEFAULT FALSE;`,
  )
  .catch((err) => console.error("migration is_ready error:", err));

module.exports = { asyncRoute, generateInviteCode };
