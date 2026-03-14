
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- Backfill slugs from titles for existing rows
UPDATE public.articles SET slug = lower(regexp_replace(regexp_replace(title, '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g')) WHERE slug IS NULL;
