#!/usr/bin/env python3
"""
test_stability_api.py
Quick test to verify Stability AI API key works
"""

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

import requests
from config.settings import STABILITY_API_KEY

def test_api():
    """Test Stability AI API connection and credits."""
    
    print("\n" + "="*60)
    print("STABILITY AI API TEST")
    print("="*60)
    
    # Test 1: Check if key is configured
    print("\n1. Checking API key configuration...")
    if not STABILITY_API_KEY or STABILITY_API_KEY == "your-api-key-here":
        print("   ✗ API key not configured")
        return False
    print("   ✓ API key found")
    
    # Test 2: Check API connection
    print("\n2. Testing API connection...")
    try:
        resp = requests.get(
            "https://api.stability.ai/v1/engines/list",
            headers={"Authorization": f"Bearer {STABILITY_API_KEY}"},
            timeout=10
        )
        
        if resp.status_code == 200:
            print(f"   ✓ Connected!")
            engines = resp.json()
            print(f"   ✓ Available engines: {len(engines)}")
            return True
        elif resp.status_code == 401:
            print("   ✗ API key is invalid or expired")
            print(f"   Response: {resp.text}")
            return False
        elif resp.status_code == 402:
            print("   ✗ No credits left")
            print("   Visit: https://stability.ai/account/billing/overview")
            return False
        else:
            print(f"   ✗ API error: {resp.status_code}")
            print(f"   Response: {resp.text}")
            return False
    except Exception as e:
        print(f"   ✗ Connection error: {e}")
        return False

def test_image_generation():
    """Test actual image generation."""
    
    print("\n3. Testing image generation...")
    
    try:
        url = "https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image"
        
        headers = {
            "Authorization": f"Bearer {STABILITY_API_KEY}",
            "Content-Type": "application/json"
        }
        
        data = {
            "text_prompts": [{"text": "a beautiful news photo of nashik city", "weight": 1}],
            "height": 628,
            "width": 1200,
            "steps": 20,
            "cfg_scale": 7.0,
            "samples": 1,
        }
        
        print("   Requesting image generation...")
        resp = requests.post(url, headers=headers, json=data, timeout=60)
        
        if resp.status_code == 200:
            result = resp.json()
            if result.get("artifacts"):
                print(f"   ✓ Image generated successfully!")
                print(f"   Generation time: ~20-30 seconds")
                return True
            else:
                print("   ✗ No image in response")
                return False
        elif resp.status_code == 402:
            print("   ⚠ No credits left for image generation")
            return False
        else:
            print(f"   ✗ Generation failed: {resp.status_code}")
            print(f"   Response: {resp.text}")
            return False
    
    except Exception as e:
        print(f"   ✗ Generation error: {e}")
        return False

def main():
    print("\n")
    success = test_api()
    
    if success:
        print("\n✓ API Authentication: SUCCESSFUL")
        print("\n" + "="*60)
        print("YOUR SYSTEM IS READY!")
        print("="*60)
        print("\nYou can now run:")
        print("  python run_agents.py --once")
        print("  python run_agents.py --api --loop")
        print("  python test_api.py")
        print("\n" + "="*60 + "\n")
    else:
        print("\n✗ API Authentication: FAILED")
        print("\nTroubleshooting:")
        print("  1. Check your API key: https://stability.ai/account/keys")
        print("  2. Verify you have credits: https://stability.ai/account/billing/overview")
        print("  3. Update key in config/settings.py")
        print("\n" + "="*60 + "\n")
        sys.exit(1)

if __name__ == "__main__":
    main()
