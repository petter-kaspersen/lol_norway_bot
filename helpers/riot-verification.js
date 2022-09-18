const cacheFile = require(`../` + process.env.CACHE_FILE);
const fs = require("fs");
const fetch = require("node-fetch");

const discord = require("discord.js");

class RiotVerification {
  constructor(bot) {
    this.bot = bot;

    this.validIcons = [27, 10, 21, 28, 19, 18, 23];

    bot.on("ready", this.init.bind(this));
  }

  async init() {
    console.log("HELLO");
    const riot = new RiotRequest();

    const req = await riot.getSummonerByName("No Who Axed");

    console.log(req);

    this.listenForVerificationMessage();
  }

  async listenForVerificationMessage() {
    this.bot.on("messageCreate", async (message) => {
      if (
        message.author.bot ||
        message.channelId !== process.env.VERIFICATION_CHANNEL
      )
        return;

      message.delete();

      if (message.content.startsWith("?verify")) {
        /* message.channel.send(
          ` ${message.author.toString()}`,
          message.author.toString()
        );
        message.author.send(`Hei! Vennligst skriv br`);
        console.log("STARTING VERIFICATION PROCESS");
        console.log(message); */

        const row = new discord.ActionRowBuilder().addComponents(
          new discord.ButtonBuilder()
            .setCustomId("primary")
            .setLabel("Click me!")
            .setStyle(discord.ButtonStyle.Primary)
        );
        const embed = new discord.EmbedBuilder()
          .setColor(0x0099ff)
          .setTitle("Some title")
          .setURL("https://discord.js.org")
          .setDescription("Some description here");
        await message.channel.send({
          content: "I think you should,",
          embeds: [embed],
          components: [row],
        });
      }
    });
  }
}

class RiotRequest {
  constructor() {
    this.baseUrl = "https://euw1.api.riotgames.com/lol/";
  }

  async doRequest(url) {
    const req = await fetch(url + `?api_key=${process.env.RIOT_API_KEY}`);

    if (req.status !== 200) {
      console.error(
        `Something went wrong performing the request with URL: ${url}\nStatus code: ${req.status}`
      );
      return false;
    }

    return await req.json();
  }

  async getSummonerByName(name) {
    let url =
      this.baseUrl +
      `summoner/v4/summoners/by-name/${encodeURI(name.toLowerCase())}`;

    const request = await this.doRequest(url);

    if (!request) {
      return false;
    }

    return {
      id: request.id,
      accountId: request.accountId,
      puuid: request.puuid,
      icon: request.profileIconId,
    };
  }
}

module.exports = RiotVerification;
