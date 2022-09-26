import "dotenv/config";

import { Client, GatewayIntentBits, Partials } from "discord.js";
import Logger from "./util/logger";
import RoleSelection from "./helpers/role-selection";
import GamerArticles from "./helpers/gamer-articles";
import Command from "./commands/command";
import CommandStats from "./commands/stats";
import CommandChampion from "./commands/champion";
import CommandLiveGame from "./commands/live";

const IS_DEV = process.env.DEV === "true" ? true : false;
const DISCORD_TOKEN = IS_DEV
  ? process.env.DISCORD_BOT_DEV_TOKEN
  : process.env.DISCORD_BOT_TOKEN;

class Bot {
  private client: Client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildMessageReactions,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.DirectMessages,
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction],
  });

  private commands: Command[] = [];

  constructor() {
    this.addListeners();
  }

  addListeners() {
    this.client.on("ready", () => {
      Logger.Info("Bot online");

      this.addHelpers();
      this.registerCommands();
    });
  }

  addHelpers() {
    new RoleSelection(this.client);
    new GamerArticles(this.client);
  }

  registerCommands() {
    this.commands.push(new CommandStats(this.client));
    this.commands.push(new CommandChampion(this.client));
    this.commands.push(new CommandLiveGame(this.client));
  }

  start() {
    this.client.login(DISCORD_TOKEN ?? "");
  }
}

const bot = new Bot();

bot.start();
