import {
  Client,
  Message,
  MessageReaction,
  TextChannel,
  User,
} from "discord.js";
import { writeToCachefile } from "../util/cache";
import Logger from "../util/logger";
import { Helper } from "./helper";

type Role = "Top" | "Jungle" | "Mid" | "Bot" | "Support";

const TOP_ICON_ID = process.env.TOP_ICON_ID || "";
const JUNGLE_ICON_ID = process.env.JGL_ICON_ID || "";
const MID_ICON_ID = process.env.MID_ICON_ID || "";
const ADC_ICON_ID = process.env.ADC_ICON_ID || "";
const SUPPORT_ICON_ID = process.env.SUP_ICON_ID || "";

class RoleSelection extends Helper {
  constructor(bot: Client) {
    super(bot);

    this.init();
  }

  async init() {
    if (!this.cacheFile.roleSelectionMessage) {
      Logger.Info("No role selection message found. Creating new one.");
      this.createRoleSelectionMessage();
    } else {
      await this.awaitReaction(this.cacheFile.roleSelectionMessage);
    }
  }

  async createRoleSelectionMessage() {
    const correctChannel: TextChannel | undefined = this.bot.channels.cache.get(
      process.env.ROLE_SELECTION_CHANNEL || ""
    ) as TextChannel;

    if (!correctChannel) {
      throw new Error(`Channel was not found for role selection message`);
    }

    const message = await correctChannel.send(
      "Reager på denne meldingen for å velge en rolle. Når du har en rolle vil du kunne bli pinget når det f.eks. trengs spillere i en rolle for inhouses."
    );

    await message.react(process.env.TOP_ICON_ID || "");
    await message.react(process.env.JGL_ICON_ID || "");
    await message.react(process.env.MID_ICON_ID || "");
    await message.react(process.env.ADC_ICON_ID || "");
    await message.react(process.env.SUP_ICON_ID || "");

    const messageId = message.id;

    writeToCachefile("roleSelectionMessage", messageId);

    this.awaitReaction(messageId);
  }

  async messageReactionHandler(
    reaction: MessageReaction,
    user: User,
    action: "add" | "remove",
    messageId: string
  ) {
    if (user.bot) return;

    console.log("BEEP");
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

    const reactionEmoji = reaction.emoji.id;

    if (!reactionEmoji) {
      Logger.Error(
        "Unable to locate the reaction emoji, something is very wrong."
      );
      return;
    }

    const reactionMessage = reaction.message as Message;

    if (TOP_ICON_ID.includes(reactionEmoji)) {
      await this.roleAssignment("Top", user, reactionMessage, action);
    } else if (JUNGLE_ICON_ID.includes(reactionEmoji)) {
      await this.roleAssignment("Jungle", user, reactionMessage, action);
    } else if (MID_ICON_ID.includes(reactionEmoji)) {
      await this.roleAssignment("Mid", user, reactionMessage, action);
    } else if (ADC_ICON_ID.includes(reactionEmoji)) {
      await this.roleAssignment("Bot", user, reactionMessage, action);
    } else if (SUPPORT_ICON_ID.includes(reactionEmoji)) {
      await this.roleAssignment("Support", user, reactionMessage, action);
    }
  }

  async awaitReaction(messageId: string) {
    this.bot.on("messageReactionRemove", async (reaction, user) => {
      await this.messageReactionHandler(
        reaction as MessageReaction,
        user as User,
        "remove",
        messageId
      );
    });

    this.bot.on("messageReactionAdd", async (reaction, user) => {
      await this.messageReactionHandler(
        reaction as MessageReaction,
        user as User,
        "add",
        messageId
      );
    });
  }

  async roleAssignment(
    role: Role,
    user: User,
    message: Message,
    action: "add" | "remove"
  ) {
    const userId = user.id;

    let actualRole = message.guild?.roles.cache.find((r) => r.name == role);

    if (!actualRole) {
      throw new Error(`Couldnt assign role to player`);
    }

    action === "add"
      ? await message.guild?.members.cache.get(userId)?.roles.add(actualRole)
      : await message.guild?.members.cache
          .get(userId)
          ?.roles.remove(actualRole);
  }
}

export default RoleSelection;
