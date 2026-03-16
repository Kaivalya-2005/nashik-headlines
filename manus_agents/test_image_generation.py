#!/usr/bin/env python3
"""
test_image_generation.py
Test image generation with Stability AI v2beta API
"""

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

import requests
from config.settings import STABILITY_API_KEY, UNSPLASH_ACCESS_KEY

print("\n" + "="*70)
print("IMAGE GENERATION TEST")
print("="*70)

# Test 1: Stability API v2beta
print("\n1. Testing Stability AI API v2beta...")
print("   Endpoint: https://api.stability.ai/v2beta/stable-image/generate/core")

if not STABILITY_API_KEY or STABILITY_API_KEY == "your-api-key-here":
    print("   ✗ API key not configured")
else:
    try:
        url = "https://api.stability.ai/v2beta/stable-image/generate/core"
        headers = {
            "Authorization": f"Bearer {STABILITY_API_KEY}"
        }
        files = {
            "prompt": (None, "a beautiful news photo of a nashik city street"),
            "aspect_ratio": (None, "16:9"),
            "output_format": (None, "webp")
        }
        
        print("   Sending request...")
        resp = requests.post(url, headers=headers, files=files, timeout=60)
        
        if resp.status_code == 200:
            print("   ✓ SUCCESS! Image generated")
            print(f"   Response size: {len(resp.content)} bytes")
        else:
            print(f"   ✗ Error {resp.status_code}: {resp.text[:200]}")
    except Exception as e:
        print(f"   ✗ Error: {e}")

# Test 2: Unsplash
print("\n2. Testing Unsplash API...")

headers = {}
if UNSPLASH_ACCESS_KEY:
    headers["Authorization"] = f"Client-ID {UNSPLASH_ACCESS_KEY}"
    print("   Using authenticated request (API key configured)")
else:
    print("   Using public request (limited to 50 requests/hour)")

try:
    url = "https://api.unsplash.com/search/photos?query=nashik&per_page=1"
    resp = requests.get(url, headers=headers, timeout=10)
    
    if resp.status_code == 200:
        data = resp.json()
        if data.get("results"):
            print("   ✓ SUCCESS! Image found on Unsplash")
            print(f"   Photo: {data['results'][0]['alt_description']}")
        else:
            print("   ~ No results found for 'nashik'")
    elif resp.status_code == 401:
        print("   ⚠ API rate limited or invalid key")
        print("   Unsplash works as fallback, but limited to 50 requests/hour without key")
    else:
        print(f"   ✗ Error {resp.status_code}")
except Exception as e:
    print(f"   ✗ Error: {e}")

print("\n" + "="*70)
print("CONFIGURATION STATUS")
print("="*70)
print(f"Stability API Key: {'✓ Set' if STABILITY_API_KEY else '✗ Not set'}")
print(f"Unsplash API Key:  {'✓ Set' if UNSPLASH_ACCESS_KEY else '✗ Not set (optional, 50/hour limit)'}")
print("\nImage generation priority:")
print("  1. Stability AI v2beta (primary)")
print("  2. Unsplash (fallback)")
print("  3. Placeholder (final fallback)")
print("="*70 + "\n")
