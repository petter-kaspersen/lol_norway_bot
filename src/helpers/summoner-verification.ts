import { Client, Message, MessageReaction, TextChannel, User } from "discord.js";
import { writeToCachefile } from "../util/cache";
import Logger from "../util/logger";
import { Helper } from "./helper";

class SummonerVerification extends Helper {
  constructor(bot: Client) {
    super(bot);

    this.init();
  }

  async init() {
    this.createSummonerVerificationMessage();
/*     if (!this.cacheFile.summonerVerificationMessage) {
      Logger.Info("No summoner verification message found. Creating new one.");
      this.createSummonerVerificationMessage();
    } else {
      await this.awaitReaction(this.cacheFile.summonerVerificationMessage);
    } */
  }

  async createSummonerVerificationMessage() {
    const correctChannel: TextChannel | undefined = this.bot.channels.cache.get(
      process.env.SUMMONER_VERIFICATION_CHANNEL || ""
    ) as TextChannel;

    if (!correctChannel) {
      throw new Error(
        `Channel was not found for summoner verification message`
      );
    }

    const message = await correctChannel.send(
      "Reager på denne meldingen for å verifisere LoL-brukeren din"
    );

    await message.react("✉️");

    const messageId = message.id;

    writeToCachefile("summonerVerificationMessage", messageId);

    this.awaitReaction(messageId);
  }

  async awaitReaction(messageId: string) {
    this.bot.on("messageReactionAdd", async (reaction, user) => {
      await this.messageReactionHandler(
        reaction as MessageReaction,
        user as User,
        messageId
      );
    });
  }

  async messageReactionHandler(
    reaction: MessageReaction,
    user: User,
    messageId: string
  ) {
    if (user.bot) return;

    try {
      if (reaction.partial) {
        try {
          await reaction.fetch();
        } catch (error) {
          console.error(
            "Something went wrong when fetching the message:",
            error
          );
          return;
        }
      }
    } catch (e) {}

    if (reaction.message.id !== messageId) {
      return;
    }

    await user.send("OK")
  }
}

export default SummonerVerification;
