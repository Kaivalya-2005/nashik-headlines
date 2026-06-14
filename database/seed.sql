-- =============================================================================
-- Nashik Headlines — seed data (run after schema.sql on a fresh Supabase DB)
-- =============================================================================

-- Portals
INSERT INTO portals (slug, name) VALUES
  ('nashik', 'Nashik Headlines'),
  ('navimumbai', 'Navi Mumbai Headlines')
ON CONFLICT (slug) DO NOTHING;

-- Default admin (change password after first login)
INSERT INTO admin_users (username, password, role)
VALUES (
  'nashikheadlines@gmail.com',
  '$2b$12$ZzdWQlJhEDvNp8rmgMVwIOKhQnuAk56/j94l98Q5EaEpifLqV/8Gu',
  'admin'
)
ON CONFLICT (username) DO NOTHING;

-- Optional: set Navi Mumbai WordPress credentials (or use Portal Settings in admin)
-- UPDATE portals SET
--   wp_api_url      = 'https://navimumbaiheadlines.com/wp-json/wp/v2',
--   wp_username     = 'your-wp-user',
--   wp_app_password = 'your-application-password'
-- WHERE slug = 'navimumbai';
