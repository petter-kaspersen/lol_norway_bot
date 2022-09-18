const fs = require("fs");

const Parser = require("rss-parser");
const parser = new Parser();

const discord = require("discord.js");
class GamerArticles {
  constructor(bot) {
    this.bot = bot;

    this.rssFeedUrl = "https://www.gamer.no/rss/subject/league-of-legends";

    // Naively assume cache-file exists.
    this.cacheFile = JSON.parse(
      fs.readFileSync(process.env.CACHE_FILE, "utf-8")
    );

    bot.on("ready", this.init.bind(this));
  }

  async init() {
    if (!this.cacheFile.cachedArticles) {
      const feed = await this.readFeed();

      const ids = feed.items.slice(0, 10).map((i) => i.guid);

      fs.writeFileSync(
        process.env.CACHE_FILE,
        JSON.stringify({
          ...this.cacheFile,
          cachedArticles: ids,
        })
      );

      this.reloadCacheFile();
    }

    await this.checkForNewArticles();
    setInterval(async () => {
      this.checkForNewArticles();
    }, 60 * 1000 * 5);
  }

  async checkForNewArticles() {
    const feed = await this.readFeed();

    // Read the 10 newest articles;

    const cacheFileIds = this.cacheFile.cachedArticles;
    const ids = feed.items.slice(0, 10).map((i) => i.guid);

    for (let id of ids) {
      if (!cacheFileIds.includes(id)) {
        console.log(`New article found with id: ${id}`);

        const ids = feed.items.slice(0, 10).map((i) => i.guid);

        fs.writeFileSync(
          process.env.CACHE_FILE,
          JSON.stringify({
            ...this.cacheFile,
            cachedArticles: ids,
          })
        );

        await this.postNewArticle(feed.items.find((i) => i.guid === id));
        this.reloadCacheFile();
      }
    }
  }

  async postNewArticle(article) {
    const gamerImage = "https://www.gamer.no/images/gamer-default-meta.png";

    const articleEmbed = new discord.EmbedBuilder()
      .setColor("#ed7650")
      .setTitle(article.title)
      .setURL(article.link)
      .setAuthor({
        name: article.author,
      })
      .setDescription(article.contentSnippet)
      .setThumbnail(gamerImage)
      .setTimestamp(new Date(article.pubDate));
    const channel = this.bot.channels.cache.get(process.env.GAMER_CHANNEL);

    await channel.send({ embeds: [articleEmbed] });
  }

  async readFeed() {
    return await parser.parseURL(this.rssFeedUrl);
  }

  reloadCacheFile() {
    this.cacheFile = JSON.parse(
      fs.readFileSync(process.env.CACHE_FILE, "utf-8")
    );
  }
}

module.exports = GamerArticles;
