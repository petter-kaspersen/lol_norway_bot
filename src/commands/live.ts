import { Client, EmbedBuilder, EmbedField, Message } from "discord.js";
import Command from "./command";

import { db } from "../db/external";

type GameError = String;

interface Participant {
  side: "RED" | "BLUE";
  role: "TOP" | "JGL" | "MID" | "BOT" | "SUP";
  name: string;
  player_id: string;
}

interface Game {
  id: number;
  blue_expected_winrate: number;
  participants: Participant[];
}

interface PlayerGames {
  id: number;
  side: string;
  winner: string;
  role: string;
}

interface ParsedTeamParticipant {
  name: string;
  lastThreeGames: string;
  role: string;
  winrate: string;
}

export default class CommandLiveGame extends Command {
  constructor(bot: Client) {
    super(bot, "live", "Displays stats for the currently live game");
  }

  async action(message: Message) {
    // Parse to see if we can find a game id
    const parsedMessage = message.content.toLowerCase();

    const sub = parsedMessage.split(" ").slice(1).join("");

    let game;

    if (!isNaN(parseInt(sub))) {
      game = await this.getMatchingGame(undefined, parseInt(sub));
    } else {
      game = await this.getMatchingGame(message.author.id, undefined);
    }

    if (typeof game === "string") {
      message.channel.send(game);
      return;
    }

    // Dirty
    game = game as Game;

    const embed = new EmbedBuilder()
      .setColor("#d82e34")
      .setTitle(`Information for game ${game.id}`)
      .addFields({
        name: "Blue team",
        value: "\u200b",
      })
      .addFields(await this.parseFieldsForTeam("blue", game.participants))
      .addFields({
        name: "Red team",
        value: "\u200b",
      })
      .addFields(await this.parseFieldsForTeam("red", game.participants));

    message.channel.send({ embeds: [embed] });
  }

  async parseFieldsForTeam(
    team: "blue" | "red",
    participants: Participant[]
  ): Promise<EmbedField[]> {
    const parsedTeam = await this.parseTeam(team, participants);

    return [
      {
        name: "Name",
        value: parsedTeam
          .map((p) => `${process.env[p.role + "_ICON_ID"]} ${p.name}`)
          .join("\n"),
        inline: true,
      },
      {
        name: "History",
        value: parsedTeam.map((p) => p.lastThreeGames).join("\n"),
        inline: true,
      },
      {
        name: "Winrate in role",
        value: parsedTeam.map((p) => p.winrate).join("\n"),
        inline: true,
      },
    ];
  }

  async parseTeam(
    team: "blue" | "red",
    participants: Participant[]
  ): Promise<ParsedTeamParticipant[]> {
    const teamParticipants = participants
      .filter((x) => x.side.toLowerCase() === team)
      .map(async (p) => {
        return {
          name: p.name,

          role: p.role,
          ...(await this.getStatsForUser(p.player_id, p.role)),
        };
      });

    return await Promise.all(teamParticipants);
  }

  async getStatsForUser(discordId: string, role: string) {
    const games: { rows: PlayerGames[] } = await db.raw(
      `SELECT * FROM game_participant gp JOIN game g ON g.id = gp.game_id WHERE gp.player_id = ${discordId};`
    );

    const lastThreeGames = games.rows
      .filter((x) => x.winner !== null)
      .sort((a, b) => b.id - a.id);

    const totalGames = games.rows
      .filter((x) => x.role === role)
      .filter((x) => x.winner !== null).length;
    const wins = games.rows.filter((g) => g.side === g.winner).length;
    const losses = totalGames - wins;

    const winrate = ((wins / (wins + losses)) * 100).toFixed(2);

    return {
      winrate: `${winrate}%`,
      lastThreeGames: lastThreeGames
        .slice(0, 3)
        .map(
          (g) => `${g.winner === g.side ? ":green_square: " : ":red_square: "}`
        )
        .join(""),
    };
  }

  async getMatchingGame(
    discordId?: string,
    gameId?: number
  ): Promise<GameError | Game> {
    const validGames = gameId
      ? await db("game").whereNull("winner").where("id", "=", gameId)
      : await db("game").whereNull("winner");

    if (!validGames.length && gameId) {
      return "No live game found for given game id";
    }

    if (!validGames.length) {
      return "No ongoing game found";
    }

    for (let game of validGames) {
      const participants = await db("game_participant").where(
        "game_id",
        "=",
        game.id
      );

      if (discordId) {
        const hasValidParticipant = participants.find(
          (p) => p.player_id == discordId
        );

        if (!hasValidParticipant) {
          return "You don't currently have an ongoing game.";
        }

        return { ...game, participants };
      } else {
        return { ...validGames[0], participants };
      }
    }

    return "Something went wrong parsing the command";
  }
}
