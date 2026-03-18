#!/usr/bin/env python3
"""
test_admin_endpoints.py
Test all connected Manus AI endpoints for admin panel integration.

Usage:
  python test_admin_endpoints.py
  python test_admin_endpoints.py --verbose
"""

import sys
import argparse
import requests
import json
import time
from datetime import datetime

# Configuration
MANUS_API = "http://localhost:8002"

# Terminal colors
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
BLUE = "\033[94m"
RESET = "\033[0m"
BOLD = "\033[1m"

def banner(msg):
    print(f"\n{BLUE}{BOLD}▶ {msg}{RESET}")

def success(msg):
    print(f"{GREEN}✓ {msg}{RESET}")

def error(msg):
    print(f"{RED}✗ {msg}{RESET}")

def warning(msg):
    print(f"{YELLOW}⚠ {msg}{RESET}")

def info(msg):
    print(f"{BLUE}ℹ {msg}{RESET}")

class EndpointTester:
    def __init__(self, base_url=MANUS_API, verbose=False):
        self.base_url = base_url
        self.verbose = verbose
        self.results = {
            "passed": 0,
            "failed": 0,
            "endpoints": []
        }
    
    def test_endpoint(self, name, method, endpoint, data=None, expect_code=200):
        """Test a single endpoint."""
        info(f"{method} {endpoint}")
        
        try:
            url = f"{self.base_url}{endpoint}"
            
            if method == "GET":
                resp = requests.get(url, timeout=10)
            elif method == "POST":
                resp = requests.post(url, json=data, timeout=10)
            else:
                error(f"Unknown method: {method}")
                return False
            
            if resp.status_code == expect_code:
                success(f"Status {resp.status_code}")
                self.results["passed"] += 1
                self.results["endpoints"].append({
                    "name": name,
                    "method": method,
                    "endpoint": endpoint,
                    "status": "pass"
                })
                
                if self.verbose:
                    try:
                        body = resp.json()
                        print(f"  Response preview: {json.dumps(body, indent=2)[:200]}...")
                    except:
                        pass
                
                return True
            else:
                error(f"Expected {expect_code}, got {resp.status_code}")
                self.results["failed"] += 1
                self.results["endpoints"].append({
                    "name": name,
                    "method": method,
                    "endpoint": endpoint,
                    "status": "fail",
                    "error": f"Status {resp.status_code}"
                })
                return False
                
        except requests.exceptions.ConnectionError:
            error(f"Cannot connect to {self.base_url}")
            self.results["failed"] += 1
            self.results["endpoints"].append({
                "name": name,
                "method": method,
                "endpoint": endpoint,
                "status": "fail",
                "error": "Connection error"
            })
            return False
        except Exception as exc:
            error(f"Error: {str(exc)}")
            self.results["failed"] += 1
            self.results["endpoints"].append({
                "name": name,
                "method": method,
                "endpoint": endpoint,
                "status": "fail",
                "error": str(exc)
            })
            return False
    
    def run_all_tests(self):
        """Run complete test suite for admin panel endpoints."""
        print(f"\n{BOLD}{'='*70}{RESET}")
        print(f"{BOLD}MANUS AI - ADMIN PANEL ENDPOINTS TEST SUITE{RESET}")
        print(f"{BOLD}{'='*70}{RESET}")
        print(f"Target: {self.base_url}")
        print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        # ─── Health & Status ─────────────────────────────────────────────
        banner("HEALTH & STATUS")
        self.test_endpoint(
            "Health Check",
            "GET", "/health",
            expect_code=200
        )
        self.test_endpoint(
            "AI Status",
            "GET", "/ai/status",
            expect_code=200
        )
        
        # ─── Text Processing ────────────────────────────────────────────
        banner("TEXT PROCESSING")
        self.test_endpoint(
            "Rewrite Text",
            "POST", "/ai/rewrite",
            {"text": "The quick brown fox jumps over the lazy dog."},
            expect_code=200
        )
        self.test_endpoint(
            "Generate Summary",
            "POST", "/ai/summary",
            {"text": "Breaking news: New technology announced.", "title": "Tech News"},
            expect_code=200
        )
        self.test_endpoint(
            "Generate SEO",
            "POST", "/ai/seo",
            {"text": "Article content here.", "title": "Article Title"},
            expect_code=200
        )
        
        # ─── Core Processing ────────────────────────────────────────────
        banner("CORE PROCESSING (NEW ENDPOINTS)")
        self.test_endpoint(
            "Process Text (Manual Content)",
            "POST", "/ai/process-text",
            {"content": "This is manually pasted content for testing.", "title": "Test Article"},
            expect_code=200
        )
        self.test_endpoint(
            "Process URL",
            "POST", "/ai/process-url",
            {"url": "https://example.com"},
            expect_code=200
        )
        self.test_endpoint(
            "Generate Article",
            "POST", "/ai/generate-article",
            {"text": "Write about artificial intelligence", "title": "AI Article"},
            expect_code=200
        )
        
        # ─── Article Management ─────────────────────────────────────────
        banner("ARTICLE MANAGEMENT")
        self.test_endpoint(
            "List Articles",
            "GET", "/ai/articles?limit=5",
            expect_code=200
        )
        self.test_endpoint(
            "Memory Snapshot",
            "GET", "/ai/memory",
            expect_code=200
        )
        
        # ─── Admin Runtime Controls ──────────────────────────────────────
        banner("ADMIN RUNTIME CONTROLS")
        self.test_endpoint(
            "Get Runtime Config",
            "GET", "/admin/runtime",
            expect_code=200
        )
        self.test_endpoint(
            "Toggle Web Scraper",
            "POST", "/admin/runtime/web-scraper",
            {"enabled": False},
            expect_code=200
        )
        
        # ─── Admin Actions ──────────────────────────────────────────────
        banner("ADMIN ACTIONS")
        self.test_endpoint(
            "Run Scraper Now",
            "POST", "/admin/actions/run-scraper",
            expect_code=200
        )
        self.test_endpoint(
            "Run Pending Queue",
            "POST", "/admin/actions/run-pending",
            {"limit": 5},
            expect_code=200
        )
        self.test_endpoint(
            "Run Full Cycle",
            "POST", "/admin/actions/run-cycle",
            {"limit": 5, "include_scraper": False},
            expect_code=200
        )
        
        # ─── Admin Monitoring ───────────────────────────────────────────
        banner("ADMIN MONITORING")
        self.test_endpoint(
            "Get Stats",
            "GET", "/admin/stats",
            expect_code=200
        )
        self.test_endpoint(
            "Get Queue",
            "GET", "/admin/queue?limit=10",
            expect_code=200
        )
        
        # ─── Summary ─────────────────────────────────────────────────────
        banner("TEST SUMMARY")
        total = self.results["passed"] + self.results["failed"]
        
        print(f"\nTotal Tests: {BOLD}{total}{RESET}")
        print(f"Passed: {GREEN}{self.results['passed']}{RESET}")
        print(f"Failed: {RED}{self.results['failed']}{RESET}")
        
        if self.results["failed"] == 0:
            success("All endpoints connected and working! ✅")
        else:
            warning(f"{self.results['failed']} endpoint(s) failed")
        
        # Summary table
        print(f"\n{BOLD}Endpoint Summary:{RESET}")
        print(f"{'Method':<6} {'Endpoint':<35} {'Status':<10}")
        print("─" * 55)
        for ep in self.results["endpoints"]:
            status_display = "✓ PASS" if ep["status"] == "pass" else "✗ FAIL"
            print(f"{ep['method']:<6} {ep['endpoint']:<35} {status_display:<10}")
        
        print(f"\n{BOLD}{'='*70}{RESET}\n")
        
        return self.results["failed"] == 0

def main():
    parser = argparse.ArgumentParser(
        description="Test Manus AI endpoints connected to admin panel"
    )
    parser.add_argument("--verbose", action="store_true", help="Show response details")
    parser.add_argument("--url", default=MANUS_API, help="Manus API URL (default: http://localhost:8002)")
    args = parser.parse_args()
    
    tester = EndpointTester(base_url=args.url, verbose=args.verbose)
    success = tester.run_all_tests()
    
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
