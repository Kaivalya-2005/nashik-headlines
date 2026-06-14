# Database backup (Supabase / PostgreSQL)

The live database is **Supabase** (`DATABASE_URL` in `backend/.env`).  
This folder is the **schema backup** — not a second database.

## Files

| File | Purpose |
|------|---------|
| `schema.sql` | Full PostgreSQL DDL (tables, indexes, triggers, RLS) |
| `seed.sql` | Default portals + admin user |
| `unified_schema.sql` | Legacy alias → same as `schema.sql` |

## Schema / migrations

Supabase is the live database. Use `schema.sql` + `seed.sql` for backup and new environments.

Removed from `backend/` (legacy MySQL one-offs): `migrate_*.js`, `import_db.js`, `setup_db.js`, `backfill_scores.js`, `BACKEND_API_GUIDE.js`.

## Restore to a new Supabase project

1. Supabase Dashboard → **SQL Editor**
2. Paste and run `schema.sql`
3. Paste and run `seed.sql`
4. Set `DATABASE_URL` in `backend/.env`
5. Configure Navi Mumbai portal credentials (SQL or admin Portal Settings)

## Sync backup from live Supabase (optional)

With `pg_dump` and your connection string:

```bash
pg_dump "$DATABASE_URL" --schema-only --no-owner --no-privileges -f database/schema.live.dump.sql
pg_dump "$DATABASE_URL" --data-only --table=portals --table=admin_users -f database/seed.live.dump.sql
```

## Tables overview

- **articles** — Nashik Headlines CMS (draft / published on Next.js site)
- **portals** — WordPress API credentials (`navimumbai`, `nashik`)
- **publish_log** — WP publish history (`article_id` nullable for AI Editor direct draft)
- **raw_articles**, **logs** — scraper pipeline
- **categories**, **sources**, **admin_users**, **analytics**, **article_revisions**

Navi Mumbai AI Editor flow: **WordPress draft only** — no `articles` row required.
