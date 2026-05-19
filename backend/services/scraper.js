const Parser = require("rss-parser");
const parser = new Parser({ timeout: 15000 });

// Allow configuring sources via env var (comma-separated) for production.
const DEFAULT_SOURCES = [
  "https://news.google.com/rss",
  "https://feeds.bbci.co.uk/news/rss.xml"
];

const SOURCES = (process.env.SCRAPER_SOURCES && process.env.SCRAPER_SOURCES.split(',').map(s => s.trim()).filter(Boolean)) || DEFAULT_SOURCES;

// Domain / keyword blacklist to avoid known spammy sources or unwanted topics.
const DOMAIN_BLACKLIST = (process.env.SCRAPER_DOMAIN_BLACKLIST && process.env.SCRAPER_DOMAIN_BLACKLIST.split(',').map(s => s.trim()).filter(Boolean)) || [
  // add production-known bad domains here
  'example-spam.com',
];

const KEYWORD_BLACKLIST = (process.env.SCRAPER_KEYWORD_BLACKLIST && process.env.SCRAPER_KEYWORD_BLACKLIST.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)) || [
  // generic unwanted keywords
  'advertisement', 'sponsored', 'promo', 'buy now'
];

const MIN_TITLE_WORDS = parseInt(process.env.SCRAPER_MIN_TITLE_WORDS || '2', 10);
const MIN_CONTENT_WORDS = parseInt(process.env.SCRAPER_MIN_CONTENT_WORDS || '5', 10);

async function fetchNews() {
  const allArticles = [];

  for (const url of SOURCES) {
    try {
      const feed = await parser.parseURL(url);
      const items = feed.items || [];
      const mapped = items.map((item) => {
        const title = item.title || '';
        const content = item.contentSnippet || item.content || '';
        const link = item.link || '';

        // Basic filtering: domain blacklist
        let domain = '';
        try { domain = (new URL(link)).hostname.replace(/^www\./, '').toLowerCase(); } catch (e) { domain = ''; }

        // Keyword checks
        const textLower = (title + ' ' + content).toLowerCase();
        const hasBlackKeyword = KEYWORD_BLACKLIST.some(k => textLower.includes(k));

        // Word count checks
        const titleWords = title.split(/\s+/).filter(Boolean).length;
        const contentWords = content.split(/\s+/).filter(Boolean).length;

        return {
          title,
          content,
          url: link,
          source: url,
          domain,
          hasBlackKeyword,
          titleWords,
          contentWords
        };
      }).filter(item => {
        // Drop items from blacklisted domains
        if (item.domain && DOMAIN_BLACKLIST.includes(item.domain)) return false;
        // Drop items with blacklisted keywords
        if (item.hasBlackKeyword) return false;
        // Drop items too short to be useful
        if (item.titleWords < MIN_TITLE_WORDS && item.contentWords < MIN_CONTENT_WORDS) return false;
        return true;
      });
      allArticles.push(...mapped);
    } catch (err) {
      console.error(`[scraper] RSS failed ${url}: ${err.message}`);
    }
  }

  return allArticles;
}

module.exports = { fetchNews };