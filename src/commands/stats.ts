import { Client, EmbedBuilder, Message, User } from "discord.js";
import Command from "./command";

import championsJson from "../../champions.json";

import { db } from "../db/external";

const championsJsonObject = Object.entries(championsJson);

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

interface TopThreeChampions {
  name: string;
  winrate: string;
}

export default class CommandStats extends Command {
  constructor(bot: Client) {
    super(bot, "stats", "Displays stats for yourself or other user");
  }

  async action(message: Message) {
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

      topThreeString += `${emoji} ${champ.name} | ${champ.winrate}\n`;
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

  async topThreeChampions(
    stats: RawDBQueryResult[]
  ): Promise<TopThreeChampions[]> {
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

    const top: TopThreeChampions[] = [];
    for (let [cid, _] of sortedChamps) {
      const numberedCid = Number(cid);

      const gamesWithChampion = stats.filter(
        (s) => s.champion_id === numberedCid
      );

      const wins = gamesWithChampion.filter((s) => s.side === s.winner).length;
      const losses = gamesWithChampion.length - wins;

      const winrate = ((wins / (wins + losses)) * 100).toFixed(2);

      top.push({
        // @ts-ignore
        name: championsJsonObject.find((x) => x.key === cid)?.name || "",
        winrate: `${winrate}%`,
      });
    }

    return top;
  }

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
}
