import { Client, Message } from "discord.js";
import createOrReturnCachefile, { Cache } from "../util/cache";

export default class Command {
  private bot: Client;
  public cache: Cache = createOrReturnCachefile();
  public name: string;
  public description: string;
  public prefix: string;
  public requiresAdmin: boolean;
  constructor(
    bot: Client,
    name: string,
    description: string = "",
    requiresAdmin: boolean = false
  ) {
    this.bot = bot;
    this.name = name;
    this.description = description;
    this.prefix = "?";
    this.requiresAdmin = requiresAdmin;
    this.init();
  }

  async init() {
    this.bot.on("messageCreate", async (message: Message) => {
      if (
        message.author.bot ||
        !message.content.toLowerCase().startsWith(this.prefix + this.name)
      )
        return;

      if (
        this.requiresAdmin &&
        !message.member?.permissions.has("Administrator")
      ) {
        // This is an admin command that the user does not have access to
        return;
      }

      this.reloadCache();

      const isAliased = this.cache.alias?.find(
        (a) => a.from.toLowerCase() === message.content.toLowerCase()
      );

      if (isAliased) {
        message.content = isAliased.to.toLowerCase();
      }

      this.action(message);
    });
  }

  async action(message: Message) {
    // Stub
  }

  reloadCache() {
    this.cache = createOrReturnCachefile();
  }
}
