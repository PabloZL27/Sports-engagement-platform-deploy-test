const { WebSocketServer } = require("ws");

module.exports = function attachWebSocket(server, deps) {
  const {
    pool,
    resolveAccountIdFromRequest,
    addSocket,
    broadcastMatch,
  } = deps;

  const wss = new WebSocketServer({ server, path: "/socket" });

wss.on("connection", (socket) => {
  let handshakeDone = false;

  const fail = (code, reason) => {
    try {
      socket.close(code, reason);
    } catch (_) {
      /* ignore */
    }
  };

  socket.once("message", async (raw) => {
    try {
      const text = Buffer.isBuffer(raw)
        ? raw.toString("utf8")
        : String(raw ?? "");
      const parsed = JSON.parse(text);

      if (!parsed || parsed.type !== "auth") {
        fail(1008, "Handshake required");
        return;
      }

      const matchId = String(parsed.matchId || "").trim();
      let authorizationHeader = parsed.authorizationHeader;

      if (Array.isArray(authorizationHeader)) {
        authorizationHeader = authorizationHeader[0] || "";
      }

      if (
        !matchId ||
        typeof authorizationHeader !== "string" ||
        !authorizationHeader
      ) {
        fail(1008, "Invalid handshake payload");
        return;
      }

      const fakeReq = { headers: { authorization: authorizationHeader } };

      let accountId;
      try {
        const resolved = await resolveAccountIdFromRequest(fakeReq);
        accountId = resolved.accountId;
      } catch (error) {
        fail(error.status === 401 ? 4401 : 4400, "Unauthorized");
        return;
      }

      const membership = await pool.query(
        `SELECT seat FROM war_match_players
         WHERE match_id = $1::uuid AND account_id = $2
         LIMIT 1;`,
        [matchId, accountId],
      );

      if (membership.rowCount === 0) {
        fail(4403, "Forbidden");
        return;
      }

      const seat = membership.rows[0].seat;
      handshakeDone = true;

      addSocket(socket, matchId);

      socket.send(JSON.stringify({ type: "hello", matchId, seat }));

      broadcastMatch(
        matchId,
        { type: "war_room_event", name: "socket_connected", seat },
        socket,
      );

      socket.on("message", (nextRaw) => {
        const payload = Buffer.isBuffer(nextRaw)
          ? nextRaw.toString("utf8")
          : String(nextRaw ?? "");
        socket.send(JSON.stringify({ type: "noopEcho", payload }));
      });
    } catch (error) {
      console.error("websocket auth/handshake error:", error);
      fail(1011, "Server error");
    }
  });

  setTimeout(() => {
    if (!handshakeDone) fail(1008, "Auth timeout");
  }, 10_000);
});
  return wss;
};
