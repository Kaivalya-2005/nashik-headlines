import { NextResponse } from 'next/server';
import { dbQuery } from '@/lib/server/db';

export const revalidate = 60;

export async function GET(_request, { params }) {
  const backendBase = String(process.env.BACKEND_API_BASE_URL || '').replace(/\/$/, '');

  try {
    const idOrSlug = params?.id;
    if (!idOrSlug) {
      return NextResponse.json({ error: 'Article id is required' }, { status: 400 });
    }

    const bySlug = await dbQuery(
      `
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
        WHERE a.slug = ? AND a.status = 'published'
        LIMIT 1
      `,
      [idOrSlug]
    );

    const numericId = Number(idOrSlug);
    const byId = Number.isInteger(numericId)
      ? await dbQuery(
          `
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
            WHERE a.id = ? AND a.status = 'published'
            LIMIT 1
          `,
          [numericId]
        )
      : [];

    const article = bySlug?.[0] || byId?.[0];
    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    return NextResponse.json(article);
  } catch (error) {
    console.error('GET /api/articles/[id] failed:', error);

    if (backendBase) {
      try {
        const idOrSlug = params?.id;
        const backendRes = await fetch(`${backendBase}/api/articles/${idOrSlug}`, { cache: 'no-store' });
        if (backendRes.ok) {
          const data = await backendRes.json();
          if (data?.status === 'published') {
            return NextResponse.json(data);
          }
        }
      } catch (fallbackError) {
        console.error('Backend fallback for /api/articles/[id] failed:', fallbackError);
      }
    }

    return NextResponse.json({ error: 'Failed to fetch article' }, { status: 500 });
  }
}
