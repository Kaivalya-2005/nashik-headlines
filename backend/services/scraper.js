const Parser = require("rss-parser");
const parser = new Parser({ timeout: 15000 });

// Default sources; feel free to add more.
const SOURCES = [
  "https://news.google.com/rss",
  "https://feeds.bbci.co.uk/news/rss.xml"
];

async function fetchNews() {
  const allArticles = [];

  for (const url of SOURCES) {
    try {
      const feed = await parser.parseURL(url);
      const items = feed.items || [];
      const mapped = items.map((item) => ({
        title: item.title,
        content: item.contentSnippet || item.content || "",
        url: item.link,
        source: url
      }));
      allArticles.push(...mapped);
    } catch (err) {
      console.error(`[scraper] RSS failed ${url}: ${err.message}`);
    }
  }

  return allArticles;
}

module.exports = { fetchNews };