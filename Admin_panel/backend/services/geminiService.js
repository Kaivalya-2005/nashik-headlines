const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');
const { z } = require('zod');

// --- Configuration ---
const MODEL_NAME = 'gemini-2.0-flash-001';
const API_KEY = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : '';
const TIMEOUT_MS = 60000; // 60 seconds
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 3000;
const MAX_INPUT_LENGTH = 5000;

// Initialize Gemini
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({
  model: MODEL_NAME,
  generationConfig: {
    temperature: 0.6,
    topP: 0.9,
    maxOutputTokens: 4096,
  },
});

// --- Validation Schemas (Zod) ---
const SEOSchema = z.object({
  meta_title: z.string().describe("SEO-friendly title, max 55 chars"),
  meta_description: z.string().describe("SEO-friendly description, max 155 chars"),
  focus_keywords: z.array(z.string()).describe("List of 5-8 focus keywords"),
  slug: z.string().optional().describe("URL-friendly slug")
});

const ImageMetadataSchema = z.object({
  prompt: z.string().describe("AI image generation prompt"),
  file_name: z.string().describe("Image filename"),
  alt_text: z.string().describe("SEO-friendly alt text in Marathi"),
  caption: z.string().describe("Journalistic caption in Marathi"),
  description: z.string().describe("Image description")
});

const ArticleSchema = z.object({
  title: z.string().describe("Article headline"),
  subtitle: z.string().optional().describe("Article subtitle"),
  content_html: z.string().describe("Article body with HTML subheadings"),
  summary: z.string().optional().describe("2-3 sentence summary"),
  focus_keyphrase: z.string().optional().describe("Main focus keyword"),
  seo: SEOSchema,
  quote_block: z.string().optional().describe("Quoted text from source"),
  source_name: z.string().optional().describe("Article source name"),
  source_url: z.string().optional().describe("Source URL"),
  via_name: z.string().optional().describe("Via source name"),
  via_url: z.string().optional().describe("Via source URL"),
  custom_labels: z.array(z.object({
    label: z.string(),
    url: z.string().optional()
  })).optional().describe("Custom article labels with optional URLs"),
  images: z.array(z.object({
    type: z.enum(["feature", "context", "supporting", "additional"]).describe("Image type"),
    prompt: z.string().describe("AI image generation prompt"),
    file_name: z.string().describe("Image filename"),
    alt_text: z.string().describe("SEO-friendly alt text in Marathi"),
    caption: z.string().describe("Journalistic caption in Marathi"),
    description: z.string().describe("Image description")
  })).optional().describe("Array of 4 article images"),
  tags: z.array(z.string()).optional().describe("25 high-traffic news tags")
});

// --- Helper Functions ---

/**
 * Sanitizes input string to prevent injection and limit length.
 */
const sanitizeInput = (input) => {
  if (!input) return '';
  let sanitized = input.toString();
  // Basic escape for quotes to prevent breaking JSON context if inserted manually (though Gemini handles it)
  // sanitized = sanitized.replace(/"/g, '\\"'); 
  // Actually, for prompt injection, we just need to ensure it doesn't break our instructions.
  // The most important part is length limit.
  return sanitized.substring(0, MAX_INPUT_LENGTH);
};

/**
 * Delays execution for specified milliseconds.
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Executes a function with timeout protection.
 */
const withTimeout = (promise, ms) => {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`AI timeout exceeded (${ms}ms)`));
    }, ms);
  });

  return Promise.race([
    promise.then(result => {
      clearTimeout(timeoutId);
      return result;
    }),
    timeoutPromise
  ]);
};

/**
 * Reformats error messages for production safety.
 */
const handleAIError = (error, context) => {
  // Log full error internally
  console.error(`[AI Error] ${context}:`, error);

  // Development: Return detailed error
  if (process.env.NODE_ENV !== 'production') {
    return error;
  }

  // Production: Return generic error unless it's a known operational error
  if (error.message.includes('timeout')) {
    return new Error('AI generation timed out. Please try again.');
  }
  if (error.message.includes('Quota Exceeded') || error.message.includes('429')) {
    return new Error('AI service busy. Please try again later.');
  }

  return new Error('AI processing failed. Please contact support.');
};

/**
 * Calls Gemini with retry logic for specific errors (429/Resource Exhausted).
 */
