import { NextResponse } from 'next/server';
import { dbQuery } from '@/lib/server/db';

export const revalidate = 300;

function resolveBackendBase() {
  const candidates = [
    process.env.BACKEND_API_BASE_URL,
    process.env.NEXT_PUBLIC_BACKEND_URL,
    process.env.PUBLIC_API_URL,
  ];

  const value = candidates.find((item) => String(item || '').trim().length > 0) || '';
  return String(value).replace(/\/$/, '');
}

export async function GET(request) {
  const backendBase = resolveBackendBase();
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const query = searchParams.get('q');

  try {
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
        a.tags,
        a.image_url,
        a.image_alt,
        a.images,
        a.published_at,
        a.created_at,
        a.updated_at,
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
      sql += ` AND (a.title ILIKE ? OR a.summary ILIKE ? OR a.content ILIKE ?)`;
      const like = `%${query}%`;
      params.push(like, like, like);
    }

    sql += ` ORDER BY COALESCE(a.published_at, a.created_at) DESC LIMIT 200`;

    const rows = await dbQuery(sql, params);
    return NextResponse.json(rows || []);
  } catch (error) {
    console.error('GET /api/articles/published failed:', error);

    if (backendBase) {
      try {
        const backendUrl = new URL(`${backendBase}/api/articles`);
        if (category) backendUrl.searchParams.set('category', category);
        const backendRes = await fetch(backendUrl.toString(), { cache: 'no-store' });
        if (backendRes.ok) {
          const data = await backendRes.json();
          const published = (Array.isArray(data) ? data : []).filter((item) => item?.status === 'published');
          const filtered = query
            ? published.filter((item) => {
                const q = String(query).toLowerCase();
                return [item?.title, item?.summary, item?.content].some((v) => String(v || '').toLowerCase().includes(q));
              })
            : published;
          return NextResponse.json(filtered);
        }
      } catch (fallbackError) {
        console.error('Backend fallback for /api/articles/published failed:', fallbackError);
      }
    }

    return NextResponse.json([]);
  }
}
