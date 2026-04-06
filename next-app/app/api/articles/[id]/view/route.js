import { NextResponse } from 'next/server';
import { dbQuery } from '@/lib/server/db';

export async function POST(_request, { params }) {
  try {
    const articleId = Number(params?.id);
    if (!Number.isInteger(articleId)) {
      return NextResponse.json({ error: 'Valid article id is required' }, { status: 400 });
    }

    const today = new Date().toISOString().slice(0, 10);

    await dbQuery('UPDATE articles SET views = views + 1 WHERE id = ?', [articleId]);

    await dbQuery(
      `
        INSERT INTO analytics (article_id, view_date, views)
        VALUES (?, ?, 1)
        ON CONFLICT (article_id, view_date)
        DO UPDATE SET views = analytics.views + 1
      `,
      [articleId, today]
    );

    return NextResponse.json({ success: true, message: 'View recorded' });
  } catch (error) {
    console.error('POST /api/articles/[id]/view failed:', error);
    return NextResponse.json({ error: 'Failed to record view' }, { status: 500 });
  }
}
