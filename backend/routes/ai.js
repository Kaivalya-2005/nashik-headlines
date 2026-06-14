const express = require("express");
const router = express.Router();
const axios = require("axios");
const db = require("../db");

const { askGroq, askGroqFull, askGroqSeoJson, MODEL_FAST, MODEL_FULL } = require("../services/groqClient");

const AI_EDITOR_FULL_ARTICLE_GUARDRAILS = `

CRITICAL OVERRIDES (MUST FOLLOW):
- Output language must be Marathi only.
- Article content must be at least 600 Marathi words.
- Include HTML H2/H3 subheadings (use <h2> and <h3> tags, NOT markdown ##).
- Include at least one internal link to nashikheadlines.com.
- Include at least one external source link.
- Mention Nashik, Maharashtra, or India in the first paragraph.
- Meta description must be between 120 and 155 characters.
- Ensure focus keyphrase appears in title or seo title.
- Return only valid JSON without markdown or explanation.

Return ONLY a JSON object with EXACTLY these keys and no extra keys:
{
  "title": "...",
  "slug": "...",
  "metaDesc": "...",
  "category": "...",
  "content": "...",
  "summary": "...",
  "imageAlt": "...",
  "keywords": "...",
  "tags": "..."
}
`;

const AI_EDITOR_FIELD_GUARDRAILS = `

CRITICAL OVERRIDES (MUST FOLLOW):
- Output language must be Marathi only.
- Return only valid JSON without markdown or explanation.
`;

/** Count words in HTML/plain text (Yoast-style). */
function countWordsFromHtml(html) {
  return String(html || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean).length;
}

