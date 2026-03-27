const axios = require("axios");

async function processWithAI(content) {
  const prompt = `
Rewrite this news article professionally for a local news website.

SEO requirements:
- Target location terms: Nashik, Maharashtra, India (where relevant)
- Include clear heading structure using markdown (H2/H3)
- Add at least one internal link placeholder to Nashik Headlines articles using /article/... format
- Add at least one external trusted source link if factual context requires it
- Prefer active voice and short readable paragraphs

Return ONLY valid JSON in this format:
{
  "title": "",
  "content": "",
  "summary": "",
  "category": "",
  "seo_title": "",
  "meta_description": "",
  "slug": "",
  "keywords": [],
  "image_alt": "",
  "tags": []
}

Article:
${content}
`;

  const response = await axios.post("https://api.groq.com/openai/v1/chat/completions", {
    model: process.env.GROQ_MODEL || "llama-3.1-8b-instant",
    messages: [{ role: "user", content: prompt }]
  }, {
    headers: {
      "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
      "Content-Type": "application/json"
    }
  });

  const text = response.data.choices[0].message.content;

  let jsonString = text;
  // Extract JSON from markdown code block if present
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    jsonString = jsonMatch[1];
  }

  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.log("JSON parse failed ❌, using fallback");
    const uniqueId = Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
    return {
      title: "Generated News",
      content: text,
      summary: text.substring(0, 150),
      category: "General",
      seo_title: "News Update",
      meta_description: "Latest Nashik news updates from Nashik Headlines.",
      slug: `generated-news-${uniqueId}`,
      keywords: ["nashik news", "maharashtra news", "india news"],
      image_alt: "Nashik headlines update",
      tags: []
    };
  }
}

module.exports = { processWithAI };
