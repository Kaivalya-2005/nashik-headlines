const mysql = require("mysql2");

const db = mysql.createConnection({
  host: process.env.MYSQL_HOST || "localhost",
  user: process.env.MYSQL_USER || "root",
  password: process.env.MYSQL_PASSWORD ?? "password",
  database: process.env.MYSQL_DB || "nashik_headlines",
  port: process.env.MYSQL_PORT || 3306
});

db.connect((err) => {
  if (err) {
    console.log("DB Connection Failed ❌", err);
  } else {
    console.log("DB Connected ✅");
  }
});

module.exports = db;