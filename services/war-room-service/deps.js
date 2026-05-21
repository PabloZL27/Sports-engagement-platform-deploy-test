const { pool } = require("./db");
const { resolveAccountIdFromRequest } = require("./profile");
const helpers = require("./lib/helpers");
const ws = require("./lib/websocket");
const game = require("./lib/game");

game.setBroadcast(ws.broadcastMatch);

module.exports = {
  pool,
  resolveAccountIdFromRequest,
  ...helpers,
  ...ws,
  ...game,
};
