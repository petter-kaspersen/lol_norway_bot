import { Client, EmbedBuilder, Message } from "discord.js";
import Command from "./command";

import championsJson from "../../champions.json";

const championsJsonObject = Object.values(championsJson.data);

import { db } from "../db/external";
import getEmojiForIndex from "../util/get-emoji-for-index";

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

interface Player {
  displayName: string;
  games: number;
  winrate: number;
}

interface ChampionStats {
  winrate: number;
  games: number;
}

export default class CommandChampion extends Command {
  constructor(bot: Client) {
    super(bot, "champion", "Displays stats for selected champion");
  }

  async action(message: Message) {
    // Parse the message to see if a valid champion name was given.

    const champion = message.content.split(" ").slice(1);

    if (!champion.length) {
      message.channel.send("Usage: `?champion <name>`");
      return;
    }

    const champName = champion.join(" ");

    const validChampion = championsJsonObject.find(
      (champ) => champ.name.toLowerCase() === champName.toLowerCase()
    );

    if (!validChampion) {
      message.channel.send(`${champName} is not a valid champion.`);
      return;
    }

    const gamesWithChampion = await this.getGamesWithChampion(
      Number(validChampion.key)
    );

    if (!gamesWithChampion?.length) {
      message.channel.send(`No games with champion ${champName} played :(`);
      return;
    }

    const topTen = await this.getTopTenPlayers(gamesWithChampion);
    const totalWinrate = await this.getTotalStats(gamesWithChampion);

    const embed = new EmbedBuilder()
      .setColor("#d82e34")
      .addFields({
        name: `Top ${topTen.length} players with ${validChampion.name}`,
        value: this.constructChampionString(topTen),
      })
      .addFields({
        name: `Total winrate for ${validChampion.name}`,
        value: `${totalWinrate.games} games, ${totalWinrate.winrate}% winrate`,
      });

    message.channel.send({ embeds: [embed] });
  }

  constructChampionString(topPlayers: Player[]): string {
    let returnString = "";

    for (let i of topPlayers.keys()) {
      const player = topPlayers[i];

      let emoji = getEmojiForIndex(i);

      returnString += `${emoji} ${player.displayName} | ${player.winrate}% | ${player.games} games\n`;
    }

    return returnString;
  }

  async getTopTenPlayers(stats: RawDBQueryResult[]): Promise<Player[]> {
    const occurences: { [key: string]: number } = {};

    for (const player of stats) {
      if (!player) continue;
      occurences[player.player_id] = occurences[player.player_id]
        ? occurences[player.player_id] + 1
        : 1;
    }

    const sortedPlayers = Object.entries(occurences)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    const top: Player[] = [];

    for (let [pid, _] of sortedPlayers) {
      top.push(this.getStatsForPlayer(pid, stats));
    }

    top.sort((a, b) => b.games - a.games || b.winrate - a.winrate);

    return top;
  }

  getStatsForPlayer(pid: string, stats: RawDBQueryResult[]): Player {
    const gamesWithChampion = stats.filter((s) => s.player_id == pid);

    const wins = gamesWithChampion.filter((s) => s.side === s.winner).length;
    const losses = gamesWithChampion.length - wins;

    const winrate = ((wins / (wins + losses)) * 100).toFixed(2);

    return {
      displayName: gamesWithChampion[gamesWithChampion.length - 1].name,
      winrate: Number(winrate),
      games: gamesWithChampion.length,
    };
  }

  getTotalStats(stats: RawDBQueryResult[]): ChampionStats {
    const wins = stats.filter((s) => s.side === s.winner).length;
    const losses = stats.length - wins;

    const winrate = ((wins / (wins + losses)) * 100).toFixed(2);

    return {
      winrate: Number(winrate),
      games: stats.length,
    };
  }

  async getGamesWithChampion(id: number): Promise<RawDBQueryResult[] | null> {
    const games = await db.raw(
      `SELECT * FROM game_participant gp JOIN game g ON g.id = gp.game_id WHERE gp.champion_id IS NOT NULL and gp.champion_id = ${id};`
    );

    const rows = games.rows as RawDBQueryResult[];

    if (!rows.length) {
      return null;
    }

    return rows;
  }
}
