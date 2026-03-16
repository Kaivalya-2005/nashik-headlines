#!/usr/bin/env python3
"""
setup_sdxl.py
-----------
Setup helper for Stable Diffusion XL integration.
Helps users choose and configure image generation backend.

Usage:
  python setup_sdxl.py              → Interactive setup
  python setup_sdxl.py --test       → Test current configuration
  python setup_sdxl.py --local      → Force local SDXL setup
  python setup_sdxl.py --cloud      → Setup Stability API
"""

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

import argparse
import subprocess

# Color codes
BLUE = "\033[94m"
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
BOLD = "\033[1m"
RESET = "\033[0m"


def banner(msg):
    print(f"\n{BOLD}{BLUE}▶ {msg}{RESET}")


def success(msg):
    print(f"{GREEN}✓ {msg}{RESET}")


def error(msg):
    print(f"{RED}✗ {msg}{RESET}")


def warning(msg):
    print(f"{YELLOW}⚠ {msg}{RESET}")


def info(msg):
    print(f"{BLUE}ℹ {msg}{RESET}")


def check_gpu():
    """Check if GPU is available."""
    try:
        import torch
        cuda_available = torch.cuda.is_available()
        if cuda_available:
            device_name = torch.cuda.get_device_name(0)
            device_mem = torch.cuda.get_device_properties(0).total_memory / 1e9
            success(f"GPU detected: {device_name} ({device_mem:.1f}GB)")
            return True, device_mem
        else:
            warning("No GPU detected. Local SDXL will be slow.")
            return False, 0
    except ImportError:
        return False, 0


def setup_local_sdxl():
    """Setup local Stable Diffusion XL."""
    banner("Setting up Local Stable Diffusion XL")
    
    # Check GPU
    print("\nChecking GPU availability...")
    has_gpu, vram = check_gpu()
    
    if not has_gpu:
        warning("Local SDXL requires a GPU with 8GB+ VRAM")
        print("   GPU recommend: NVIDIA RTX 3060+ or better")
        response = input("\nContinue anyway? (y/n): ").lower()
        if response != 'y':
            return False
    elif vram < 8:
        error(f"GPU has only {vram:.1f}GB VRAM, need 8GB+")
        return False
    
    # Install dependencies
    print("\nInstalling required packages...")
    packages = [
        "torch==2.0.1",
        "torchvision==0.15.2",
        "diffusers==0.21.4",
        "transformers==4.30.2",
        "safetensors==0.3.1",
        "accelerate==0.20.3",
        "xformers",  # Optional but recommended
    ]
    
    for pkg in packages:
        try:
            print(f"  Installing {pkg}...")
            subprocess.check_call(
                [sys.executable, "-m", "pip", "install", "-q", pkg],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL
            )
            success(f"Installed {pkg}")
        except Exception as e:
            warning(f"Failed to install {pkg}: {e}")
    
    # Update config
    print("\nUpdating config/settings.py...")
    config_file = "config/settings.py"
    with open(config_file, 'r') as f:
        content = f.read()
    
    # Update USE_LOCAL_SDXL
    if "USE_LOCAL_SDXL" in content:
        content = content.replace("USE_LOCAL_SDXL = False", "USE_LOCAL_SDXL = True")
        content = content.replace("USE_LOCAL_SDXL = True", "USE_LOCAL_SDXL = True")
    
    with open(config_file, 'w') as f:
        f.write(content)
    
    success("Config updated: USE_LOCAL_SDXL = True")
    
    # Test
    print("\nTesting local SDXL (downloading model, ~7GB)...")
    try:
        from diffusers import StableDiffusionXLPipeline
        info("Downloading Stable Diffusion XL model (~7GB)...")
        info("This may take 10-30 minutes on first run...")
        
        pipe = StableDiffusionXLPipeline.from_pretrained(
            "stabilityai/stable-diffusion-xl-base-1.0",
            torch_dtype=__import__('torch').float16 if has_gpu else __import__('torch').float32,
            use_safetensors=True
        )
        success("✓ Local SDXL model loaded successfully!")
        return True
    except Exception as e:
        error(f"Failed to load model: {e}")
        return False


def setup_stability_api():
    """Setup Stability AI Cloud API."""
    banner("Setting up Stability AI Cloud API")
    
    print("\nSteps:")
    print("  1. Go to: https://stability.ai")
    print("  2. Sign up for free account")
    print("  3. Get your API key from settings")
    print("  4. Paste it below")
    
    api_key = input("\nEnter your Stability API key (or press Enter to skip): ").strip()
    
    if not api_key:
        warning("Skipped. You can add the key later.")
        return False
    
    # Update config
    config_file = "config/settings.py"
    with open(config_file, 'r') as f:
        content = f.read()
    
    # Store in environment
    env_file = ".env"
    with open(env_file, 'a') as f:
        f.write(f"\nSTABILITY_API_KEY={api_key}\n")
    
    # Update config to use API key from env
    if "STABILITY_API_KEY = " in content:
        content = content.replace(
            'STABILITY_API_KEY = os.getenv("STABILITY_API_KEY", "your-api-key-here")',
            'STABILITY_API_KEY = os.getenv("STABILITY_API_KEY", "your-api-key-here")'
        )
    
    with open(config_file, 'w') as f:
        f.write(content)
    
    success("API key saved!")
    success("Config updated")
    
    # Test
    print("\nTesting Stability API...")
    try:
        import requests
        resp = requests.get(
            "https://api.stability.ai/v1/engines/list",
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=10
        )
        if resp.status_code == 200:
            success("✓ Stability API connection verified!")
            return True
        elif resp.status_code == 401:
            error("Invalid API key")
            return False
        else:
            warning(f"API returned: {resp.status_code}")
            return True
    except Exception as e:
        error(f"Failed to test API: {e}")
        return False


