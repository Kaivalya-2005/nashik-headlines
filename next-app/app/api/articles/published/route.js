import { NextResponse } from 'next/server';
import { dbQuery } from '@/lib/server/db';

export const revalidate = 300;

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const query = searchParams.get('q');

    let sql = `
      SELECT
        a.id,
        a.slug,
        a.title,
        a.content,
        a.summary,
        a.seo_title,
        a.meta_description,
        a.keywords,
        a.image_url,
        a.published_at,
        a.views,
        c.name AS category_name,
        c.slug AS category_slug
      FROM articles a
      LEFT JOIN categories c ON a.category_id = c.id
      WHERE a.status = 'published'
    `;

    const params = [];

    if (category) {
      sql += ` AND c.slug = ?`;
      params.push(category);
    }

    if (query) {
      sql += ` AND (a.title LIKE ? OR a.summary LIKE ? OR a.content LIKE ?)`;
      const like = `%${query}%`;
      params.push(like, like, like);
    }

    sql += ` ORDER BY a.published_at DESC LIMIT 200`;

    const rows = await dbQuery(sql, params);
    return NextResponse.json(rows || []);
  } catch (error) {
    console.error('GET /api/articles/published failed:', error);
    return NextResponse.json({ error: 'Failed to fetch published articles' }, { status: 500 });
  }
}
