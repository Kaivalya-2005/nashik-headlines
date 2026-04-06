import pg from 'pg';
import dns from 'dns';

dns.setDefaultResultOrder(process.env.PG_DNS_RESULT_ORDER || 'ipv4first');

const { Pool } = pg;
let pool;

function sslConfig(hostname) {
  const enabled = String(process.env.POSTGRES_SSL || 'true').toLowerCase() === 'true';
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
  const databaseUrl =
    process.env.DATABASE_URL ||
    process.env.SUPABASE_DB_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_CONNECTION_STRING;

  if (databaseUrl) {
    const parsed = new URL(databaseUrl);
    const originalHost = parsed.hostname;
    const ipv4 = await resolveIPv4(originalHost);

    return {
      host: ipv4 || originalHost,
      user: decodeURIComponent(parsed.username || 'postgres'),
      password: decodeURIComponent(parsed.password || ''),
      database: decodeURIComponent(parsed.pathname?.replace(/^\//, '') || 'postgres'),
      port: Number(parsed.port || 5432),
      ssl: sslConfig(originalHost),
    };
  }

  const host = process.env.POSTGRES_HOST || process.env.PGHOST || 'localhost';
  const ipv4 = await resolveIPv4(host);

  return {
    host: ipv4 || host,
    user: process.env.POSTGRES_USER || process.env.PGUSER || 'postgres',
    password:
      process.env.POSTGRES_PASSWORD ||
      process.env.PGPASSWORD ||
      process.env.SUPABASE_DB_PASSWORD ||
      '',
    database: process.env.POSTGRES_DB || process.env.PGDATABASE || 'postgres',
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
  return sql.replace(
    /ON\s+DUPLICATE\s+KEY\s+UPDATE\s+views\s*=\s*views\s*\+\s*1/gi,
    'ON CONFLICT (article_id, view_date) DO UPDATE SET views = analytics.views + 1'
  );
}

export async function dbQuery(sql, params = []) {
  const normalizedSql = normalizeSql(String(sql || '').trim());
  const pgSql = toPostgresPlaceholders(normalizedSql);
  const activePool = await getPool();
  const result = await activePool.query(pgSql, params);
  return result.rows || [];
}
