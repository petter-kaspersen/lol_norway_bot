import { Client } from "discord.js";

import createOrReturnCachefile, { Cache } from "../util/cache";

export class Helper {
  public bot: Client;
  public cacheFile: Cache = createOrReturnCachefile();
  constructor(bot: Client) {
    this.bot = bot;

    bot.on("ready", this.init.bind(this));
  }

  async init() {}

  reloadCacheFile() {
    this.cacheFile = createOrReturnCachefile();
  }
}
