"""
tools/generate_images.py
IMAGE GENERATION DISABLED - All functionality commented out

Original comment:
Tool: generate_images(article: dict) -> dict
Generates 3 AI-generated images using Stable Diffusion XL.
Supports local generation or cloud API.
Falls back to Unsplash and placeholders.

Config (in config/settings.py):
  - USE_LOCAL_SDXL = True/False (local via diffusers, or cloud API)
  - STABILITY_API_KEY = your API key (if using cloud)
"""
# IMAGE GENERATION HAS BEEN DISABLED
# All functions are now stub implementations

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))


def generate_images(article: dict) -> dict:
    """
    DISABLED: Image generation functionality has been disabled.
    This function now returns an empty article without generating images.
    
    Original documentation:
    Takes article with 'image_prompts' (list of 3 dicts with {prompt, alt_text, caption}).
    Downloads 3 images, saves to uploads/articles/{slug}/.
    Adds image1, image2, image3 paths to article dict.
    """
    # Return article without images
    return {
        **article,
        "image1": "",
        "image2": "",
        "image3": "",
    }

# All helper functions below disabled:
# - _create_placeholder_image()
# - _generate_local_sdxl()
# - _generate_stability_api()
# - _download_from_unsplash()
# - _download_image()

# ORIGINAL IMPLEMENTATION COMMENTED OUT
# See git history or IMPLEMENTATION_GUIDE.md for full image generation code

