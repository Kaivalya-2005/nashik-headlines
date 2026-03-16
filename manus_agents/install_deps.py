#!/usr/bin/env python3
"""
install_deps.py - Helper script to install all dependencies for manus_agents
Run this after cloning the project to get started quickly.
"""

import subprocess
import sys
import os

def run(cmd, description):
    """Run a shell command with nice output."""
    print(f"\n{'='*60}")
    print(f"  {description}")
    print(f"{'='*60}\n")
    result = subprocess.run(cmd, shell=True)
    return result.returncode == 0

def main():
    print("\n" + "="*60)
    print("  manus_agents Dependency Installer")
    print("="*60)
    
    # Check Python version
    if sys.version_info < (3, 10):
        print("❌ Error: Python 3.10+ required")
        sys.exit(1)
    
    print(f"✓ Python {sys.version_info.major}.{sys.version_info.minor} detected\n")
    
    # Step 1: Create venv if not exists
    venv_path = os.path.join(os.path.dirname(__file__), "venv")
    if not os.path.exists(venv_path):
        if not run("python3 -m venv venv", "Creating Python virtual environment..."):
            print("❌ Failed to create virtual environment")
            sys.exit(1)
    else:
        print("✓ Virtual environment already exists\n")
    
    # Step 2: Upgrade pip
    if not run(f"{venv_path}/bin/python -m pip install --upgrade pip setuptools wheel",
               "Upgrading pip, setuptools, and wheel..."):
        print("⚠ Failed to upgrade pip (continuing anyway)")
    
    # Step 3: Install core dependencies
    if not run(
        f"{venv_path}/bin/pip install -r requirements.txt",
        "Installing core dependencies from requirements.txt..."
    ):
        print("❌ Failed to install core dependencies")
        sys.exit(1)
    
    # Step 4: Offer to install optional dependencies
    print("\n" + "="*60)
    print("  Optional: Stable Diffusion XL (for local image generation)")
    print("="*60)
    print("""
This requires:
  - NVIDIA GPU (6GB+ VRAM)
  - CUDA toolkit installed
  - ~10GB free disk space
  
If you have compatible hardware, install with:
  {}/bin/pip install torch diffusers transformers safetensors accelerate
""".format(venv_path))
    
    # Final message
    print("\n" + "="*60)
    print("  ✓ Installation Complete!")
    print("="*60)
    print(f"""
To activate the environment, run:
  source venv/bin/activate  (Linux/macOS)
  or
  .\\venv\\Scripts\\activate  (Windows)

Next steps:
  1. Configure .env file with your API keys
  2. Ensure MySQL is running
  3. Start Ollama: ollama serve
  4. Initialize database: python tools/init_db.py
  5. Check health: python monitor.py
  6. Run system: python run_agents.py --once

For more help, see SETUP.md in the project root.
""")

if __name__ == "__main__":
    main()
