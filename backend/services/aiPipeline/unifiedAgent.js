const axios = require("axios");

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
const GROQ_API_KEY = process.env.GROQ_API_KEY;

async function processAllInOne(title, content) {
  const prompt = `
You are an expert Marathi news editor, SEO specialist, and quality auditor.
Review the following raw news article and return a STRICT JSON object containing the processed data.

Raw Title: ${title}
Raw Content: ${content}

Please rewrite the article to be professional, factual, and highly readable in Marathi (400-600 words).
Ensure it is free of ads, tracking phrases, or messy formatting.

Provide your response EXACTLY in the following JSON structure:
{
  "rewritten_title": "A clear, engaging Marathi title",
  "rewritten_content": "The full rewritten Marathi article in markdown format",
  "category": "One of: Local News, National, Politics, Crime, Sports, Entertainment, Business, Tech, Education",
  "seo": {
    "seo_title": "SEO optimized title (max 60 chars)",
    "meta_description": "SEO meta description (max 150 chars)",
    "slug": "english-url-friendly-slug",
    "keywords": "comma, separated, keywords",
    "seo_score": <number 0-100 based on keyword density and general SEO strength>
  },
  "quality": {
    "ai_confidence": <number 0-100 rating factual clarity, journalism tone, and grammar>
  }
}
`;

  try {
    const response = await axios.post(
      GROQ_URL,
      {
        model: GROQ_MODEL,
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" }
      },
      {
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json"
        },
        timeout: 45000 // Slightly longer timeout for a larger task
      }
    );

    const rawContent = response.data?.choices?.[0]?.message?.content || "{}";
    return JSON.parse(rawContent);
  } catch (error) {
    if (error.response) {
      throw new Error(`Groq API Error: ${JSON.stringify(error.response.data)}`);
    } else {
      throw new Error(`Request failed: ${error.message}`);
    }
  }
}

module.exports = { processAllInOne };
