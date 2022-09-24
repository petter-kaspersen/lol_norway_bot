import { Client, EmbedBuilder, Message, User } from "discord.js";
import Command from "./command";

import championsJson from "../../champions.json";

import { db } from "../db/external";
import getEmojiForIndex from "../util/get-emoji-for-index";

const championsJsonObject = Object.values(championsJson.data);

interface RawDBQueryResult {
  game_id: number;
  side: string;
  role: string;
  player_id: string;
  player_server_id: string;
  champion_id?: number;
  name: string;
  winner: string;
  trueskill_mu: number;
  trueskill_sigma: number;
}

interface TopChampion {
  name: string;
  winrate: string;
  gamesWithChampion: number;
}

type Role = "TOP" | "JGL" | "MID" | "BOT" | "SUP";

export default class CommandStats extends Command {
  constructor(bot: Client) {
    super(bot, "stats", "Displays stats for yourself or other user");
  }

  async action(message: Message) {
    if (
      message.content.toLowerCase().startsWith(this.prefix + "stats champions")
    ) {
      return await this.postTop10Champions(message);
    }

    let userToFetch: User | undefined = message.author;
    if (message.mentions.users.first()) {
      userToFetch = message.mentions.users.first();
    }

    const containsRole =
      /\?stats (top|jgl|jungle|mid|bot|adc|support|sup)/gm.exec(
        message.content.toLowerCase()
      );

    let role: Role | null = null;

    if (containsRole) {
      role = this.getRoleByInput(containsRole[1]);
    }

    if (!userToFetch) {
      message.reply(
        `Something went wrong executing the command. Please try again.`
      );
      return;
    }

    const stats = await this.getStatsForUser(userToFetch as User, role);

    if (!stats) {
      message.reply(`No games played for user`);

      return;
    }

    const gamesPlayed = stats.length;
    const wins = stats.filter((r) => r.winner === r.side).length;
    const losses = gamesPlayed - wins;

    const winrate = ((wins / (wins + losses)) * 100).toFixed(2);

    const topThree = await this.topXChampions(3, stats);

    const embed = new EmbedBuilder()
      .setColor("#d82e34")
      .setTitle(
        `Stats for ${stats[0].name} ${
          role ? `in role ${role.toLowerCase()}` : ""
        }`
      )
      .addFields(
        {
          name: "Games",
          value: String(gamesPlayed),
          inline: true,
        },
        {
          name: "Win %",
          value: `${winrate}%`,
          inline: true,
        }
      )
      .addFields({
        name: `Top 3 champs`,
        value: this.constructChampionString(topThree),
      });

    await message.channel.send({ embeds: [embed] });
  }

  async postTop10Champions(message: Message) {
    const stats = await this.getGeneralStats();

    if (!stats) return;

    const champions = stats
      .filter((s) => s.champion_id)
      .map((s) => s.champion_id);

    const occurences: { [key: number]: number } = {};

    for (const champ of champions) {
      if (!champ) continue;
      occurences[champ] = occurences[champ] ? occurences[champ] + 1 : 1;
    }

    const sortedChamps = Object.entries(occurences)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    const topTen: TopChampion[] = [];

    for (let [cid, _] of sortedChamps) {
      topTen.push(this.getStatsForChampion(cid, stats));
    }

    const embed = new EmbedBuilder().setColor("#d82e34").addFields({
      name: "Top 10 champions",
      value: this.constructChampionString(topTen),
    });

    message.channel.send({ embeds: [embed] });
  }

  constructChampionString(topChampions: TopChampion[]): string {
    let returnString = "";

    for (let i of topChampions.keys()) {
      const champ = topChampions[i];

      let emoji = getEmojiForIndex(i);

      returnString += `${emoji} ${champ.name} | ${champ.winrate} | ${champ.gamesWithChampion} games\n`;
    }

    return returnString;
  }

  getStatsForChampion(cid: string, stats: RawDBQueryResult[]): TopChampion {
    const numberedCid = Number(cid);

    const gamesWithChampion = stats.filter(
      (s) => s.champion_id === numberedCid
    );

    const wins = gamesWithChampion.filter((s) => s.side === s.winner).length;
    const losses = gamesWithChampion.length - wins;

    const winrate = ((wins / (wins + losses)) * 100).toFixed(2);

    return {
      name: championsJsonObject.find((x) => x.key === cid)?.name || "",
      winrate: `${winrate}%`,
      gamesWithChampion: gamesWithChampion.length,
    };
  }

  async topXChampions(
    i: number,
    stats: RawDBQueryResult[]
  ): Promise<TopChampion[]> {
    const champions = stats
      .filter((s) => s.champion_id)
      .map((s) => s.champion_id);

    const occurences: { [key: number]: number } = {};

    for (const champ of champions) {
      if (!champ) continue;
      occurences[champ] = occurences[champ] ? occurences[champ] + 1 : 1;
    }

    const sortedChamps = Object.entries(occurences)
      .sort((a, b) => b[1] - a[1])
      .slice(0, i);

    const top: TopChampion[] = [];
    for (let [cid, _] of sortedChamps) {
      top.push(this.getStatsForChampion(cid, stats));
    }

    return top;
  }

  getRoleByInput(input: string): Role | null {
    // top|jungle|mid|bot|adc|support|sup

    switch (input) {
      case "top":
        return "TOP";
      case "jungle":
      case "jgl":
        return "JGL";
      case "mid":
        return "MID";
      case "adc":
      case "bot":
        return "BOT";
      case "sup":
      case "support":
        return "SUP";
      default:
        return null;
    }
  }

  getRoleIconByRole(role: Role): string {
    return process.env[`${role}_ICON_ID`] || "";
  }

  // TODO: Make a general purpose function
  async getStatsForUser(
    user: User,
    role: Role | null
  ): Promise<RawDBQueryResult[] | null> {
    const games = await db.raw(
      `SELECT * FROM game_participant gp JOIN game g ON g.id = gp.game_id WHERE gp.player_id = ${
        user.id
      } ${role ? `AND gp.role = '${role}'` : ""};`
    );

    const rows = games.rows as RawDBQueryResult[];

    if (!rows.length) {
      return null;
    }

    return rows;
  }

  async getGeneralStats(): Promise<RawDBQueryResult[] | null> {
    const games = await db.raw(
      `SELECT * FROM game_participant gp JOIN game g ON g.id = gp.game_id;`
    );

    const rows = games.rows as RawDBQueryResult[];

    if (!rows.length) {
      return null;
    }

    return rows;
  }
}
