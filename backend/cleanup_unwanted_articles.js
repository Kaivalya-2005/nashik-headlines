#!/usr/bin/env node
/**
 * cleanup_unwanted_articles.js
 *
 * Usage:
 *  - Dry run (default): DRY_RUN=true node cleanup_unwanted_articles.js
 *  - Apply changes: APPLY_CLEANUP=true node cleanup_unwanted_articles.js
 *
 * Reads blacklist config from env or uses defaults and marks matching
 * `raw_articles` rows as `rejected` (non-destructive) when APPLY_CLEANUP=true.
 */

const db = require('./db');

const DOMAIN_BLACKLIST = (process.env.SCRAPER_DOMAIN_BLACKLIST && process.env.SCRAPER_DOMAIN_BLACKLIST.split(',').map(s => s.trim()).filter(Boolean)) || [
  'example-spam.com',
];

const KEYWORD_BLACKLIST = (process.env.SCRAPER_KEYWORD_BLACKLIST && process.env.SCRAPER_KEYWORD_BLACKLIST.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)) || [
  'advertisement', 'sponsored', 'promo', 'buy now'
];

const MIN_TITLE_WORDS = parseInt(process.env.SCRAPER_MIN_TITLE_WORDS || '2', 10);
const MIN_CONTENT_WORDS = parseInt(process.env.SCRAPER_MIN_CONTENT_WORDS || '5', 10);

const APPLY = String(process.env.APPLY_CLEANUP || '').toLowerCase() === 'true';

async function run() {
  console.log('Starting cleanup_unwanted_articles — APPLY=', APPLY);
  const rows = await db.query('SELECT id, title, content, url, status FROM raw_articles');
  const candidates = [];

  for (const r of rows) {
    const id = r.id;
    const title = String(r.title || '');
    const content = String(r.content || '');
    const url = String(r.url || '');

    let domain = '';
    try { domain = (new URL(url)).hostname.replace(/^www\./, '').toLowerCase(); } catch (e) { domain = ''; }

    const textLower = (title + ' ' + content).toLowerCase();
    const hasBlackKeyword = KEYWORD_BLACKLIST.some(k => textLower.includes(k));
    const titleWords = title.split(/\s+/).filter(Boolean).length;
    const contentWords = content.split(/\s+/).filter(Boolean).length;

    const byDomain = domain && DOMAIN_BLACKLIST.includes(domain);
    const byKeyword = hasBlackKeyword;
    const byShortness = (titleWords < MIN_TITLE_WORDS && contentWords < MIN_CONTENT_WORDS);

    if (byDomain || byKeyword || byShortness) {
      candidates.push({ id, url, domain, titleWords, contentWords, byDomain, byKeyword, byShortness, status: r.status });
    }
  }

  console.log(`Found ${candidates.length} candidate articles for cleanup.`);

  if (candidates.length === 0) {
    process.exit(0);
  }

  if (!APPLY) {
    console.log('Dry run mode — listing candidates (set APPLY_CLEANUP=true to mark rejected)');
    for (const c of candidates.slice(0, 200)) {
      console.log(`#${c.id} domain=${c.domain} url=${c.url} tWords=${c.titleWords} cWords=${c.contentWords} domainFlag=${c.byDomain} keywordFlag=${c.byKeyword} shortFlag=${c.byShortness} status=${c.status}`);
    }
    if (candidates.length > 200) console.log(`...and ${candidates.length - 200} more`);
    process.exit(0);
  }

  // Mark as rejected to avoid data loss
  const ids = candidates.map(c => c.id);
  const CHUNK = 200;
  for (let i = 0; i < ids.length; i += CHUNK) {
    const chunk = ids.slice(i, i + CHUNK);
    const placeholders = chunk.map((_, idx) => `$${idx + 1}`).join(', ');
    const sql = `UPDATE raw_articles SET status = 'rejected' WHERE id IN (${placeholders})`;
    try {
      await db.query(sql, chunk);
      console.log(`Marked ${chunk.length} articles rejected (ids ${chunk[0]}..${chunk[chunk.length-1]})`);
    } catch (err) {
      console.error('Failed to mark chunk:', err.message);
    }
  }

  console.log('Cleanup applied.');
  process.exit(0);
}

run().catch((err) => {
  console.error('Cleanup script error:', err);
  process.exit(1);
});