def test_configuration():
    """Test current image generation configuration."""
    banner("Testing Image Generation Configuration")
    
    from config.settings import USE_LOCAL_SDXL, STABILITY_API_KEY
    import requests
    
    print("\n1. Checking configuration...")
    print(f"   USE_LOCAL_SDXL: {USE_LOCAL_SDXL}")
    print(f"   STABILITY_API_KEY: {'***' if STABILITY_API_KEY != 'your-api-key-here' else 'not set'}")
    
    # Test local SDXL
    if USE_LOCAL_SDXL:
        print("\n2. Testing local Stable Diffusion XL...")
        try:
            import torch
            from diffusers import StableDiffusionXLPipeline
            
            has_gpu = torch.cuda.is_available()
            device = "cuda" if has_gpu else "cpu"
            print(f"   Device: {device}")
            
            print("   Loading model (first time is slow)...")
            pipe = StableDiffusionXLPipeline.from_pretrained(
                "stabilityai/stable-diffusion-xl-base-1.0",
                torch_dtype=torch.float16 if has_gpu else torch.float32,
                use_safetensors=True
            )
            success("✓ Local SDXL ready!")
        except ImportError:
            error("torch/diffusers not installed. Run: pip install torch diffusers")
        except Exception as e:
            error(f"Local SDXL error: {e}")
    
    # Test Stability API
    if STABILITY_API_KEY and STABILITY_API_KEY != "your-api-key-here":
        print("\n3. Testing Stability API...")
        try:
            resp = requests.get(
                "https://api.stability.ai/v1/engines/list",
                headers={"Authorization": f"Bearer {STABILITY_API_KEY}"},
                timeout=10
            )
            if resp.status_code == 200:
                success("✓ Stability API connected!")
            elif resp.status_code == 401:
                error("Invalid API key")
            else:
                warning(f"API status: {resp.status_code}")
        except Exception as e:
            error(f"API connection error: {e}")
    
    # Test Unsplash (always available)
    print("\n4. Testing Unsplash fallback...")
    try:
        resp = requests.get(
            "https://api.unsplash.com/search/photos?query=test&per_page=1",
            timeout=10
        )
        if resp.ok:
            success("✓ Unsplash fallback available!")
        else:
            warning("Unsplash may be rate limited")
    except Exception as e:
        warning(f"Unsplash test failed: {e}")
    
    print("\n" + BLUE + "━" * 50 + RESET)
    print(BOLD + "Summary:" + RESET)
    print("  Your image generation pipeline has fallbacks:")
    print("  1. Local SDXL (if enabled & available)")
    print("  2. Stability API (if key configured)")
    print("  3. Unsplash (always available)")
    print("  4. Placeholder (final fallback)")
    print(BLUE + "━" * 50 + RESET + "\n")


def interactive_setup():
    """Interactive setup wizard."""
    banner("Stable Diffusion XL Setup Wizard")
    
    print("\nChoose your image generation backend:\n")
    print("  1) Local Stable Diffusion XL (GPU required)")
    print("     ✓ Fastest, best quality")
    print("     ✓ Runs on your machine")
    print("     ✗ Needs GPU with 8GB+ VRAM")
    print("     ✗ First run: ~7GB download + setup\n")
    
    print("  2) Stability AI Cloud API")
    print("     ✓ No GPU needed")
    print("     ✓ High quality results")
    print("     ✗ Cloud-based (privacy)")
    print("     ✗ API quota limits\n")
    
    print("  3) Test current configuration\n")
    
    choice = input("Enter your choice (1-3): ").strip()
    
    if choice == "1":
        success = setup_local_sdxl()
        if success:
            success("Local SDXL setup complete!")
            print("\nYou can now run:")
            print("  python run_agents.py --once")
        else:
            error("Setup failed")
    
    elif choice == "2":
        success = setup_stability_api()
        if success:
            success("Stability API setup complete!")
            print("\nYou can now run:")
            print("  python run_agents.py --once")
        else:
            error("Setup failed")
    
    elif choice == "3":
        test_configuration()
    
    else:
        error("Invalid choice")


def main():
    parser = argparse.ArgumentParser(
        description="Setup Stable Diffusion XL for image generation"
    )
    parser.add_argument("--test", action="store_true", help="Test current configuration")
    parser.add_argument("--local", action="store_true", help="Setup local SDXL")
    parser.add_argument("--cloud", action="store_true", help="Setup Stability API")
    
    args = parser.parse_args()
    
    if args.test:
        test_configuration()
    elif args.local:
        setup_local_sdxl()
    elif args.cloud:
        setup_stability_api()
    else:
        interactive_setup()


if __name__ == "__main__":
    main()
