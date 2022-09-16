require("dotenv").config();

const fs = require("fs");
const RoleSelection = require("./helpers/role-selection");

const { Client, GatewayIntentBits, Partials } = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

try {
  const cacheFile = fs.existsSync(process.env.CACHE_FILE);

  if (!cacheFile) {
    fs.writeFileSync(process.env.CACHE_FILE, JSON.stringify({}));
  } else {
    // Try to read the file as json

    JSON.parse(fs.readFileSync(process.env.CACHE_FILE, "utf-8"));
  }
} catch (e) {
  // Unable to parse.
  console.log("UNABLE TO PARSE CACHE FILE, RECREATING");

  fs.writeFileSync(process.env.CACHE_FILE, JSON.stringify({}));
}

client.on("ready", () => {
  console.log(`[INFO] - Bot up`);
});

new RoleSelection(client);

client.login(process.env.DISCORD_BOT_TOKEN);
