const registerMatchRoutes = require("./matches");
const registerActionRoutes = require("./actions");
const registerResultRoutes = require("./results");

module.exports = function mountRoutes(app, deps) {
  registerMatchRoutes(app, deps);
  registerActionRoutes(app, deps);
  registerResultRoutes(app, deps);
};
