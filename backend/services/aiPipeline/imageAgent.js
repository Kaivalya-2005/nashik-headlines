const axios = require("axios");

/**
 * Generates an image based on the article title and SEO keywords
 * using an external API (DALL-E, Stability AI, or Fal AI).
 * 
 * @param {string} prompt - Describe the image to generate
 * @returns {Promise<string>} - Returns the URL of the generated image
 */
async function generateImage(title, keywords) {
  // If no API key is set, skip generation gracefully
  if (!process.env.STABILITY_API_KEY && !process.env.OPENAI_API_KEY) {
    console.warn("⚠️ No image API key found (OPENAI_API_KEY or STABILITY_API_KEY). Skipping image generation.");
    // Return a random placeholder related to news
    return `https://source.unsplash.com/800x600/?news,${encodeURIComponent(keywords.split(",")[0] || "india")}`;
  }

  const prompt = `A highly professional, photorealistic news editorial image representing: ${title}. ${keywords}. No text, no words in the image. High quality, wide angle.`;

  try {
    // Determine which API to use based on available keys
    if (process.env.OPENAI_API_KEY) {
      // DALL-E 3 Implementation
      const response = await axios.post(
        "https://api.openai.com/v1/images/generations",
        {
          model: "dall-e-3",
          prompt: prompt,
          n: 1,
          size: "1024x1024",
        },
        {
          headers: {
            "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
            "Content-Type": "application/json"
          }
        }
      );
      
      return response.data.data[0].url;

    } else if (process.env.STABILITY_API_KEY) {
      // Stability AI (SDXL) Implementation
      const FormData = require('form-data');
      const data = new FormData();
      data.append('prompt', prompt);
      data.append('output_format', 'webp');
      
      const response = await axios.post(
        "https://api.stability.ai/v2beta/stable-image/generate/core",
        data,
        {
          headers: {
            ...data.getHeaders(),
            Authorization: `Bearer ${process.env.STABILITY_API_KEY}`,
            Accept: "image/*"
          },
          responseType: "arraybuffer",
        }
      );

      if (response.status === 200) {
        // You would typically save this buffer to S3, Cloudinary, etc., 
        // and return the public URL. 
        // For now, we simulate success (Base64 data or external hosting logic here)
        // Since we are returning a URL, if you rely on a storage provider, you upload the buffer there.
        console.warn("⚠️ Stability API returned raw image buffer. Implement S3 upload to resolve to URL.");
        // Example: uploading logic omitted, return local/base64 stub
        const base64 = Buffer.from(response.data).toString('base64');
        return `data:image/webp;base64,${base64}`;
      } else {
        throw new Error(`${response.status}: ${response.data.toString()}`);
      }
    }
  } catch (error) {
    console.error("❌ Image Generation Failed:", error.response?.data || error.message);
    throw new Error("Failed to generate article image.");
  }
}

module.exports = { generateImage };
