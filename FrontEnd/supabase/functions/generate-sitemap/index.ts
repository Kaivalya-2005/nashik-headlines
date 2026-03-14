/**
 * Edge function: generate-sitemap
 * Dynamically generates sitemap.xml from published articles.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BASE_URL = "https://nashikheadlines.com";

const STATIC_PAGES = [
  { path: "/", priority: "1.0", changefreq: "hourly" },
  { path: "/search", priority: "0.5", changefreq: "daily" },
  { path: "/bookmarks", priority: "0.3", changefreq: "daily" },
];

const CATEGORIES = [
  "nashik", "shirdi", "yeola", "dhule", "malegaon", "igatpuri",
  "maharashtra", "india", "international",
  "entertainment", "sports", "politics", "business", "technology", "health", "education", "crime",
];

serve(async () => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: articles } = await supabase
      .from("articles")
      .select("id, slug, updated_at")
      .eq("is_published", true)
      .order("published_at", { ascending: false })
      .limit(1000);

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

    // Static pages
    for (const page of STATIC_PAGES) {
      xml += `
  <url>
    <loc>${BASE_URL}${page.path}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`;
    }

    // Category pages
    for (const cat of CATEGORIES) {
      xml += `
  <url>
    <loc>${BASE_URL}/category/${cat}</loc>
    <changefreq>hourly</changefreq>
    <priority>0.8</priority>
  </url>`;
    }

    // Article pages
    if (articles) {
      for (const article of articles) {
        const path = article.slug ? `/article/${article.slug}` : `/article/${article.id}`;
        xml += `
  <url>
    <loc>${BASE_URL}${path}</loc>
    <lastmod>${new Date(article.updated_at).toISOString().split("T")[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
      }
    }

    xml += `\n</urlset>`;

    return new Response(xml, {
      headers: {
        "Content-Type": "application/xml",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Sitemap error:", error);
    return new Response("Error generating sitemap", { status: 500 });
  }
});
