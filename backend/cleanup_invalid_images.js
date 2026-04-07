require('dotenv').config({ override: true });
const db = require('./db');

async function run() {
  try {
    await db.query(`
      UPDATE articles
      SET images = (
        SELECT COALESCE(jsonb_agg(img), '[]'::jsonb)
        FROM jsonb_array_elements(COALESCE(images, '[]'::jsonb)) AS img
        WHERE COALESCE(img->>'url', '') !~ '^(blob:|data:)'
      )
      WHERE images IS NOT NULL
        AND images::text ~ '(blob:|data:)'
    `);

    await db.query(`
      UPDATE articles
      SET image_url = ''
      WHERE COALESCE(image_url, '') ~ '^(blob:|data:)'
    `);

    await db.query(`
      UPDATE articles
      SET image_url = COALESCE(
        (
          SELECT img->>'url'
          FROM jsonb_array_elements(COALESCE(images, '[]'::jsonb)) AS img
          WHERE COALESCE(img->>'url', '') <> ''
          ORDER BY (img->>'isFeatured')::boolean DESC NULLS LAST
          LIMIT 1
        ),
        ''
      )
      WHERE COALESCE(image_url, '') = ''
    `);

    const rows = await db.query(`
      SELECT id, slug, image_url, images
      FROM articles
      ORDER BY id DESC
      LIMIT 10
    `);

    console.log('Cleanup completed ✅');
    console.log(JSON.stringify(rows, null, 2));
    process.exit(0);
  } catch (error) {
    console.error('Cleanup failed ❌', error);
    process.exit(1);
  }
}

run();
