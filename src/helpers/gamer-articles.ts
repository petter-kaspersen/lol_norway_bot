import { Client, EmbedBuilder, TextChannel } from "discord.js";
import Parser from "rss-parser";

import { writeToCachefile } from "../util/cache";
import Logger from "../util/logger";
import { Helper } from "./helper";

const parser = new Parser();

const GAMER_CHANNEL = process.env.GAMER_CHANNEL || "";

export interface GamerArticle {
  title: string;
  link: string;
  author: string;
  contentSnippet: string;
  pubDate: string;
  guid: string;
}

export default class GamerArticles extends Helper {
  private rssFeedUrl: string =
    "https://www.gamer.no/rss/subject/league-of-legends";
  constructor(bot: Client) {
    super(bot);
  }

  async init() {
    if (!this.cacheFile.gamerArticles) {
      const articles = await this.readFeed();

      const ids = articles.slice(0, 10).map((i) => i.guid);

      writeToCachefile("gamerArticles", ids);

      this.reloadCacheFile();
    }

    await this.checkForNewArticles();

    setInterval(async () => {
      this.checkForNewArticles();
    }, 60 * 1000 * 5);
  }

  async checkForNewArticles() {
    const articles = await this.readFeed();

    const cacheFileIds = this.cacheFile.gamerArticles;
    const ids = articles.slice(0, 10).map((i) => i.guid);

    for (let id of ids) {
      if (cacheFileIds?.includes(id)) return;

      writeToCachefile("gamerArticles", ids);
      await this.postNewArticle(articles.find((a) => a.guid === id));
      this.reloadCacheFile();
    }
  }

  async readFeed(): Promise<GamerArticle[]> {
    const articles: { items: GamerArticle[] } = (await parser.parseURL(
      this.rssFeedUrl
    )) as { items: GamerArticle[] };

    return articles.items.map((article: GamerArticle) => article);
  }

  async postNewArticle(article: GamerArticle | undefined) {
    if (!article) {
      Logger.Error("Missing article found");
      return;
    }
    const gamerImage = "https://www.gamer.no/images/gamer-default-meta.png";

    const articleEmbed = new EmbedBuilder()
      .setColor("#ed7650")
      .setTitle(article.title)
      .setURL(article.link)
      .setAuthor({
        name: article.author,
      })
      .setDescription(article.contentSnippet)
      .setThumbnail(gamerImage)
      .setTimestamp(new Date(article.pubDate));

    const channel = this.bot.channels.cache.get(GAMER_CHANNEL) as TextChannel;

    if (!channel) {
      Logger.Error("Channel was not found for posting gamer article");
      return;
    }

    Logger.Info(`Posted new Gamer.no article with ID ${article.guid}`);

    await channel.send({ embeds: [articleEmbed] });
  }
}
