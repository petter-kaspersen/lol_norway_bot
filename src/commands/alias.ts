import { Client, Message } from "discord.js";
import { writeToCachefile } from "../util/cache";
import Command from "./command";

export interface Alias {
  from: string;
  to: string;
}

export default class CommandAlias extends Command {
  constructor(bot: Client) {
    super(bot, "alias", "Alias one command to another", true);
  }

  async action(message: Message) {
    if (!this.cache.alias) {
      writeToCachefile("alias", []);
      this.reloadCache();
    }

    const reg = /"(.*)" "(.*)"/gm.exec(message.content.toLowerCase());

    if (!reg) {
      message.channel.send(`Invalid usage of command`);
      return;
    }

    const existingAlias = this.cache.alias || [];

    const newAlias = { from: reg[1], to: reg[2] };

    writeToCachefile("alias", [...existingAlias, newAlias]);

    message.channel.send(
      `New alias created, \`${newAlias.from}\` will map to \`${newAlias.to}\``
    );
  }
}
