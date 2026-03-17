// =============================================
// MANUS AGENTS SERVICE
// Wrapper for local multi-agent AI system
// Replaces Google Gemini API
// =============================================

const axios = require('axios');

// Configuration
const MANUS_API_BASE = process.env.MANUS_AGENTS_URL || 'http://localhost:8002';
const TIMEOUT_MS = 120000; // 2 minutes for agent processing
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

// ===== HELPER FUNCTIONS =====

/**
 * Sanitizes input string to prevent injection and limit length
 */
const sanitizeInput = (input) => {
  if (!input) return '';
  return input.toString().substring(0, 5000);
};

/**
 * Delays execution for specified milliseconds
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Executes a request with retry logic
 */
const withRetry = async (operationName, fn) => {
  let attempt = 0;
  let lastError;

  while (attempt <= MAX_RETRIES) {
    try {
      if (attempt > 0) {
        console.log(`[Manus] ${operationName} (Retry ${attempt}/${MAX_RETRIES})...`);
      } else {
        console.log(`[Manus] ${operationName}...`);
      }

      const result = await fn();
      console.log(`[Manus] ${operationName} Success`);
      return result;

    } catch (error) {
      lastError = error;
      const isRetryable = 
        error.code === 'ECONNREFUSED' ||
        error.code === 'ETIMEDOUT' ||
        (error.response && (error.response.status === 429 || error.response.status === 503));

      if (isRetryable && attempt < MAX_RETRIES) {
        console.warn(`[Manus] ${operationName} failed. Retrying in ${RETRY_DELAY_MS / 1000}s...`);
        await delay(RETRY_DELAY_MS);
        attempt++;
      } else {
        throw error;
      }
    }
  }

  throw lastError;
};

/**
 * Reformats error messages for production safety
 */
const handleAIError = (error, context) => {
  console.error(`[Manus Error] ${context}:`, error.message);

  if (process.env.NODE_ENV !== 'production') {
    return error;
  }

  if (error.code === 'ECONNREFUSED') {
    return new Error('AI agent service not available. Please ensure manus_agents is running.');
  }
  if (error.message.includes('timeout')) {
    return new Error('AI processing timed out. Please try again.');
  }
  if (error.response?.status === 429) {
    return new Error('AI service busy. Please try again later.');
  }

  return new Error('AI processing failed. Please contact support.');
};

// ===== PUBLIC API FUNCTIONS =====

/**
 * Generates complete Marathi news article from raw input
 * Corresponds to POST /ai/generate-article on manus_agents
 */
const generateMarathiNews = async (rawInput) => {
  const context = 'generateMarathiNews';
  try {
    const cleanInput = sanitizeInput(rawInput);

    const result = await withRetry(context, async () => {
      const response = await axios.post(
        `${MANUS_API_BASE}/ai/generate-article`,
        { text: cleanInput },
        { timeout: TIMEOUT_MS }
      );
      return response.data;
    });

    // Ensure result has the expected structure
    return {
      title: result.title || 'Untitled',
      subtitle: result.subtitle || '',
      focus_keyphrase: result.focus_keyphrase || '',
      content_html: result.content_html || result.content || '',
      summary: result.summary || '',
      seo: {
        meta_title: result.meta_title || result.seo?.meta_title || '',
        meta_description: result.meta_description || result.seo?.meta_description || '',
        slug: result.slug || result.seo?.slug || '',
        focus_keywords: result.focus_keywords || result.seo?.focus_keywords || []
      },
      quote_block: result.quote_block || '',
      source_name: result.source_name || '',
      source_url: result.source_url || '',
      via_name: result.via_name || '',
      via_url: result.via_url || '',
      custom_labels: result.custom_labels || [],
      images: result.images || [],
      tags: result.tags || []
    };

  } catch (error) {
    throw handleAIError(error, context);
  }
};

/**
 * Rewrites article content for better quality
 * Corresponds to POST /ai/rewrite on manus_agents
 */
const rewriteArticle = async (content) => {
  const context = 'rewriteArticle';
  try {
    const cleanInput = sanitizeInput(content);

    const result = await withRetry(context, async () => {
      const response = await axios.post(
        `${MANUS_API_BASE}/ai/rewrite`,
        { text: cleanInput },
        { timeout: TIMEOUT_MS }
      );
      return response.data;
    });

    return result.rewritten || result.text || result;

  } catch (error) {
    throw handleAIError(error, context);
  }
};

/**
 * Generates summary from article content
 * Corresponds to POST /ai/summary on manus_agents
 */
const generateSummary = async (content) => {
  const context = 'generateSummary';
  try {
    const cleanInput = sanitizeInput(content);

    const result = await withRetry(context, async () => {
      const response = await axios.post(
        `${MANUS_API_BASE}/ai/summary`,
        { text: cleanInput },
        { timeout: TIMEOUT_MS }
      );
      return response.data;
    });

    return result.summary || result.text || result;

  } catch (error) {
    throw handleAIError(error, context);
  }
};

/**
 * Improves SEO metadata for article
 * Corresponds to POST /ai/seo on manus_agents
 */
const improveSEOMetadata = async (article) => {
  const context = 'improveSEOMetadata';
  try {
    // Prepare article text for SEO analysis
    const articleText = `
Title: ${article.title || ''}
Summary: ${article.summary || ''}
Content: ${(article.content || article.content_html || '').substring(0, 2000)}
`;
    const cleanInput = sanitizeInput(articleText);

    const result = await withRetry(context, async () => {
      const response = await axios.post(
        `${MANUS_API_BASE}/ai/seo`,
        { text: cleanInput },
        { timeout: TIMEOUT_MS }
      );
      return response.data;
    });

    return {
      meta_title: result.meta_title || result.seo?.meta_title || '',
      meta_description: result.meta_description || result.seo?.meta_description || '',
      slug: result.slug || result.seo?.slug || '',
      focus_keywords: result.focus_keywords || result.keywords || result.seo?.focus_keywords || []
    };

  } catch (error) {
    throw handleAIError(error, context);
  }
};

/**
 * Generates image prompts and metadata
 * Note: Image generation is handled by manus_agents directly during article creation
 * This function prepares data for manual image generation if needed
 */
const generateImageMetaData = async (imagePath, articleContext) => {
  const context = 'generateImageMetaData';
  try {
    const cleanInput = sanitizeInput(articleContext);

    // For now, return a basic structure
    // In production, could call manus_agents image generation endpoint if available
    return {
      alt_text: `News article image - ${cleanInput.substring(0, 50)}`,
      caption: 'Image caption in Marathi',
      description: 'Image description',
      file_name: `image_${Date.now()}.webp`
    };

  } catch (error) {
    throw handleAIError(error, context);
  }
};

/**
 * Health check - verifies manus_agents is running
 */
const healthCheck = async () => {
  try {
    const response = await axios.get(
      `${MANUS_API_BASE}/health`,
      { timeout: 5000 }
    );
    return response.status === 200;
  } catch (error) {
    console.warn('[Manus] Health check failed:', error.message);
    return false;
  }
};

module.exports = {
  generateMarathiNews,
  rewriteArticle,
  generateSummary,
  improveSEOMetadata,
  generateImageMetaData,
  healthCheck,
  // Expose config for debugging
  MANUS_API_BASE
};
