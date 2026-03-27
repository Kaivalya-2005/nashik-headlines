const express = require("express");
const router = express.Router();
const axios = require("axios");
const db = require("../db");

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
const GROQ_API_KEY = process.env.GROQ_API_KEY;

async function askGroq(prompt, jsonFormat = false) {
  try {
    const payload = {
      model: GROQ_MODEL,
      messages: [{ role: "user", content: prompt }]
    };
    if (jsonFormat) {
      payload.response_format = { type: "json_object" };
    }

    const response = await axios.post(GROQ_URL, payload, {
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json"
      }
    });
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error("Groq AI Error:", error.response ? error.response.data : error.message);
    throw new Error("Failed to communicate with Groq AI model");
  }
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
    fullPrompt = prompt
      .replace("[Write Topic Here]", topic || "General News")
      .replace("[Write Focus Keyphrase]", focusKeyword || topic || "News");
  } else {
    // CreateArticle.jsx flow
    isCreateFlow = true;
    fullPrompt = `Write a ${length || 'medium'} Marathi news article about: "${topic}". 
The category is ${category || 'general'} and the tone should be ${tone || 'neutral'}.
Format the response strictly as JSON with this structure:
{
  "title": "Article Title",
  "content": "Full article content in markdown format...",
  "summary": "Short 2 sentence summary",
  "seo_title": "SEO optimized title",
  "meta_description": "SEO meta description",
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

router.post("/ai/rewrite", async (req, res) => {
  const { id } = req.body;
  try {
    const article = await getArticleById(id);
    if (!article) return res.status(404).json({ message: "Article not found" });

    const prompt = `Rewrite the following Marathi article to improve flow and readability while keeping the original meaning:

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

    const prompt = `Analyze the following Marathi article and generate an SEO title (max 60 chars) and meta description (max 150 chars). 
Respond in strictly valid JSON format:
{
  "seo_title": "...",
  "meta_description": "..."
}

Article:
${article.content}`;
    
    const aiText = await askGroq(prompt, true);
    const parsed = extractJSON(aiText);
    
    if(!parsed) return res.status(500).json({ message: "AI returned invalid format." });

    db.query("UPDATE articles SET seo_title = ?, meta_description = ? WHERE id = ?", 
      [parsed.seo_title, parsed.meta_description, id], 
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

router.post("/ai/generate-image", async (req, res) => {
  const { id } = req.body;
  try {
    const article = await getArticleById(id);
    if (!article) return res.status(404).json({ message: "Article not found" });

    const prompt = `Based on the following Marathi article, write a brief, descriptive english prompt that could be fed into an image generation model like Midjourney to create a thumbnail image.

${article.title}
${article.content}`;

    const aiText = await askGroq(prompt);
    res.json({ prompt: aiText.trim() });
  } catch(e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;
