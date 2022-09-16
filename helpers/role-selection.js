const cacheFile = require(`../` + process.env.CACHE_FILE);
const fs = require("fs");

class RoleSelection {
  constructor(bot) {
    this.bot = bot;

    bot.on("ready", this.init.bind(this));
  }

  async init() {
    if (!cacheFile.roleSelectionMessage) {
      console.log("NO ROLE SELECTION MSG FOUND");

      await this.createRoleSelectionMessage();
    } else {
      await this.awaitReaction(cacheFile.roleSelectionMessage);
    }
  }

  async createRoleSelectionMessage() {
    const correctChannel = this.bot.channels.cache.get(
      process.env.ROLE_SELECTION_CHANNEL
    );

    if (!correctChannel) {
      throw new Error(
        `Channel not found for role selection. Attempted: ${process.env.ROLE_SELECTION_CHANNEL}`
      );
    }

    const message = await correctChannel.send(
      "Reager på denne meldingen for å velge en rolle. Når du har en rolle vil du kunne bli pinget når det f.eks. trengs spillere i en rolle for inhouses."
    );

    await message.react(process.env.TOP_ICON_ID);
    await message.react(process.env.JGL_ICON_ID);
    await message.react(process.env.MID_ICON_ID);
    await message.react(process.env.ADC_ICON_ID);
    await message.react(process.env.SUP_ICON_ID);

    const messageId = message.id;

    fs.writeFileSync(
      `${process.env.CACHE_FILE}`,
      JSON.stringify({ ...cacheFile, roleSelectionMessage: messageId })
    );

    this.awaitReaction(messageId);
  }

  async awaitReaction(messageId) {
    this.bot.on("messageReactionRemove", async (reaction, user) => {
      if (user.bot) return;
      if (reaction.partial) {
        // If the message this reaction belongs to was removed, the fetching might result in an API error which should be handled
        try {
          await reaction.fetch();
        } catch (error) {
          console.error(
            "Something went wrong when fetching the message:",
            error
          );
          // Return as `reaction.message.author` may be undefined/null
          return;
        }
      }

      if (reaction.message.id !== messageId) {
        return;
      }

      const reactionEmoji = reaction._emoji.id;

      if (process.env.TOP_ICON_ID.includes(reactionEmoji)) {
        await this.removeRoleIfExists("Top", user, reaction.message);
      } else if (process.env.JGL_ICON_ID.includes(reactionEmoji)) {
        await this.removeRoleIfExists("Jungle", user, reaction.message);
      } else if (process.env.MID_ICON_ID.includes(reactionEmoji)) {
        await this.removeRoleIfExists("Mid", user, reaction.message);
      } else if (process.env.ADC_ICON_ID.includes(reactionEmoji)) {
        await this.removeRoleIfExists("Bot", user, reaction.message);
      } else if (process.env.SUP_ICON_ID.includes(reactionEmoji)) {
        await this.removeRoleIfExists("Support", user, reaction.message);
      }
    });

    this.bot.on("messageReactionAdd", async (reaction, user) => {
      if (user.bot) return;
      // When a reaction is received, check if the structure is partial
      if (reaction.partial) {
        // If the message this reaction belongs to was removed, the fetching might result in an API error which should be handled
        try {
          await reaction.fetch();
        } catch (error) {
          console.error(
            "Something went wrong when fetching the message:",
            error
          );
          // Return as `reaction.message.author` may be undefined/null
          return;
        }
      }

      if (reaction.message.id !== messageId) {
        return;
      }

      const reactionEmoji = reaction._emoji.id;

      if (process.env.TOP_ICON_ID.includes(reactionEmoji)) {
        await this.addRoleIfExist("Top", user, reaction.message);
      } else if (process.env.JGL_ICON_ID.includes(reactionEmoji)) {
        await this.addRoleIfExist("Jungle", user, reaction.message);
      } else if (process.env.MID_ICON_ID.includes(reactionEmoji)) {
        await this.addRoleIfExist("Mid", user, reaction.message);
      } else if (process.env.ADC_ICON_ID.includes(reactionEmoji)) {
        await this.addRoleIfExist("Bot", user, reaction.message);
      } else if (process.env.SUP_ICON_ID.includes(reactionEmoji)) {
        await this.addRoleIfExist("Support", user, reaction.message);
      }
    });
  }

  async addRoleIfExist(role, user, message) {
    const userId = user.id;

    let actualRole = message.guild.roles.cache.find((r) => r.name == role);

    if (!actualRole) {
      throw new Error(`Couldnt assign role to player`);
    }

    await message.guild.members.cache.get(userId).roles.add(actualRole);
  }

  async removeRoleIfExists(role, user, message) {
    const userId = user.id;

    let actualRole = message.guild.roles.cache.find((r) => r.name == role);

    if (!actualRole) {
      throw new Error(`Couldnt assign role to player`);
    }

    await message.guild.members.cache.get(userId).roles.remove(actualRole);
  }
}

module.exports = RoleSelection;