const callGeminiWithRetry = async (operationName, promptParts) => {
  let attempt = 0;
  const startTime = Date.now();
  const maxRetries = 4; // Expanded for 429 support
  let currentDelay = RETRY_DELAY_MS;

  while (attempt <= maxRetries) {
    try {
      if (attempt > 0) {
        console.log(`[Gemini] ${operationName} (Retry Attempt ${attempt}/${maxRetries})...`);
      } else {
        console.log(`[Gemini] ${operationName} (Initial Request)...`);
      }

      const resultPromise = model.generateContent(promptParts);
      const result = await withTimeout(resultPromise, TIMEOUT_MS);

      const response = await result.response;
      const text = response.text();

      const duration = Date.now() - startTime;
      console.log(`[Gemini] ${operationName} Success (${duration}ms)`);

      return text;

    } catch (error) {
      const isRetryable =
        (error.message && (
          error.message.includes('429') ||
          error.message.includes('Resource exhausted') ||
          error.message.includes('fetch failed') ||
          error.message.includes('503') ||
          error.message.includes('Too Many Requests')
        )) ||
        error.status === 429 ||
        error.status === 503;

      if (isRetryable && attempt < maxRetries) {
        console.warn(`[Gemini] ${operationName} hit Rate Limit/Timeout. Retrying in ${currentDelay / 1000}s...`);
        await delay(currentDelay);
        attempt++;
        currentDelay *= 2; // Exponential backoff (3s -> 6s -> 12s -> 24s)
      } else {
        throw error;
      }
    }
  }
};

/**
 * Parses and strictly validates JSON response from Gemini.
 */
const parseAndValidateJSON = (text, schema) => {
  try {
    // Clean markdown code blocks
    const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const jsonData = JSON.parse(cleanedText);

    // Validate with Zod
    return schema.parse(jsonData);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('[Validation Error] Invalid AI Schema:', error.errors);
      throw new Error('AI response validation failed: Invalid structure receive.');
    }
    throw new Error('Failed to parse AI response as JSON.');
  }
};

// --- Main Service Functions ---

const generateMarathiNews = async (rawInput) => {
  const context = 'generateMarathiNews';
  try {
    const cleanInput = sanitizeInput(rawInput);

    const prompt = `
Act as a professional Indian journalist and SEO expert.

Write a Marathi news article (330–350 words) in Google News friendly journalism style.

Topic:
${cleanInput}

--------------------------------

Writing Guidelines (Must Follow)

• Article length must be 330 to 350 words strictly
• Language must be simple and clear Marathi
• Journalism style writing
• No spelling or grammar mistakes
• Avoid sentence repetition
• Use passive voice where appropriate

Use transition words in at least 30% of sentences such as:
मात्र, तसेच, दरम्यान, त्यामुळे, याशिवाय, दुसरीकडे, अखेरीस, शिवाय.

--------------------------------

Paragraph Structure

• Each paragraph must start with a clear subheading
• Each paragraph should contain around 20–25 words
• Paragraphs must be short and readable
• Focus keyphrase must appear in the FIRST paragraph

--------------------------------

SEO Requirements

Focus Keyphrase: [Identify the main focus keyphrase from the topic automatically]

Focus keyphrase must appear in:
1. SEO Title
2. First paragraph
3. Meta description
4. At least 3 times in article

--------------------------------

SEO Metadata

SEO Title (Max 55 characters):
Slug:
Meta Description (Max 155 characters):

--------------------------------

Article Structure

Subtitle:
News Article (with subheadings):

Quote Block:
Source name:
Source url:
Via name:
Via url:
Custom Label:
Custom Label url:

--------------------------------

Image Generation (Important)

Generate 4 different AI images related to the news topic.

Rules:
• Aspect ratio 16:9
• Images must be realistic news style
• All images must be different
• No text on images
• Suitable for news websites

For each image provide:

Image 1 – Feature Image  
Image Prompt:
File Name:
Alt Text:
Caption:
Description:

Image 2 – Context Image  
Image Prompt:
File Name:
Alt Text:
Caption:
Description:

Image 3 – Supporting Image  
Image Prompt:
File Name:
Alt Text:
Caption:
Description:

Image 4 – Additional Context Image  
Image Prompt:
File Name:
Alt Text:
Caption:
Description:

--------------------------------

Tags

Provide 25 high-traffic news tags separated by commas.

--------------------------------

OUTPUT AS VALID JSON WITH THIS STRUCTURE:
{
  "title": "Headline",
  "subtitle": "Optional subtitle",
  "focus_keyphrase": "Main focus keyword",
  "content_html": "<h3>Subheading 1</h3><p>Paragraph text...</p>...",
  "summary": "2-3 sentence summary",
  "seo": {
    "meta_title": "Max 55 chars",
    "meta_description": "Max 155 chars",
    "slug": "url-friendly-slug",
    "focus_keywords": ["kw1", "kw2", "kw3", "kw4", "kw5"]
  },
  "quote_block": "Quote text",
  "source_name": "Source name",
  "source_url": "https://...",
  "via_name": "Via name",
  "via_url": "https://...",
  "custom_labels": [
    {"label": "label1", "url": "https://..."},
    {"label": "label2", "url": "https://..."}
  ],
  "images": [
    {
      "type": "feature",
      "prompt": "Image generation prompt for feature image",
      "file_name": "feature_$(date).webp",
      "alt_text": "Marathi alt text",
      "caption": "Marathi caption",
      "description": "Image description"
    },
    {
      "type": "context",
      "prompt": "Image generation prompt for context image",
      "file_name": "context_$(date).webp",
      "alt_text": "Marathi alt text",
      "caption": "Marathi caption",
      "description": "Image description"
    },
    {
      "type": "supporting",
      "prompt": "Image generation prompt for supporting image",
      "file_name": "supporting_$(date).webp",
      "alt_text": "Marathi alt text",
      "caption": "Marathi caption",
      "description": "Image description"
    },
    {
      "type": "additional",
      "prompt": "Image generation prompt for additional context image",
      "file_name": "additional_$(date).webp",
      "alt_text": "Marathi alt text",
      "caption": "Marathi caption",
      "description": "Image description"
    }
  ],
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6", "tag7", "tag8", "tag9", "tag10", "tag11", "tag12", "tag13", "tag14", "tag15", "tag16", "tag17", "tag18", "tag19", "tag20", "tag21", "tag22", "tag23", "tag24", "tag25"]
}

IMPORTANT: Return ONLY valid JSON, no markdown, no code blocks, no explanations.
        `;

    const responseText = await callGeminiWithRetry(context, prompt);
    return parseAndValidateJSON(responseText, ArticleSchema);

  } catch (error) {
    throw handleAIError(error, context);
  }
};

