import mysql from 'mysql2/promise';

let pool;

function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.MYSQL_HOST || 'localhost',
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD ?? 'password',
      database: process.env.MYSQL_DB || 'nashik_headlines',
      port: Number(process.env.MYSQL_PORT || 3306),
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
  }

  return pool;
}

export async function dbQuery(sql, params = []) {
  const [rows] = await getPool().query(sql, params);
  return rows;
}
