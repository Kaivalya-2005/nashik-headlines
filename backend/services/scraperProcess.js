const db = require("../db");
const { fetchNews } = require("./scraper");

// 30 minutes between automated runs.
const LOOP_INTERVAL_MS = 30 * 60 * 1000;

let loopTimer = null;
let lastRun = null;
let cachedColumns = null;

const getColumns = async () => {
  if (cachedColumns) return cachedColumns;
  return new Promise((resolve) => {
    db.query("SHOW COLUMNS FROM raw_articles", (err, rows) => {
      if (err || !rows) {
        cachedColumns = new Set();
      } else {
        cachedColumns = new Set(rows.map((r) => r.Field));
      }
      resolve(cachedColumns);
    });
  });
};

const isDuplicate = (url) => new Promise((resolve) => {
  db.query("SELECT 1 FROM raw_articles WHERE url = ? LIMIT 1", [url], (err, rows) => {
    if (err) return resolve(false);
    resolve(rows && rows.length > 0);
  });
});

const insertStub = async ({ title, url, sourceId, sourceName }) => {
  const cols = await getColumns();
  const hasSourceId = cols.has("source_id");
  const hasSource = cols.has("source");
  const hasStatus = cols.has("status");
  const fields = ["title", "url"];
  const values = [title, url];

  if (hasSourceId) {
    fields.push("source_id");
    values.push(sourceId || null);
  } else if (hasSource) {
    fields.push("source");
    values.push(sourceName || "");
  }

  if (cols.has("content")) {
    fields.push("content");
    values.push("");
  }

  if (cols.has("raw_html")) {
    fields.push("raw_html");
    values.push("");
  }

  if (cols.has("published_date")) {
    fields.push("published_date");
    values.push(null);
  }

  if (hasStatus) {
    fields.push("status");
    values.push("pending");
  }

  const placeholders = fields.map(() => "?").join(", ");
  const sql = `INSERT IGNORE INTO raw_articles (${fields.join(", ")}) VALUES (${placeholders})`;

  return new Promise((resolve) => {
    db.query(sql, values, (err, result) => {
      if (err) return resolve(false);
      resolve(result?.affectedRows > 0);
    });
  });
};

const runOnce = async () => {
  const collected = await fetchNews();

  let inserted = 0;
  for (const stub of collected) {
    // eslint-disable-next-line no-await-in-loop
    const exists = await isDuplicate(stub.url);
    if (exists) continue;
    // eslint-disable-next-line no-await-in-loop
    const ok = await insertStub({
      title: stub.title,
      url: stub.url,
      sourceId: stub.source_id || null,
      sourceName: stub.source || ""
    });
    if (ok) inserted += 1;
  }

  lastRun = {
    at: new Date().toISOString(),
    attempted: collected.length,
    inserted
  };

  return { inserted, attempted: collected.length };
};

const startLoop = () => {
  if (loopTimer) return { started: false, running: true };
  loopTimer = setInterval(() => {
    runOnce().catch((err) => console.error(`[scraper] loop error: ${err.message}`));
  }, LOOP_INTERVAL_MS);
  return { started: true, running: true };
};

const stopLoop = () => {
  if (!loopTimer) return { stopped: false, running: false };
  clearInterval(loopTimer);
  loopTimer = null;
  return { stopped: true, running: false };
};

const getStatus = () => ({
  running: Boolean(loopTimer),
  lastRun
});

module.exports = {
  runOnce,
  startLoop,
  stopLoop,
  getStatus
};
