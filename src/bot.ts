import "dotenv/config";

import { Client, GatewayIntentBits, Partials } from "discord.js";
import Logger from "./util/logger";
import RoleSelection from "./helpers/role-selection";
import GamerArticles from "./helpers/gamer-articles";

const IS_DEV = process.env.DEV === "true" ? true : false;
const DISCORD_TOKEN = IS_DEV
  ? process.env.DISCORD_BOT_DEV_TOKEN
  : process.env.DISCORD_BOT_TOKEN;

const client: Client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

client.on("ready", () => {
  Logger.Info("Bot online");
});

new RoleSelection(client);
new GamerArticles(client);

client.login(DISCORD_TOKEN ?? "");
