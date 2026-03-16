"""
tools/generate_images.py
Tool: generate_images(article: dict) -> dict
Generates 3 AI-generated images using Stable Diffusion XL.
Supports local generation or cloud API.
Falls back to Unsplash and placeholders.

Config (in config/settings.py):
  - USE_LOCAL_SDXL = True/False (local via diffusers, or cloud API)
  - STABILITY_API_KEY = your API key (if using cloud)
"""

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import requests
import io
from urllib.parse import quote_plus
from PIL import Image
from config.settings import UPLOADS_DIR
from memory.store import log_error
from tools.retry_helper import retry_with_fallback

import time
import logging

log = logging.getLogger("manus-agents")

# Check if we can use local Stable Diffusion XL
try:
    import torch
    from diffusers import StableDiffusionXLPipeline
    _LOCAL_SDXL_AVAILABLE = True
    log.info("Local Stable Diffusion XL available (diffusers library)")
except ImportError:
    _LOCAL_SDXL_AVAILABLE = False
    log.warning("diffusers/torch not installed. Will use cloud API or fallbacks.")


def _create_placeholder_image(save_path: str, width: int = 1200, height: int = 628) -> bool:
    """Create a simple placeholder image if all APIs fail."""
    try:
        img = Image.new('RGB', (width, height), color=(200, 200, 200))
        # Add a simple text
        from PIL import ImageDraw, ImageFont
        draw = ImageDraw.Draw(img)
        text = "Image Not Available"
        draw.text((width//2 - 80, height//2 - 10), text, fill=(100, 100, 100))
        img.save(save_path, "WEBP", quality=85)
        log.info(f"Created placeholder image: {save_path}")
        return True
    except Exception as exc:
        log.error(f"Failed to create placeholder: {exc}")
        return False


def _generate_local_sdxl(prompt: str, save_path: str) -> bool:
    """Generate image using local Stable Diffusion XL (diffusers library)."""
    if not _LOCAL_SDXL_AVAILABLE:
        return False
    
    try:
        log.info(f"Generating image with local SDXL: {prompt[:60]}")
        
        # Load pipeline on first use
        pipe = StableDiffusionXLPipeline.from_pretrained(
            "stabilityai/stable-diffusion-xl-base-1.0",
            torch_dtype=torch.float16,
            use_safetensors=True
        )
        pipe = pipe.to("cuda" if torch.cuda.is_available() else "cpu")
        
        # Generate image
        image = pipe(prompt=prompt, height=628, width=1200, num_inference_steps=30).images[0]
        
        # Save as WebP
        image.save(save_path, "WEBP", quality=85)
        log.info(f"Generated local SDXL image: {save_path}")
        return True
    
    except Exception as exc:
        log.warning(f"Local SDXL generation failed: {exc}")
        return False


def _generate_stability_api(prompt: str, save_path: str) -> bool:
    """Generate image using Stability AI API v2beta (cloud-based SDXL)."""
    try:
        from config.settings import STABILITY_API_KEY
        
        if not STABILITY_API_KEY or STABILITY_API_KEY == "your-api-key-here":
            log.warning("STABILITY_API_KEY not configured")
            return False
        
        log.info(f"Generating image with Stability API SDXL v2: {prompt[:60]}")
        
        # Use v2beta/stable-image endpoint (modern API)
        url = "https://api.stability.ai/v2beta/stable-image/generate/core"
        
        headers = {
            "Authorization": f"Bearer {STABILITY_API_KEY}"
        }
        
        # v2beta requires multipart/form-data
        files = {
            "prompt": (None, prompt),
            "aspect_ratio": (None, "16:9"),
            "output_format": (None, "webp")
        }
        
        resp = requests.post(url, headers=headers, files=files, timeout=60)
        resp.raise_for_status()
        
        # v2beta returns image bytes directly
        if resp.content:
            img = Image.open(io.BytesIO(resp.content))
            img.save(save_path, "WEBP", quality=85)
            log.info(f"Generated Stability API image: {save_path}")
            return True
        
        return False
    
    except Exception as exc:
        log.warning(f"Stability API generation failed: {exc}")
        return False


def _download_from_unsplash(keyword: str, save_path: str) -> bool:
    """Fallback: Download image from Unsplash if available."""
    try:
        from config.settings import UNSPLASH_ACCESS_KEY
        
        # Using Unsplash's public API
        url = f"https://api.unsplash.com/search/photos?query={quote_plus(keyword)}&per_page=1"
        
        headers = {}
        if UNSPLASH_ACCESS_KEY:
            headers["Authorization"] = f"Client-ID {UNSPLASH_ACCESS_KEY}"
        
        resp = requests.get(url, headers=headers, timeout=10)
        resp.raise_for_status()
        
        data = resp.json()
        if not data.get("results"):
            log.warning(f"No Unsplash results for: {keyword}")
            return False
        
        img_url = data["results"][0]["urls"]["regular"]
        img_resp = requests.get(img_url, timeout=20)
        img_resp.raise_for_status()
        
        img = Image.open(io.BytesIO(img_resp.content))
        img = img.resize((1200, 628))  # Resize to match our aspect ratio
        img.save(save_path, "WEBP", quality=85)
        log.info(f"Downloaded from Unsplash: {save_path}")
        return True
    except Exception as exc:
        log.warning(f"Unsplash fallback failed: {exc}")
        return False


def _download_image(prompt: str, save_path: str, retries: int = 3) -> bool:
    """
    Generate an image with multiple strategies:
    1. Try local Stable Diffusion XL (if available)
    2. Try Stability AI Cloud API (if configured)
    3. Try Unsplash as fallback
    4. Create placeholder as last resort
    """
    
    # Strategy 1: Local SDXL (fastest if available)
    if _LOCAL_SDXL_AVAILABLE:
        log.info("Attempting local Stable Diffusion XL generation...")
        if _generate_local_sdxl(prompt, save_path):
            return True
        else:
            log.warning("Local SDXL failed, trying next strategy...")
    
    # Strategy 2: Stability API (cloud, high quality)
    log.info("Attempting Stability AI Cloud API...")
    if _generate_stability_api(prompt, save_path):
        return True
    else:
        log.warning("Stability API failed, trying next strategy...")
    
    # Strategy 3: Try Unsplash as fallback
    log.info("Trying Unsplash fallback...")
    keyword = prompt.split()[0]  # Use first word as search term
    if _download_from_unsplash(keyword, save_path):
        return True
    
    # Strategy 4: Last resort - create placeholder
    log.warning("All image sources failed, creating placeholder...")
    if _create_placeholder_image(save_path):
        return True
    
    log.error(f"Failed to obtain image for prompt: {prompt}")
    return False


def generate_images(article: dict) -> dict:
    """
    Takes article with 'image_prompts' (list of 3 dicts with {prompt, alt_text, caption}).
    Downloads 3 images, saves to uploads/articles/{slug}/.
    Adds image1, image2, image3 paths to article dict.
    
    Fallback strategy:
    1. Try AI generation via pollinations.ai
    2. Try stock images via Unsplash
    3. Create placeholder images
    """
    prompts = article.get("image_prompts", [])
    slug = article.get("slug", "unknown")

    if not prompts or len(prompts) < 3:
        log.warning("Not enough prompts — skipping image generation.")
        return {**article, "image1": "", "image2": "", "image3": ""}

    # Create directory
    article_dir = os.path.join(UPLOADS_DIR, slug)
    os.makedirs(article_dir, exist_ok=True)
    log.info(f"Image directory: {article_dir}")

    image_paths = []
    for i, p in enumerate(prompts[:3], 1):
        prompt_text = p.get("prompt", f"news photograph {i}")
        filename = f"img{i}.webp"
        save_path = os.path.join(article_dir, filename)
        relative_path = f"uploads/articles/{slug}/{filename}"

        log.info(f"Downloading image {i}/3: {prompt_text[:60]}")
        success = _download_image(prompt_text, save_path)
        image_paths.append(relative_path if success else "")

    # Pad to 3
    while len(image_paths) < 3:
        image_paths.append("")

    successful = sum(1 for p in image_paths if p)
    log.info(f"Image generation complete: {successful}/3 successful.")
    print(f"[generate_images] ✓ {successful} of 3 images saved.")
    
    return {
        **article,
        "image1": image_paths[0],
        "image2": image_paths[1],
        "image3": image_paths[2],
    }
