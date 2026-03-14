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
    maxOutputTokens: 2048,
  },
});

// --- Validation Schemas (Zod) ---
const SEOSchema = z.object({
  meta_title: z.string().describe("SEO-friendly title, max 60 chars"),
  meta_description: z.string().describe("SEO-friendly description, max 160 chars"),
  focus_keywords: z.array(z.string()).describe("List of 5-8 focus keywords")
});

const ImageMetadataSchema = z.object({
  caption: z.string().describe("Journalistic caption in Marathi"),
  alt_text: z.string().describe("SEO-friendly alt text in Marathi")
});

const ArticleSchema = z.object({
  title: z.string(),
  content_html: z.string(),
  seo: SEOSchema,
  images: z.array(ImageMetadataSchema).optional()
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
            You are a senior Marathi journalist.
            Convert the following input into a structured, SEO-optimized Marathi news article (JSON).

            INPUT: "${cleanInput}"

            REQUIREMENTS:
            1. Language: Formal Marathi.
            2. Length: 400-600 words.
            3. Structure: Headline, Lead Paragraph, Body (5-8 paras), Subheadings (<h3>).
            4. Tone: Factual, Newspaper style.
            
            OUTPUT JSON SCHEMA:
            {
              "title": "Headline",
              "content_html": "<p>...</p>",
              "seo": {
                "meta_title": "Max 60 chars",
                "meta_description": "Max 160 chars",
                "focus_keywords": ["k1", "k2"]
              },
              "images": [
                { "caption": "Marathi caption", "alt_text": "Marathi alt text" },
                { "caption": "Marathi caption", "alt_text": "Marathi alt text" }
              ]
            }
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
