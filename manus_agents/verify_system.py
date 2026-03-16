#!/usr/bin/env python3
"""
verify_system.py - Comprehensive system verification for manus_agents
Checks all dependencies, configurations, and connections.
"""

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

import subprocess
import importlib

def print_header(text):
    print(f"\n{'='*60}")
    print(f"  {text}")
    print(f"{'='*60}\n")

def check_python_packages():
    """Verify all required Python packages are installed."""
    print_header("Checking Python Packages")
    
    required = [
        'fastapi', 'uvicorn', 'requests', 'beautifulsoup4', 'lxml',
        'feedparser', 'dotenv', 'aiofiles', 'pydantic', 'mysql',
        'PIL', 'newspaper'
    ]
    
    missing = []
    for package in required:
        try:
            # Map package names to import names
            import_name = {
                'dotenv': 'dotenv',
                'mysql': 'mysql.connector',
                'PIL': 'PIL',
            }.get(package, package)
            
            importlib.import_module(import_name)
            print(f"  ✓ {package}")
        except ImportError:
            print(f"  ✗ {package} — MISSING")
            missing.append(package)
    
    if missing:
        print(f"\n⚠ Missing packages: {', '.join(missing)}")
        print("\nRun this to install:")
        print("  python3 -m pip install -r requirements.txt")
        return False
    return True

def check_database():
    """Test MySQL database connection."""
    print_header("Checking Database Connection")
    
    try:
        import mysql.connector
        from config.settings import MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DB, MYSQL_PORT
        
        conn = mysql.connector.connect(
            host=MYSQL_HOST,
            user=MYSQL_USER,
            password=MYSQL_PASSWORD,
            database=MYSQL_DB,
            port=MYSQL_PORT
        )
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM processed_articles")
        count = cur.fetchone()[0]
        cur.close()
        conn.close()
        
        print(f"  ✓ Connected to {MYSQL_DB} at {MYSQL_HOST}:{MYSQL_PORT}")
        print(f"  ✓ Found {count} processed articles")
        return True
    except Exception as e:
        print(f"  ✗ Database error: {e}")
        print("\nTroubleshooting:")
        print("  • Check .env file for correct credentials")
        print("  • Ensure MySQL is running")
        print("  • Run: python tools/init_db.py")
        return False

def check_ollama():
    """Test Ollama LLM connection."""
    print_header("Checking Ollama LLM")
    
    try:
        import requests
        from config.settings import OLLAMA_BASE_URL, OLLAMA_MODEL
        
        resp = requests.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=5)
        if resp.ok:
            models = resp.json().get('models', [])
            model_names = [m['name'] for m in models]
            
            print(f"  ✓ Ollama at {OLLAMA_BASE_URL}")
            print(f"  ✓ Available models: {len(models)}")
            
            if OLLAMA_MODEL in model_names:
                print(f"  ✓ Model '{OLLAMA_MODEL}' is ready")
                return True
            else:
                print(f"  ⚠ Model '{OLLAMA_MODEL}' not found")
                print(f"     Available: {', '.join(model_names)}")
                print(f"     Fix: ollama pull {OLLAMA_MODEL}")
                return False
        else:
            print(f"  ✗ HTTP {resp.status_code}")
            return False
    except Exception as e:
        print(f"  ✗ Connection error: {e}")
        print("\nTroubleshooting:")
        print("  • Start Ollama: ollama serve")
        print("  • Check OLLAMA_BASE_URL in config/settings.py")
        return False

def check_uploads_dir():
    """Check uploads directory exists and is writable."""
    print_header("Checking Uploads Directory")
    
    try:
        from config.settings import UPLOADS_DIR
        
        os.makedirs(UPLOADS_DIR, exist_ok=True)
        test_file = os.path.join(UPLOADS_DIR, '.test')
        
        with open(test_file, 'w') as f:
            f.write('test')
        os.remove(test_file)
        
        file_count = sum(1 for _, _, files in os.walk(UPLOADS_DIR) for _ in files)
        print(f"  ✓ Uploads dir: {UPLOADS_DIR}")
        print(f"  ✓ Writable and contains {file_count} files")
        return True
    except Exception as e:
        print(f"  ✗ Error: {e}")
        return False

def check_environment():
    """Check environment variables and configuration."""
    print_header("Checking Configuration")
    
    try:
        from config.settings import (
            MYSQL_HOST, MYSQL_USER, MYSQL_DB, MYSQL_PORT,
            OLLAMA_BASE_URL, OLLAMA_MODEL, OLLAMA_TIMEOUT,
            STABILITY_API_KEY, UNSPLASH_ACCESS_KEY
        )
        
        print(f"  ✓ MySQL: {MYSQL_USER}@{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DB}")
        print(f"  ✓ Ollama: {OLLAMA_BASE_URL} timeout={OLLAMA_TIMEOUT}s")
        print(f"  ✓ Model: {OLLAMA_MODEL}")
        
        if STABILITY_API_KEY:
            print(f"  ✓ Stability API: Configured")
        else:
            print(f"  ⚠ Stability API: Not configured (optional)")
        
        if UNSPLASH_ACCESS_KEY:
            print(f"  ✓ Unsplash: Configured")
        else:
            print(f"  ⚠ Unsplash: Not configured (optional)")
        
        return True
    except Exception as e:
        print(f"  ✗ Config error: {e}")
        return False

def check_imports():
    """Verify all agents and tools can be imported."""
    print_header("Checking Imports")
    
    modules = [
        'master_agent.agent',
        'scraper_agent.agent',
        'extractor_agent.agent',
        'editor_agent.agent',
        'seo_agent.agent',
        'image_agent.agent',
        'publisher_agent.agent',
        'tools',
        'memory.store',
        'api.server',
    ]
    
    all_ok = True
    for mod_name in modules:
        try:
            __import__(mod_name)
            print(f"  ✓ {mod_name}")
        except Exception as e:
            print(f"  ✗ {mod_name}: {e}")
            all_ok = False
    
    return all_ok

def main():
    print("\n" + "="*60)
    print("  manus_agents System Verification")
    print("="*60)
    
    checks = [
        ("Python Packages", check_python_packages),
        ("Imports", check_imports),
        ("Configuration", check_environment),
        ("Uploads Directory", check_uploads_dir),
        ("MySQL Database", check_database),
        ("Ollama LLM", check_ollama),
    ]
    
    results = []
    for name, check_func in checks:
        try:
            results.append((name, check_func()))
        except Exception as e:
            print(f"\n✗ {name}: Unexpected error: {e}")
            results.append((name, False))
    
    # Summary
    print_header("Summary")
    passed = sum(1 for _, ok in results if ok)
    total = len(results)
    
    for name, ok in results:
        status = "✓" if ok else "✗"
        print(f"  {status} {name}")
    
    print(f"\n  Result: {passed}/{total} checks passed\n")
    
    if passed == total:
        print("✓ System is ready! Run: python run_agents.py --once\n")
        return 0
    else:
        print("⚠ Please fix the issues above before running the system.\n")
        return 1

if __name__ == "__main__":
    sys.exit(main())
