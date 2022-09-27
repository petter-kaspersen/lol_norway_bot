import { Client, EmbedBuilder, Message } from "discord.js";
import Command from "./command";

import { db } from "../db/external";

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
  id: string;
  name: string;
}

interface ProcessedPlayer {
  name: string;
  winrate: number;
  games: number;
}

export default class CommandPerformance extends Command {
  constructor(bot: Client) {
    super(bot, "performance", "Displays the worst performers");
  }

  async action(message: Message) {
    const players = await this.getPlayers();
    const games = await this.getGamesWithParticipant();

    if (!games) return;

    const processedPlayers: ProcessedPlayer[] = players
      .map((p) => this.getWinrateForPlayer(p, games))
      .filter((x) => x.games > 10);

    const worstTen = processedPlayers
      .sort((a, b) => a.winrate - b.winrate)
      .slice(0, 10);

    const embed = new EmbedBuilder()
      .setColor("#d82e34")
      .setTitle(`Worst 10 winrates with over 10 games played`)
      .addFields(
        {
          name: `Players`,
          value: worstTen.map((p) => `${p.name}`).join(`\n`),
          inline: true,
        },
        {
          name: `Win %`,
          value: worstTen.map((p) => `${p.winrate.toFixed(2)}%`).join(`\n`),
          inline: true,
        },
        {
          name: `Games`,
          value: worstTen.map((p) => `${p.games}`).join(`\n`),
          inline: true,
        }
      );

    await message.channel.send({ embeds: [embed] });
  }

  getWinrateForPlayer(
    player: Player,
    games: RawDBQueryResult[]
  ): ProcessedPlayer {
    const playerGames = games.filter((g) => g.player_id === player.id);

    const wins = playerGames.filter((g) => g.side === g.winner).length;
    const losses = playerGames.length - wins;

    const winrate = (wins / (wins + losses)) * 100;

    return {
      name: player.name,
      games: playerGames.length,
      winrate: winrate,
    };
  }

  async getGamesWithParticipant() {
    const games = await db.raw(
      `SELECT * FROM game_participant gp JOIN game g ON g.id = gp.game_id;`
    );

    const rows = games.rows as RawDBQueryResult[];

    if (!rows.length) {
      return null;
    }

    return rows;
  }

  async getPlayers(): Promise<Player[]> {
    const players = await db("player");

    return players;
  }
}
