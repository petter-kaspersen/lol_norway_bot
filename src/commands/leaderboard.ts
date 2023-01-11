import { Client, Message } from "discord.js";
import { Helper } from "../helpers/helper";
import Leaderboard from "../helpers/leaderboard";
import Command from "./command";

export default class CommandLeaderboard extends Command {
  private helper: Leaderboard | undefined;
  constructor(bot: Client, leaderboardHelper: Leaderboard | undefined) {
    super(
      bot,
      "leaderboard",
      "Adds or removes the given summoner to the leaderboard"
    );

    this.helper = leaderboardHelper;

    if (!this.helper) {
      throw new Error();
    }
  }

  async action(message: Message) {
    const msgContent = message.content.toLowerCase();

    const splitMsg = msgContent.split(" ");

    if (splitMsg.length === 1 || splitMsg.length === 2) {
      await message.channel.send(
        `Expected \`${this.prefix}leaderboard add|remove <name>\``
      );

      return;
    }

    if (splitMsg[1] === "add") {
      await this.addSummoner(message);
    } else if (splitMsg[1] === "remove") {
      await this.removeSummoner(message);
    } else {
      await message.channel.send(
        `Expected \`${this.prefix}leaderboard add|remove <name>\``
      );

      await message.delete();

      return;
    }

    await message.delete();

    // await message.channel.send(summonerName);
  }

  async addSummoner(message: Message) {
    const summonerName = message.content.split(" ").slice(2).join(" ");

    const id = await this.helper?.addSummonerIfNotExist(
      summonerName,
      message,
      this.cache
    );

    if (!id) return;

    await this.helper?.updateSummoner(id as string);

    await this.helper?.updateEmbed();
  }

  async removeSummoner(message: Message) {
    const summonerName = message.content
      .toLowerCase()
      .split(" ")
      .slice(2)
      .join(" ");

    await this.helper?.removeSummonerIfExist(summonerName, message);
  }
}
