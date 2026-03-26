'use client';

import { useEffect } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api';

export default function ViewTracker({ articleId }) {
  useEffect(() => {
    if (!articleId) return;

    const key = `viewed_${articleId}`;
    if (sessionStorage.getItem(key)) return;

    fetch(`${API_BASE}/articles/${articleId}/view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
      .then(() => {
        sessionStorage.setItem(key, '1');
      })
      .catch((err) => {
        console.warn('View tracking failed:', err.message);
      });
  }, [articleId]);

  return null;
}