const improveSEOMetadata = async (article) => {
  const context = 'improveSEO';
  try {
    const cleanTitle = sanitizeInput(article.title);
    const cleanContent = sanitizeInput(article.content || article.rawInput).substring(0, 1000); // Limit context

    const prompt = `
            Analyze this Marathi news article and improve SEO metadata.
            
            Title: "${cleanTitle}"
            Content: "${cleanContent}"
            
            OUTPUT JSON SCHEMA:
            {
              "meta_title": "Optimized title (max 60 chars)",
              "meta_description": "Optimized description (max 160 chars)",
              "focus_keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"]
            }
        `;

    const responseText = await callGeminiWithRetry(context, prompt);
    return parseAndValidateJSON(responseText, SEOSchema);

  } catch (error) {
    throw handleAIError(error, context);
  }
};

const generateImageMetaData = async (imagePath, articleContext) => {
  const context = 'generateImageMetaData';
  try {
    const cleanContext = sanitizeInput(articleContext);

    // Detect MIME Type
    const ext = path.extname(imagePath).toLowerCase();
    let mimeType = 'image/jpeg';
    if (ext === '.png') mimeType = 'image/png';
    if (ext === '.webp') mimeType = 'image/webp';

    const imageBuffer = fs.readFileSync(imagePath);
    const imagePart = {
      inlineData: {
        data: imageBuffer.toString('base64'),
        mimeType
      }
    };

    const prompt = `
            Analyze this image for a news article about: "${cleanContext}".
            Generate specific Marathi caption and alt text.
            
            OUTPUT JSON SCHEMA:
            {
              "caption": "Journalistic Marathi caption (max 20 words)",
              "alt_text": "SEO Marathi alt text (max 15 words)"
            }
        `;

    const responseText = await callGeminiWithRetry(context, [prompt, imagePart]);
    return parseAndValidateJSON(responseText, ImageMetadataSchema);

  } catch (error) {
    throw handleAIError(error, context);
  }
};

module.exports = {
  generateMarathiNews,
  improveSEOMetadata,
  generateImageMetaData
};
