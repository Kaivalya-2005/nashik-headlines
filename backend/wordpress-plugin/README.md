# Yoast SEO REST API Bridge (Navi Mumbai Headlines)

Required for Yoast focus keyword, meta description, OG/Twitter fields to appear correctly in WordPress after AI Editor publish.

## Install (one time)

1. Copy `yoast-rest-api-bridge.php` to your WordPress server:

   ```
   /wp-content/mu-plugins/yoast-rest-api-bridge.php
   ```

   Create the `mu-plugins` folder if it does not exist. Must-use plugins load automatically (no activation in admin).

2. Ensure **Yoast SEO** plugin is installed and active.

3. Verify the bridge is live:

   ```
   GET https://navimumbaiheadlines.com/wp-json/nmh/v1/ping
   ```

   Expected response:

   ```json
   { "status": "ok", "plugin": "yoast-rest-api-bridge", "version": "2.0.0" }
   ```

4. From the admin panel backend (logged in):

   ```
   GET /api/publish/yoast-check
   ```

## Notes

- Posts from AI Editor are always saved as **WordPress drafts** only (never auto-published live).
- The WP user (Application Password) must have `edit_posts` permission.
