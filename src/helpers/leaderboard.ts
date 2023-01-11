import { Client, Embed, EmbedBuilder, Message, TextChannel } from "discord.js";
import { Cache, writeToCachefile } from "../util/cache";
import { summonerByName, summonerRank } from "../util/riot";
import getEmojiForIndex from "../util/get-emoji-for-index";
import { Helper } from "./helper";

const LEADERBOARD_CHANNEL = process.env.LEADERBOARD_CHANNEL || "";

export interface LeaderboardSummoner {
  discordId: string;
  id: string;
  name: string;
  rank?: {
    tier: string;
    division: string;
    lp: number;
  };
  history: {
    tier: string;
    division: string;
    lp: number;
    timestamp: number;
  }[];
}

type TIER =
  | "IRON"
  | "BRONZE"
  | "SILVER"
  | "GOLD"
  | "PLATINUM"
  | "DIAMOND"
  | "MASTER"
  | "CHALLENGER";

type DIVISION = "IV" | "III" | "II" | "I";

const tierPrio = {
  IRON: 1,
  BRONZE: 2,
  SILVER: 3,
  GOLD: 4,
  PLATINUM: 5,
  DIAMOND: 6,
  MASTER: 7,
  CHALLENGER: 8,
};

const divisionPrio = {
  IV: 0,
  III: 1,
  II: 2,
  I: 3,
};

const calculatePrio = (tier: TIER, division: DIVISION) => {
  return tierPrio[tier] + divisionPrio[division];
};

export default class Leaderboard extends Helper {
  constructor(bot: Client) {
    super(bot);

    this.init();
  }

  async init() {
    if (!this.cacheFile.leaderboardSummoners) {
      writeToCachefile("leaderboardSummoners", []);

      this.reloadCacheFile();
    }

    if (!this.cacheFile.leaderboardMessage) {
      const channel = this.bot.channels.cache.get(
        LEADERBOARD_CHANNEL
      ) as TextChannel;

      const embed = this.constructEmbed();

      const msg = await channel.send({ embeds: [embed] });

      writeToCachefile("leaderboardMessage", msg.id);
      this.reloadCacheFile();
    }

    // Update summoner every 15 minutes, OR when added
    setInterval(async () => {
      this.updateSummoners();
    }, 60 * 1000 * 5);
  }

  async updateEmbed() {
    const channel = this.bot.channels.cache.get(
      LEADERBOARD_CHANNEL
    ) as TextChannel;

    const cachedMessage = this.cacheFile.leaderboardMessage;

    if (!cachedMessage) {
      return;
    }

    const cachedMsg = await channel.messages.fetch(cachedMessage);

    const embed = this.constructEmbed();

    await cachedMsg.edit({ embeds: [embed] });
  }

  constructEmbed() {
    const summoners = this.cacheFile.leaderboardSummoners || [];

    const sortedSummoners = summoners
      .sort((a, b) => {
        if (!a.rank) {
          return 1;
        }

        if (!b.rank) {
          return -1;
        }

        return (
          calculatePrio(b.rank.tier as TIER, b.rank.division as DIVISION) -
          calculatePrio(a.rank.tier as TIER, a.rank.division as DIVISION)
        );
      })
      .slice(0, 10);

    return new EmbedBuilder()
      .setColor("#ed7650")
      .setTitle(`LoL Norge - SoloQ Leaderboard`)
      .setDescription(
        sortedSummoners
          .map((s, i) => {
            return `${getEmojiForIndex(i)} - **${s.name}** - ${
              s.rank?.tier || "UNRANKED"
            } ${s.rank?.division || ""} ${
              s.rank?.lp && s.rank?.lp >= 0 ? s.rank.lp + "LP" : ""
            }`;
          })
          .join("\n") || "No summoners added to leaderboard"
      );
  }

  async updateSummoners() {
    console.log("UPDATING SUMMONERS");
    const cacheSummoners = this.cacheFile.leaderboardSummoners || [];

    for await (let summoner of cacheSummoners) {
      await this.updateSummoner(summoner.id);
    }

    await this.updateEmbed();
  }

  async updateSummoner(id: string) {
    const details = await summonerRank(id);

    if (!details.response.length) {
      return;
    }

    const soloRank = details.response.find(
      (x) => x.queueType === "RANKED_SOLO_5x5"
    );

    if (!soloRank) {
      return;
    }

    const summoners = this.cacheFile.leaderboardSummoners || [];

    const newSummoners = summoners.map((s) => {
      if (s.id !== id) {
        return s;
      }

      /* if (s.rank) {
        s.history.push({ ...s.rank, timestamp: Date.now() });
      } */

      s.rank = {
        tier: soloRank.tier,
        division: soloRank.rank,
        lp: soloRank.leaguePoints,
      };

      s.name = soloRank.summonerName;

      return s;
    });

    writeToCachefile("leaderboardSummoners", newSummoners);
    this.reloadCacheFile();
  }

  async addSummonerIfNotExist(name: string, message: Message, cache: Cache) {
    const summoners = this.cacheFile.leaderboardSummoners;

    const hasSummoner = summoners?.find(
      (x) => x.name.toLowerCase() === name.toLowerCase()
    );

    if (!hasSummoner) {
      const summoner = await summonerByName(name);

      if (!summoner) {
        return await message.channel.send(
          `Invalid summoner given, please double check`
        );
      }

      writeToCachefile("leaderboardSummoners", [
        ...(summoners || []),
        {
          id: summoner.response.id,
          name: summoner.response.name,
          discordId: message.author.id,
          history: [],
        } as LeaderboardSummoner,
      ]);

      this.reloadCacheFile();

      return summoner.response.id;
    } else {
      await message.channel.send("Summoner already added.");
    }
  }

  async removeSummonerIfExist(name: string, message: Message) {
    const summoners = this.cacheFile.leaderboardSummoners;

    const hasSummoner = summoners?.find(
      (x) => x.name.toLowerCase() === name.toLowerCase()
    );

    if (!hasSummoner) {
      return await message.channel.send("Summoner not found");
    }

    if (hasSummoner.discordId !== message.author.id) {
      return await message.channel.send("Summoner not added by you");
    }

    const actualSummoners =
      summoners?.filter(function (s) {
        return s.name.toLowerCase() !== name.toLowerCase();
      }) || [];

    writeToCachefile("leaderboardSummoners", actualSummoners);

    this.reloadCacheFile();

    await this.updateEmbed();
  }
}
