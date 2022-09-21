import { Client } from "discord.js";
import { Helper } from "./helper";

export default class RiotVerification extends Helper {
  private validIcons: number[] = [27, 10, 21, 28, 19, 18, 23];

  constructor(bot: Client) {
    super(bot);
  }
}
