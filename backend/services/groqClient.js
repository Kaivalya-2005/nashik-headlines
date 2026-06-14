/**
 * Central Groq API client — model selection + rate-limit fallbacks.
 *
 * Root-cause fix: previously MODEL_FULL and MODEL_FAST both resolved to the
 * same model ("llama-3.1-8b-instant"), so uniqueModels() collapsed the chain
 * to a single entry — meaning hitting the TPM limit caused an immediate crash.
 *
 * Fix:
 *  1. A diverse fallback chain of models with separate TPM buckets.
 *  2. On rate-limit, read Groq's "retry-after" header (or parse the message)
 *     and wait that exact duration before trying the next model.
 *  3. If all models are exhausted, surface a user-friendly error with wait time.
 */

const axios = require("axios");

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_API_KEY = process.env.GROQ_API_KEY;

/** Fast model — default for wand, SEO JSON, and full articles (best TPD limits). */
const MODEL_FAST = process.env.GROQ_MODEL || "llama-3.1-8b-instant";

/**
 * "Full" article model
 */
const MODEL_FULL = process.env.GROQ_MODEL_FULL || "llama-3.3-70b-versatile";

function uniqueModels(...candidates) {
  return [...new Set(candidates.filter(Boolean))];
}

function isRateLimitError(err) {
  const e = err?.response?.data?.error;
  return (
    e?.code === "rate_limit_exceeded" ||
    e?.type === "tokens" ||
    /rate limit/i.test(String(e?.message || ""))
  );
}

/**
 * Extract the number of seconds to wait from a Groq rate-limit error.
 * Groq sends a `retry-after` header AND embeds the wait time in the error
 * message ("Please try again in 28.11s").
 */
function getRetryAfterSeconds(err) {
  // 1. HTTP Retry-After header (most reliable)
  const retryAfterHeader = err?.response?.headers?.["retry-after"];
  if (retryAfterHeader) {
    const secs = parseFloat(retryAfterHeader);
    if (!isNaN(secs)) return secs;
  }

  // 2. Parse from error message: "Please try again in 28.11s"
  const msg = err?.response?.data?.error?.message || "";
  const match = msg.match(/try again in ([\d.]+)s/i);
  if (match) return parseFloat(match[1]);

  // 3. Conservative default
  return 30;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * The global fallback chain — each model has its own TPM bucket so switching
 * models avoids the rate limit entirely, rather than waiting on the same model.
 *
 * Free-tier TPM limits (approximate, as of 2025):
 *   llama-3.1-8b-instant  — 6 000 TPM
 *   gemma2-9b-it          — 15 000 TPM (different bucket)
 *   llama3-8b-8192        — 6 000 TPM  (older alias, separate counter)
 *   llama-3.3-70b         — 6 000 TPM  (only if GROQ_MODEL_FULL is set)
 */
const GLOBAL_FALLBACK_CHAIN = uniqueModels(
  MODEL_FULL,
  MODEL_FAST,
  "qwen/qwen3-32b",
  "openai/gpt-oss-20b",
  "llama-3.1-8b-instant"
);

/**
 * Core completion function with rate-limit-aware fallback + wait.
 *
 * @param {object} opts
 * @param {string} opts.prompt
 * @param {number} [opts.maxTokens]
 * @param {boolean} [opts.jsonFormat]
 * @param {string[]} [opts.models] - try in order; falls back to GLOBAL_FALLBACK_CHAIN
 */
/**
 * Models that support the json_object response_format.
 * gemma2-9b-it does NOT support it — sending it causes a 400 that breaks the chain.
 */
const JSON_FORMAT_SUPPORTED_MODELS = new Set([
  "llama-3.1-8b-instant",
  "llama-3.3-70b-versatile",
  "qwen/qwen3-32b",
  "openai/gpt-oss-20b"
]);

async function chatCompletion({ prompt, maxTokens = 2048, jsonFormat = false, models }) {
  if (!GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not set in backend .env");
  }

  const chain = models?.length ? uniqueModels(...models) : GLOBAL_FALLBACK_CHAIN;

  let lastMessage = "Groq request failed";

  for (let i = 0; i < chain.length; i++) {
    const model = chain[i];
    try {
      const payload = {
        model,
        max_tokens: maxTokens,
        messages: [{ role: "user", content: prompt }],
      };
      // Only set json_object format on models that actually support it
      if (jsonFormat && JSON_FORMAT_SUPPORTED_MODELS.has(model)) {
        payload.response_format = { type: "json_object" };
      }

      const { data } = await axios.post(GROQ_URL, payload, {
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 90000,
      });

      const text = data?.choices?.[0]?.message?.content;
      if (!text) throw new Error("Empty response from Groq");

      if (i > 0) {
        console.log(`[Groq] ✅ Fallback model succeeded: ${model}`);
      }
      return text;

    } catch (err) {
      const errData = err?.response?.data?.error;
      lastMessage = errData?.message || err.message;

      if (isRateLimitError(err)) {
        const waitSecs = getRetryAfterSeconds(err);
        const hasNextModel = i < chain.length - 1;

        if (hasNextModel) {
          console.warn(
            `[Groq] ⚠️  Rate limit on "${model}" — waiting ${waitSecs.toFixed(1)}s then trying "${chain[i + 1]}"...`
          );
          await sleep(waitSecs * 1000);
          continue;
        } else {
          console.error(
            `[Groq] ❌ All ${chain.length} models rate-limited. Retry in ~${Math.ceil(waitSecs)}s.`
          );
          throw new Error(
            `All Groq models are rate-limited. Please try again in ~${Math.ceil(waitSecs)} seconds.`
          );
        }
      }

      // Non-rate-limit error — log and try next model if available
      console.error(`[Groq] Error on "${model}":`, errData?.message || err.message);
      if (i < chain.length - 1) {
        console.warn(`[Groq] Trying next model "${chain[i + 1]}"...`);
        continue;
      }
      break;
    }
  }

  throw new Error(lastMessage);
}

// ─── Public helpers ────────────────────────────────────────────────────────────

/** Short field / wand tool */
async function askGroq(prompt, jsonFormat = false) {
  return chatCompletion({
    prompt,
    maxTokens: 1024,
    jsonFormat,
    models: uniqueModels(MODEL_FAST, "qwen/qwen3-32b", "llama-3.1-8b-instant"),
  });
}

/** Long-form article HTML (text mode) */
async function askGroqFull(prompt, maxTokens = 2800) {
  return chatCompletion({
    prompt,
    maxTokens,
    jsonFormat: false,
    models: uniqueModels(MODEL_FULL, "qwen/qwen3-32b", MODEL_FAST, "llama-3.1-8b-instant"),
  });
}

/** SEO metadata JSON — smaller, cheaper call */
async function askGroqSeoJson(prompt) {
  return chatCompletion({
    prompt,
    maxTokens: 900,
    jsonFormat: true,
    models: uniqueModels(MODEL_FAST, "qwen/qwen3-32b", MODEL_FULL, "llama-3.1-8b-instant"),
  });
}

module.exports = {
  MODEL_FAST,
  MODEL_FULL,
  chatCompletion,
  askGroq,
  askGroqFull,
  askGroqSeoJson,
};
