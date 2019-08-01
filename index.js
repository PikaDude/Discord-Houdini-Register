exports.config = require('./config.json');
exports.config.host = exports.config.host.replace(/\/$/, "");

require('./modules/express.js');
