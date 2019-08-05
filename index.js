exports.config = require('./config.json');
exports.config.host = exports.config.host.replace(/\/$/, "");

if (this.config.discordClient.token && !this.config.extras.autoJoin) console.warn("[Warning] A bot token was provided, however it is not needed.");
if (this.config.discordClient.serverID && !this.config.extras.autoJoin) console.warn("[Warning] A server ID was provided, however it is not needed.");
if (!this.config.discordClient.token && this.config.extras.autoJoin) throw "[Error] A bot token is required for autoJoin to function.";
if (!this.config.discordClient.serverID && this.config.extras.autoJoin) throw "[Error] A server ID is required for autoJoin to function.";

require('./modules/express.js');