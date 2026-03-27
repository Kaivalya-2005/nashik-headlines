const fs = require('fs');
const mysql = require('mysql2');
require('dotenv').config();

const connection = mysql.createConnection({
  host: process.env.MYSQL_HOST || '127.0.0.1',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DB || 'nashik_headlines',
  multipleStatements: true
});

connection.connect((err) => {
  if (err) throw err;
  const sql = fs.readFileSync('../database/unified_schema.sql', 'utf8');
  connection.query(sql, (error, results) => {
    if (error) {
      console.error('Import failed:', error);
      process.exit(1);
    }
    console.log('Database schema imported successfully!', results ? 'Done' : '');
    process.exit(0);
  });
});
