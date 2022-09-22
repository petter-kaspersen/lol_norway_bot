import { Client, Message } from "discord.js";

export default class Command {
  private bot: Client;
  public name: string;
  public description: string;
  private prefix: string;
  constructor(bot: Client, name: string, description: string = "") {
    this.bot = bot;
    this.name = name;
    this.description = description;
    this.prefix = "?";

    this.init();
  }

  async init() {
    this.bot.on("messageCreate", async (message: Message) => {
      if (
        message.author.bot ||
        !message.content.toLowerCase().startsWith(this.prefix + this.name)
      )
        return;

      this.action(message);
    });
  }

  async action(message: Message) {
    // Stub
  }
}
