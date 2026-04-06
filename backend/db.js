const { Pool } = require("pg");
const dns = require("dns");

dns.setDefaultResultOrder(process.env.PG_DNS_RESULT_ORDER || "ipv4first");

const databaseUrl =
  process.env.DATABASE_URL ||
  process.env.SUPABASE_DB_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_CONNECTION_STRING;
let pool;

function sslConfig(hostname) {
  const enabled = String(process.env.POSTGRES_SSL || "true").toLowerCase() === "true";
  if (!enabled) return false;
  return {
    rejectUnauthorized: false,
    servername: hostname,
  };
}

async function resolveIPv4(hostname) {
  if (!hostname) return null;
  try {
    const addresses = await dns.promises.resolve4(hostname);
    return addresses?.[0] || null;
  } catch {
    return null;
  }
}

async function buildPoolConfig() {
  if (databaseUrl) {
    const parsed = new URL(databaseUrl);
    const originalHost = parsed.hostname;
    const ipv4 = await resolveIPv4(originalHost);

    return {
      host: ipv4 || originalHost,
      user: decodeURIComponent(parsed.username || "postgres"),
      password: decodeURIComponent(parsed.password || ""),
      database: decodeURIComponent(parsed.pathname?.replace(/^\//, "") || "postgres"),
      port: Number(parsed.port || 5432),
      ssl: sslConfig(originalHost),
    };
  }

  const host = process.env.POSTGRES_HOST || process.env.PGHOST || "localhost";
  const ipv4 = await resolveIPv4(host);

  return {
    host: ipv4 || host,
    user: process.env.POSTGRES_USER || process.env.PGUSER || "postgres",
    password:
      process.env.POSTGRES_PASSWORD ||
      process.env.PGPASSWORD ||
      process.env.SUPABASE_DB_PASSWORD ||
      "",
    database: process.env.POSTGRES_DB || process.env.PGDATABASE || "postgres",
    port: Number(process.env.POSTGRES_PORT || process.env.PGPORT || 5432),
    ssl: sslConfig(host),
  };
}

async function getPool() {
  if (!pool) {
    const config = await buildPoolConfig();
    pool = new Pool(config);
  }
  return pool;
}

function toPostgresPlaceholders(sql) {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}

function normalizeSql(sql) {
  let normalized = sql;

  normalized = normalized.replace(/\bINSERT\s+IGNORE\s+INTO\b/gi, "INSERT INTO");

  if (/\bINSERT\s+INTO\b/i.test(normalized) && !/\bON\s+CONFLICT\b/i.test(normalized) && /\bINSERT\s+IGNORE\s+INTO\b/i.test(sql)) {
    normalized += " ON CONFLICT DO NOTHING";
  }

  return normalized;
}

async function runQuery(sql, params = []) {
  const activePool = await getPool();
  const trimmed = String(sql || "").trim();

  const showColumnsMatch = trimmed.match(/^SHOW\s+COLUMNS\s+FROM\s+([a-zA-Z0-9_]+)/i);
  if (showColumnsMatch) {
    const tableName = showColumnsMatch[1];
    const result = await activePool.query(
      `SELECT column_name AS "Field"
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1`,
      [tableName]
    );
    return { rows: result.rows, rowCount: result.rowCount, command: "SELECT" };
  }

  const normalizedSql = normalizeSql(trimmed);
  const pgSql = toPostgresPlaceholders(normalizedSql);
  const isInsert = /^INSERT\s+INTO\b/i.test(pgSql);
  const querySql = isInsert && !/\bRETURNING\b/i.test(pgSql) ? `${pgSql} RETURNING id` : pgSql;

  return activePool.query(querySql, params);
}

function query(sql, params, callback) {
  let queryParams = params;
  let cb = callback;

  if (typeof params === "function") {
    cb = params;
    queryParams = [];
  }

  const promise = runQuery(sql, queryParams || []).then((result) => {
    const rows = result.rows || [];
    const meta = {
      affectedRows: result.rowCount || 0,
      insertId: rows[0]?.id,
      rowCount: result.rowCount || 0,
      rows,
    };

    if (typeof cb === "function") {
      if (result.command === "SELECT") {
        cb(null, rows);
      } else {
        cb(null, meta);
      }
    }

    return result.command === "SELECT" ? rows : meta;
  });

  if (typeof cb === "function") {
    promise.catch((error) => cb(error));
    return;
  }

  return promise;
}

getPool()
  .then((activePool) => activePool.connect())
  .then((client) => {
    console.log("DB Connected ✅ (PostgreSQL)");
    client.release();
  })
  .catch((err) => {
    console.log("DB Connection Failed ❌", err);
  });

module.exports = {
  query,
};