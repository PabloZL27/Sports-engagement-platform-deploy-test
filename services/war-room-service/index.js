const http = require("http");
const express = require("express");
const deps = require("./deps");
const mountRoutes = require("./routes");
const attachWebSocket = require("./websocket/attach");

const PORT = Number.parseInt(process.env.PORT || "4014", 10);

const app = express();
app.use(express.json());

mountRoutes(app, deps);

const server = http.createServer(app);
attachWebSocket(server, deps);

server.listen(PORT, () => {
  console.log(`war-room-service listening on port ${PORT}`);
});
