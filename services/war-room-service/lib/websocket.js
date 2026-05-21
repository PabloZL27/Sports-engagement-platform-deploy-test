const socketsByMatch = new Map();

function removeSocket(socket) {
  if (!socket._warRoomSubscriptions?.length) return;
  for (const { matchId } of socket._warRoomSubscriptions) {
    const set = socketsByMatch.get(matchId);
    if (!set) continue;
    set.delete(socket);
    if (set.size === 0) socketsByMatch.delete(matchId);
  }
  socket._warRoomSubscriptions = [];
}

function addSocket(socket, matchId) {
  if (!socketsByMatch.has(matchId)) socketsByMatch.set(matchId, new Set());
  socketsByMatch.get(matchId).add(socket);
  if (!socket._warRoomSubscriptions) {
    socket._warRoomSubscriptions = [];
    socket.once("close", () => removeSocket(socket));
    socket.once("error", () => removeSocket(socket));
  }
  socket._warRoomSubscriptions.push({ matchId });
}

function broadcastMatch(matchId, payload, exceptSocket = null) {
  const set = socketsByMatch.get(matchId);
  if (!set) return;
  const message = JSON.stringify(payload);
  for (const ws of set) {
    if (ws === exceptSocket) continue;
    if (ws.readyState === ws.OPEN) ws.send(message);
  }
}

module.exports = { broadcastMatch, addSocket, removeSocket };
