import { Client, EmbedBuilder, Message, User } from "discord.js";
import Command from "./command";

import championsJson from "../../champions.json";

import { db } from "../db/external";

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

    if (!userToFetch) {
      message.reply(
        `Something went wrong executing the command. Please try again.`
      );
      return;
    }

    const stats = await this.getStatsForUser(userToFetch as User);

    if (!stats) {
      message.reply(`No games played for user`);

      return;
    }

    const gamesPlayed = stats.length;
    const wins = stats.filter((r) => r.winner === r.side).length;
    const losses = gamesPlayed - wins;

    const winrate = ((wins / (wins + losses)) * 100).toFixed(2);

    const lastRating = stats[stats.length - 1];

    const mmr =
      20 * (lastRating.trueskill_mu - 3 * lastRating.trueskill_sigma + 25);

    const topThree = await this.topThreeChampions(stats);

    let topThreeString = "";

    for (let i of topThree.keys()) {
      const champ = topThree[i];

      let emoji = "";

      if (i === 0) emoji = ":first_place: ";
      if (i === 1) emoji = ":second_place: ";
      if (i === 2) emoji = ":third_place: ";

      topThreeString += `${emoji} ${champ.name} | ${champ.winrate} | ${champ.gamesWithChampion} games\n`;
    }

    const embed = new EmbedBuilder()
      .setColor("#d82e34")
      .setTitle(`Stats for ${stats[0].name}`)
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
        name: "Top 3 champs",
        value: topThreeString,
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

    const top: TopChampion[] = [];

    for (let [cid, _] of sortedChamps) {
      top.push(this.getStatsForChampion(cid, stats));
    }

    let top10String = "";

    for (let i of top.keys()) {
      const champ = top[i];

      let emoji = "";

      if (i === 0) emoji = ":first_place: ";
      if (i === 1) emoji = ":second_place: ";
      if (i === 2) emoji = ":third_place: ";
      if (i === 3) emoji = ":four: ";
      if (i === 4) emoji = ":five: ";
      if (i === 5) emoji = ":six: ";
      if (i === 6) emoji = ":seven: ";
      if (i === 7) emoji = ":eight: ";
      if (i === 8) emoji = ":nine: ";
      if (i === 9) emoji = ":keycap_ten: ";

      top10String += `${emoji} ${champ.name} | ${champ.winrate} | ${champ.gamesWithChampion} games\n`;
    }

    const embed = new EmbedBuilder().setColor("#d82e34").addFields({
      name: "Top 10 champions",
      value: top10String,
    });

    message.channel.send({ embeds: [embed] });
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

  async topThreeChampions(stats: RawDBQueryResult[]): Promise<TopChampion[]> {
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
      .slice(0, 3);

    const top: TopChampion[] = [];
    for (let [cid, _] of sortedChamps) {
      top.push(this.getStatsForChampion(cid, stats));
    }

    return top;
  }

  // TODO: Make a general purpose function
  async getStatsForUser(user: User): Promise<RawDBQueryResult[] | null> {
    const games = await db.raw(
      `SELECT * FROM game_participant gp JOIN game g ON g.id = gp.game_id WHERE gp.player_id = ${user.id};`
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
