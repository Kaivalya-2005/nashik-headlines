require('dotenv').config();
const mysql = require('mysql2');

const connection = mysql.createConnection({
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || ''
});

connection.connect((err) => {
  if (err) {
    console.error('Failed to connect to MySQL:', err);
    process.exit(1);
  }
  
  console.log('Connected to MySQL. Creating database if it does not exist...');
  connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.MYSQL_DB || 'nashik_headlines'}\`;`, (err, results) => {
    if (err) {
      console.error('Error creating database:', err);
      process.exit(1);
    }
    console.log('Database operation successful!', results);
    process.exit(0);
  });
});
