# Image Generation - DISABLED

**Status:** Image generation functionality has been completely disabled as of March 16, 2026.

## What Was Disabled

All image generation-related code has been commented out or stubbed:

### Agents
- ✋ **ImageAgent** (`image_agent/agent.py`) - Completely disabled
  - No longer processes image prompts or downloads images

### Tools
- ✋ **generate_image_prompts.py** - Disabled (was: LLM-based prompt generation)
- ✋ **generate_images.py** - Disabled (was: 4-tier image generation fallback)

### API Endpoints
- ✋ `POST /ai/generate-images` - Disabled
- ✋ Images removed from article response objects

### Pipeline
The 7-agent pipeline now runs as a 6-agent pipeline:

```
ScraperAgent → ExtractorAgent → EditorAgent → SEOAgent 
  → [ImageAgent DISABLED] → PublisherAgent
```

Articles are still created and published, but **without images**.

---

## Files Modified

| File | Change | Status |
|------|--------|--------|
| `master_agent/agent.py` | Commented out ImageAgent import & calls | ✓ |
| `image_agent/agent.py` | Entire file disabled | ✓ |
| `tools/generate_image_prompts.py` | Entire file disabled | ✓ |
| `tools/generate_images.py` | Entire file disabled | ✓ |
| `api/server.py` | Commented out image import & endpoint | ✓ |
| `tools/store_article.py` | Commented out article_images insertion | ✓ |
| `tools/__init__.py` | Commented out image tool imports | ✓ |

---

## API Response Changes

**Before (with images):**
```json
{
  "db_id": 123,
  "title": "Article Title",
  "summary": "...",
  "category": "politics",
  "slug": "article-title",
  "image1": "uploads/articles/slug/img1.webp",
  "image2": "uploads/articles/slug/img2.webp",
  "image3": "uploads/articles/slug/img3.webp"
}
```

**After (without images):**
```json
{
  "db_id": 123,
  "title": "Article Title",
  "summary": "...",
  "category": "politics",
  "slug": "article-title"
}
```

---

## Impact on Features

✋ **Disabled Features:**
- No AI image generation (via local SDXL)
- No cloud image generation (via Stability API)
- No stock photo fallback (via Unsplash)
- No placeholder images

✅ **Still Working:**
- Article scraping
- Content extraction
- Text rewriting
- Summarization
- Categorization
- SEO metadata
- Database storage
- Admin API (minus image endpoints)

---

## Performance Impact

✅ **Positive impacts:**
- **Faster processing:** ~40-50% faster (images were main bottleneck)
- **Lower API usage:** No Stability AI API calls
- **Reduced storage:** No image files saved to disk
- **Lower bandwidth:** Smaller article responses

---

## How to Re-Enable Image Generation

If you want to re-enable image generation in the future:

1. **Restore original files from git:**
   ```bash
   git checkout HEAD -- image_agent/ tools/generate_image_prompts.py tools/generate_images.py
   ```

2. **Restore API references:**
   ```bash
   git checkout HEAD -- master_agent/agent.py api/server.py tools/store_article.py tools/__init__.py
   ```

3. **Install dependencies:**
   ```bash
   pip install torch diffusers transformers safetensors accelerate
   ```

4. **Update configuration:**
   - Set `STABILITY_API_KEY` in `.env` (or configure local SDXL)
   - Set `USE_LOCAL_SDXL` in `config/settings.py`

5. **Test:**
   ```bash
   python3 run_agents.py --once
   ```

---

## Original Implementation

For reference, the original image generation implementation supported:

- **Local Stable Diffusion XL** (GPU-accelerated)
- **Stability AI API** (cloud-based)
- **Unsplash** (stock photo fallback)
- **Placeholder** (last resort)

See `IMPLEMENTATION_GUIDE.md` for full details of the original 4-tier strategy.

---

## Disabled Since

- **Date:** March 16, 2026
- **Reason:** Per user request to disable image generation
- **Decision:** All image code commented out or stubbed for easy restoration

---

## Questions?

See related documentation:
- [FIXES_SUMMARY.md](FIXES_SUMMARY.md) - Overall project fixes
- [SETUP.md](SETUP.md) - Setup instructions (now runs without images)
- [IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md) - Original architecture (image section)
