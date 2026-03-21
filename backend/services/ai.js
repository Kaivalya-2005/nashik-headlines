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

  const response = await axios.post("http://localhost:11434/api/generate", {
    model: "mistral",
    prompt,
    stream: false
  });

  const text = response.data.response;

  try {
    return JSON.parse(text);
  } catch (error) {
    console.log("JSON parse failed ❌, using fallback");
    return {
      title: "Generated News",
      content: text,
      summary: text.substring(0, 150),
      category: "General",
      seo_title: "News Update",
      meta_description: "Latest Nashik news updates from Nashik Headlines.",
      slug: "generated-news",
      keywords: ["nashik news", "maharashtra news", "india news"],
      image_alt: "Nashik headlines update",
      tags: []
    };
  }
}

module.exports = { processWithAI };
