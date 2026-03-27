const db = require("./db");

const query = `
CREATE TABLE IF NOT EXISTS article_revisions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  article_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  seo_title VARCHAR(255),
  meta_description TEXT,
  keywords TEXT,
  slug VARCHAR(255),
  seo_score INT DEFAULT 0,
  quality_score INT DEFAULT 0,
  readability_score INT DEFAULT 0,
  ai_confidence INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
);
`;

db.query(query, (err, result) => {
  if (err) {
    console.error("❌ Migration failed:", err.message);
  } else {
    console.log("✅ Table 'article_revisions' created or already exists.");
  }
  process.exit();
});