function extractJSON(text) {
  try {
    // Attempt to parse standard markdown json block
    const match = text.match(/\`\`\`(?:json)?\s*([\s\S]*?)\s*\`\`\`/);
    if (match) {
      return JSON.parse(match[1]);
    }
    // Attempt to extract curly braces content
    const inlineMatch = text.match(/\{[\s\S]*\}/);
    if (inlineMatch) {
      return JSON.parse(inlineMatch[0]);
    }
    // Final fallback
    return JSON.parse(text);
  } catch(e) {
    return null;
  }
}

const getArticleById = (id) => {
  return new Promise((resolve, reject) => {
    db.query("SELECT * FROM articles WHERE id = ?", [id], (err, results) => {
      if (err) return reject(err);
      if (results.length === 0) return resolve(null);
      resolve(results[0]);
    });
  });
};

router.post("/ai/generate-article", async (req, res) => {
  const { prompt, topic, focusKeyword, category, tone, length } = req.body;

  let fullPrompt = "";
  let isCreateFlow = false;

  if (prompt) {
    // AIEditor.jsx flow
    const isFieldPrompt = /\"result\"\s*:/i.test(String(prompt));
    fullPrompt = prompt
      .replace("[Write Topic Here]", topic || "General News")
      .replace("[Write Focus Keyphrase]", focusKeyword || topic || "News");
    fullPrompt += isFieldPrompt ? AI_EDITOR_FIELD_GUARDRAILS : AI_EDITOR_FULL_ARTICLE_GUARDRAILS;
  } else {
    // CreateArticle.jsx flow
    isCreateFlow = true;
    fullPrompt = `Write a ${length || 'medium'} English news article about: "${topic}". 
The category is ${category || 'general'} and the tone should be ${tone || 'neutral'}.
Use markdown with H2/H3 subheadings. Include at least one internal link to nashikheadlines.com and one external credible source link.
Mention Nashik, Maharashtra, or India naturally when relevant.
Format the response strictly as JSON with this structure:
{
  "title": "Article Title",
  "content": "Full article content in markdown format...",
  "summary": "Short 2 sentence summary",
  "seo_title": "SEO optimized title",
  "meta_description": "SEO meta description between 100 and 160 chars",
  "slug": "url-friendly-slug"
}`;
  }

  try {
    const aiText = await askGroq(fullPrompt, true);

    if (isCreateFlow) {
      const parsed = extractJSON(aiText);
      if (!parsed) {
        return res.status(500).json({ message: "Failed to parse AI output." });
      }

      const insertQuery = `
        INSERT INTO articles (title, slug, content, summary, seo_title, meta_description, status)
        VALUES (?, ?, ?, ?, ?, ?, 'draft')
      `;
      db.query(insertQuery, [
        parsed.title || topic,
        parsed.slug || topic.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        parsed.content || '',
        parsed.summary || '',
        parsed.seo_title || parsed.title,
        parsed.meta_description || parsed.summary
      ], (err, result) => {
        if (err) {
          console.error("DB Insert Error:", err);
          return res.status(500).json({ message: "Failed to save AI content." });
        }
        return res.json({ success: true, articleId: result.insertId });
      });

    } else {
      // AIEditor generic field generation
      res.json({ success: true, response: aiText });
    }
  } catch (error) {
    console.error("AI Generation Error:", error.message);
    res.status(500).json({ message: "Failed to generate AI content" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/ai/generate-full
// Two-phase one-click generation:
//   Phase 1: Generate article content only (text mode, ~1800 tokens output)
//   Phase 2: Generate all SEO/meta fields from the article (text mode, ~900 tokens output)
// This avoids the json_object token overflow error.
// ─────────────────────────────────────────────────────────────────────────────
router.post("/ai/generate-full", async (req, res) => {
  const { topic, source_url, publish_to } = req.body;
  if (!topic) return res.status(400).json({ error: "topic is required" });

  const isNaviMumbaiOnly = publish_to === "navimumbai";
  const isNaviMumbai     = isNaviMumbaiOnly; // kept for Phase 2 metadata compatibility
  const siteUrl          = isNaviMumbaiOnly ? "https://navimumbaiheadlines.com" : "https://nashikheadlines.com";
  const internalBase     = isNaviMumbaiOnly ? "navimumbaiheadlines.com" : "nashikheadlines.com";
  const srcUrl           = source_url || siteUrl;

  // Truncate topic to max 600 chars to prevent prompt overflow
  const topicShort = String(topic).trim().slice(0, 600);

  console.log(
    `[AI generate-full] portal=${publish_to || "nashik"} models fast=${MODEL_FAST} full=${MODEL_FULL} topic="${topicShort.slice(0, 80)}..."`
  );

  try {
    // ── PHASE 1: Generate article content ────────────────────────────────────
    let phase1Prompt;
    if (isNaviMumbaiOnly) {
      phase1Prompt = `तुम्ही navimumbaiheadlines.com साठी व्यावसायिक मराठी पत्रकार आहात.

विषय: ${topicShort}
स्रोत: ${srcUrl}

YOAST SEO नियम — सर्व काटेकोरपणे पाळा:
1. शब्द संख्या: किमान 600 मराठी शब्द. 500 पेक्षा कमी शब्द कधीही नको.
2. KEYPHRASE IN INTRO: Focus keyphrase पहिल्याच <p> परिच्छेदात (पहिल्या 50 शब्दांत) असणे आवश्यक.
3. KEYPHRASE IN SUBHEADINGS: किमान 2 H2/H3 subheadings मध्ये focus keyphrase चे शब्द असावेत.
4. KEYPHRASE DENSITY: Focus keyphrase 8-12 वेळा वापरा (1-3% density).
5. INTERNAL LINK: <a href="https://navimumbaiheadlines.com/related">येथे संबंधित बातमी वाचा</a>
6. OUTBOUND LINK: <a href="${srcUrl}">अधिकृत माहितीसाठी येथे क्लिक करा</a>
7. NO H1: <h1> टॅग लेखाच्या body मध्ये वापरू नका. फक्त <h2> आणि <h3> वापरा.
8. HTML ONLY: H2/H3 फक्त HTML tags (<h2>, <h3>). Markdown (##) वापरू नका.
9. पहिली ओळ: 👉 "नवी मुंबई : प्रतिनिधी"
10. Transition words वापरा (तसेच, याशिवाय, परिणामी, दरम्यान, त्याचप्रमाणे).
11. किमान 5 वेगळे <h2> उपशीर्षके आणि प्रत्येक खाली 2-3 <p> परिच्छेद.

फक्त मराठी लेख लिहा (HTML only). JSON नको.`;

    } else {
      // Nashik or Both → Marathi Nashik article
      phase1Prompt = `तुम्ही nashikheadlines.com साठी व्यावसायिक मराठी पत्रकार आहात.

विषय: ${topicShort}
स्रोत: ${srcUrl}

YOAST SEO नियम — सर्व काटेकोरपणे पाळा:
1. शब्द संख्या: किमान 600 मराठी शब्द. 500 पेक्षा कमी शब्द कधीही नको.
2. KEYPHRASE IN INTRO: Focus keyphrase पहिल्याच <p> परिच्छेदात (पहिल्या 50 शब्दांत) असणे आवश्यक.
3. KEYPHRASE IN SUBHEADINGS: किमान 2 H2/H3 subheadings मध्ये focus keyphrase चे शब्द असावेत.
4. KEYPHRASE DENSITY: Focus keyphrase 8-12 वेळा वापरा (1-3% density).
5. INTERNAL LINK: <a href="https://nashikheadlines.com/related">येथे संबंधित बातमी वाचा</a>
6. OUTBOUND LINK: <a href="${srcUrl}">अधिकृत माहितीसाठी येथे क्लिक करा</a>
7. NO H1: <h1> टॅग लेखाच्या body मध्ये वापरू नका. फक्त <h2> आणि <h3> वापरा.
8. HTML ONLY: H2/H3 फक्त HTML tags (<h2>, <h3>). Markdown (##) वापरू नका.
9. पहिली ओळ: 👉 "नाशिक : प्रतिनिधी"
10. Transition words वापरा (तसेच, याशिवाय, परिणामी, दरम्यान, त्याचप्रमाणे).
11. किमान 5 वेगळे <h2> उपशीर्षके आणि प्रत्येक खाली 2-3 <p> परिच्छेद.
12. नाशिक, महाराष्ट्र किंवा भारताचा उल्लेख पहिल्या परिच्छेदात करा.

फक्त मराठी लेख लिहा (HTML only). JSON नको.`;

    }

    let articleContent = await askGroqFull(phase1Prompt, 3200);

    // All portals: enforce Yoast minimum word count for Marathi articles.
    // MIN_WORDS is set to 250 so borderline articles don't waste an extra Groq call.
    if (true) {
      const MIN_WORDS = 250;
      const TARGET_WORDS = 450;
      let wordCount = countWordsFromHtml(articleContent);
      console.log(`[AI generate-full] Marathi word count (pass 1): ${wordCount}`);

      if (wordCount < MIN_WORDS) {
        console.log(`[AI generate-full] Word count ${wordCount} < ${MIN_WORDS} — expanding...`);
        const cityLabel = isNaviMumbaiOnly ? "नवी मुंबई" : "नाशिक";
        const expandPrompt = `खालील मराठी बातमी लेख वाचा आणि त्याचा विस्तार करा.

विषय: ${topicShort}

सध्याचा लेख (${wordCount} शब्द — खूप लहान):
${articleContent.slice(0, 2500)}

नियम:
- किमान ${TARGET_WORDS} मराठी शब्द.
- सुरुवातीची ओळ 👉 "${cityLabel} : प्रतिनिधी" ठेवा.
- HTML structure ठेवा: किमान 4 <h2> आणि प्रत्येक खाली 2-3 <p>.
- सर्व मूळ links ठेवा, नवीन माहिती जोडा.
- फक्त पूर्ण विस्तारित HTML लेख परत द्या. JSON नको.`;

        articleContent = await askGroqFull(expandPrompt, 2000);
        wordCount = countWordsFromHtml(articleContent);
        console.log(`[AI generate-full] Marathi word count (after expand): ${wordCount}`);

        if (wordCount < MIN_WORDS) {
          console.warn(`[AI generate-full] Article still short (${wordCount} words) after expand — continuing anyway`);
        }
      } else {
        console.log(`[AI generate-full] Word count OK (${wordCount}) — skipping expand`);
      }
    }

    // Small cooldown between Phase 1 and Phase 2 to spread TPM usage across the
    // 60-second window — prevents back-to-back spikes on the same model bucket.
    await new Promise((r) => setTimeout(r, 2000));

    // ── PHASE 2: Generate all SEO/meta fields ────────────────────────────────
    const seoLang = "Marathi"; // all portals use Marathi now
    const catList  = isNaviMumbaiOnly
      ? "Maharashtra, Navi Mumbai, India, International, Entertainment, Sports, Politics, Business, Technology, Health, Education, Crime"
      : "Nashik, Maharashtra, India, International, Entertainment, Sports, Politics, Business, Technology, Health, Education, Crime";
    const tagCount = 16; // 16 Marathi tags for all portals

    const phase2Prompt = `Based on the following ${seoLang} news article, generate SEO and social media metadata that ensures a Yoast SEO score of 90-100.

ARTICLE CONTENT:
${articleContent.slice(0, 1500)}

CRITICAL YOAST SEO REQUIREMENTS FOR ALL FIELDS:
1. "focus_keyword" MUST be 2-4 words (e.g., "Nashik road safety" not single words).
2. "seo_title" MUST START WITH the exact focus_keyword (e.g., if focus_keyword is "Nashik road safety", title starts with "Nashik road safety:").
3. "meta_description" MUST CONTAIN the focus_keyword or its synonym. Length: 120-155 chars exactly.
4. "slug" MUST CONTAIN all words from the focus_keyword separated by hyphens (e.g., "nashik-road-safety-...").
5. "image_alt" MUST CONTAIN at least half the words from the focus_keyword (e.g., "nashik road safety").
6. All fields must be in ${seoLang}.

Return ONLY a valid JSON object with these exact keys (no extra text, no markdown fences):
{
  "title": "Main headline (can start with focus_keyword)",
  "seo_title": "MUST start with focus_keyword, max 60 chars",
  "focus_keyword": "Exactly 2-4 words — the Yoast focus keyphrase in ${seoLang}",
  "slug": "all-words-from-focus-keyword-in-slug-hyphens-only",
  "meta_description": "120-155 chars, MUST contain the focus_keyword",
  "og_title": "Facebook/WhatsApp ${seoLang} title",
  "og_description": "${seoLang} social description (max 200 chars)",
  "twitter_title": "Twitter/X ${seoLang} title",
  "twitter_description": "Twitter/X ${seoLang} description (max 200 chars)",
  "excerpt": "2-3 sentence ${seoLang} WordPress excerpt",
  "summary": "2-sentence ${seoLang} summary",
  "tags": "${tagCount} high-traffic news tags separated by commas",
  "keywords": "8 SEO keywords separated by commas",
  "category": "Pick ONE from: ${catList}",
  "canonical_url": "${siteUrl}/",
  "image_alt": "50-120 chars in ${seoLang} — MUST contain focus_keyword words"
}`;

    const seoText   = await askGroqSeoJson(phase2Prompt);
    const seoParsed = extractJSON(seoText);

    if (!seoParsed) {
      // Phase 2 failed — return partial result with content + basic derived fields
      console.warn("[AI generate-full] Phase 2 SEO parse failed, returning content only");
      const fallbackTitle = articleContent.split("\n").find(l => l.trim()) || topicShort.slice(0, 80);
      return res.json({
        success: true,
        partial: true,
        data: {
          title:       fallbackTitle,
          content:     articleContent,
          language:    isNaviMumbai ? "mr" : "en",
          city:        isNaviMumbai ? "navi-mumbai" : "nashik",
          region:      "maharashtra",
          author_name: isNaviMumbaiOnly ? "नवी मुंबई हेडलाईन्स प्रतिनिधी" : "नाशिक हेडलाईन्स प्रतिनिधी",
          byline:      "प्रतिनिधी",
          source_url:  srcUrl,
          canonical_url: siteUrl + "/",
        }
      });
    }

    // Merge article content into SEO result
    const result = {
      title:               seoParsed.title       || topicShort.slice(0, 80),
      seo_title:           seoParsed.seo_title   || seoParsed.title || topicShort.slice(0, 60),
      slug:                seoParsed.slug        || topicShort.toLowerCase().slice(0, 60).replace(/[^a-z0-9\u0900-\u097f]+/gi, "-"),
      meta_description:    seoParsed.meta_description  || "",
      focus_keyword:       seoParsed.focus_keyword     || "",
      canonical_url:       seoParsed.canonical_url     || siteUrl + "/",
      og_title:            seoParsed.og_title          || seoParsed.title || "",
      og_description:      seoParsed.og_description    || seoParsed.meta_description || "",
      twitter_title:       seoParsed.twitter_title     || seoParsed.og_title || "",
      twitter_description: seoParsed.twitter_description || seoParsed.og_description || "",
      content:             articleContent,
      excerpt:             seoParsed.excerpt    || seoParsed.summary || "",
      summary:             seoParsed.summary    || "",
      tags:                seoParsed.tags       || "",
      keywords:            seoParsed.keywords   || "",
      category:            seoParsed.category   || "",
      source_url:          srcUrl,
      author_name:         isNaviMumbaiOnly ? "नवी मुंबई हेडलाईन्स प्रतिनिधी" : "नाशिक हेडलाईन्स प्रतिनिधी",
      byline:              "प्रतिनिधी",
      city:                isNaviMumbaiOnly ? "navi-mumbai" : "nashik",
      region:              "maharashtra",
      language:            "mr",
      image_alt:           seoParsed.image_alt || "",
    };

    res.json({ success: true, data: result });
  } catch (err) {
    console.error("[AI generate-full] Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});



router.post("/ai/rewrite", async (req, res) => {
  const { id } = req.body;
  try {
    const article = await getArticleById(id);
    if (!article) return res.status(404).json({ message: "Article not found" });

    const prompt = `Rewrite the following Marathi article to improve flow and readability while strictly following SEO best practices. 
MANDATORY RULES:
1. Ensure the article is detailed and comprehensive (at least 600 words).
2. The focus keyphrase of the article MUST appear in the FIRST sentence of the text.
3. The focus keyphrase MUST appear 8-12 times throughout the text.
4. Include clear headings (H2/H3) and ensure the focus keyphrase appears in at least two subheadings.
5. Provide the output in clean HTML format.

Original Article:
${article.content}`;
    const aiText = await askGroq(prompt);

    db.query("UPDATE articles SET content = ? WHERE id = ?", [aiText, id], (err) => {
      if (err) return res.status(500).json({ message: "Failed to save rewritten content." });
      res.json({ message: "Article rewritten successfully.", content: aiText });
    });
  } catch(e) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/ai/summarize", async (req, res) => {
  const { id } = req.body;
  try {
    const article = await getArticleById(id);
    if (!article) return res.status(404).json({ message: "Article not found" });

    const prompt = `Provide a short, 2-sentence summary in Marathi for the following article:

${article.content}`;
    const aiText = await askGroq(prompt);

    db.query("UPDATE articles SET summary = ? WHERE id = ?", [aiText.trim(), id], (err) => {
      if (err) return res.status(500).json({ message: "Failed to save summary." });
      res.json({ message: "Article summarized.", summary: aiText });
    });
  } catch(e) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/ai/generate-seo", async (req, res) => {
  const { id } = req.body;
  try {
    const article = await getArticleById(id);
    if (!article) return res.status(404).json({ message: "Article not found" });

    const prompt = `Analyze the following Marathi article and generate highly optimized SEO metadata.
MANDATORY SEO RULES (CRITICAL):
1. Identify a 2-4 word "focus_keyword" for the article.
2. "seo_title" MUST START EXACTLY with the focus_keyword (max 60 chars).
3. "meta_description" MUST CONTAIN the focus_keyword.
4. "meta_description" MUST BE STRICTLY between 120 and 155 characters in length.

Respond in strictly valid JSON format:
{
  "focus_keyword": "...",
  "seo_title": "...",
  "meta_description": "..."
}

Article:
${article.content}`;
    
    const aiText = await askGroq(prompt, true);
    const parsed = extractJSON(aiText);
    
    if(!parsed) return res.status(500).json({ message: "AI returned invalid format." });

    db.query("UPDATE articles SET seo_title = ?, meta_description = ?, focus_keyword = ? WHERE id = ?", 
      [parsed.seo_title, parsed.meta_description, parsed.focus_keyword, id], 
      (err) => {
        if (err) return res.status(500).json({ message: "Failed to save SEO data." });
        res.json({ message: "SEO updated.", seoData: parsed });
    });
  } catch(e) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/ai/generate-tags", async (req, res) => {
  const { id } = req.body;
  try {
    const article = await getArticleById(id);
    if (!article) return res.status(404).json({ message: "Article not found" });

    const prompt = `Generate 5 comma-separated tags for the following Marathi article. Return ONLY the comma-separated tags as a single string.

${article.content}`;

    const aiText = await askGroq(prompt);

    db.query("UPDATE articles SET tags = ? WHERE id = ?", [aiText.trim(), id], (err) => {
      if (err) return res.status(500).json({ message: "Failed to save tags." });
      res.json({ message: "Tags generated.", tags: aiText.trim() });
    });
  } catch(e) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/ai/generate-image-alt", async (req, res) => {
  const { id } = req.body;
  try {
    const article = await getArticleById(id);
    if (!article) return res.status(404).json({ message: "Article not found" });

    const prompt = `You are an SEO expert. Based on the following Marathi news article title and content, write a concise, descriptive image alt-text in Marathi.
MANDATORY RULES:
1. Identify the main focus keyphrase (2-4 words) of the article.
2. The alt-text MUST contain all the words from the focus keyphrase.
3. Length MUST be 50-120 characters.

Respond with ONLY the alt-text string, no explanation, no quotes.

Title: ${article.title}
Summary: ${article.summary || article.content.substring(0, 200)}`;

    const aiText = await askGroq(prompt);
    res.json({ altText: aiText.trim() });
  } catch(e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;
