#!/usr/bin/env python3
"""
test_api.py
-----------
Test suite for manus_agents FastAPI endpoints.

Usage:
  python test_api.py                    → Run all tests
  python test_api.py --endpoint health  → Test specific endpoint
  python test_api.py --verbose          → Verbose output

Make sure the API is running:
  python run_agents.py --api
"""

import sys
import os
import argparse
import requests
import json
import time
from datetime import datetime

# API base URL
API_BASE = "http://localhost:8002"

# Color codes for terminal output
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


class APITester:
    def __init__(self, base_url=API_BASE, verbose=False):
        self.base_url = base_url
        self.verbose = verbose
        self.results = {"passed": 0, "failed": 0}
    
    def _request(self, method, endpoint, data=None):
        """Make HTTP request and return response."""
        url = f"{self.base_url}{endpoint}"
        try:
            if method == "GET":
                resp = requests.get(url, timeout=30)
            elif method == "POST":
                resp = requests.post(url, json=data, timeout=60)
            else:
                return None, f"Unknown method: {method}"
            
            return resp, None
        except requests.exceptions.ConnectionError:
            return None, f"Cannot connect to {self.base_url} — is the API running?"
        except requests.exceptions.Timeout:
            return None, "Request timeout"
        except Exception as exc:
            return None, str(exc)
    
    def test(self, name, method, endpoint, data=None, expect_code=200):
        """Run a single test."""
        banner(name)
        
        resp, err = self._request(method, endpoint, data)
        
        if err:
            error(f"{err}")
            self.results["failed"] += 1
            return False
        
        try:
            if resp.status_code == expect_code:
                success(f"Status {resp.status_code}")
                
                if self.verbose:
                    try:
                        body = resp.json()
                        info(f"Response: {json.dumps(body, indent=2)[:200]}...")
                    except:
                        info(f"Response: {resp.text[:100]}")
                
                self.results["passed"] += 1
                return True
            else:
                error(f"Expected {expect_code}, got {resp.status_code}")
                if self.verbose:
                    info(f"Response: {resp.text[:200]}")
                self.results["failed"] += 1
                return False
        except Exception as exc:
            error(f"Response parse error: {exc}")
            self.results["failed"] += 1
            return False
    
    def run_all_tests(self):
        """Run complete test suite."""
        print(f"\n{BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{RESET}")
        print(f"{BOLD}Manus Agents API Test Suite{RESET}")
        print(f"{BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{RESET}")
        print(f"Target: {self.base_url}")
        
        # Health check
        section = "Health & Status"
        print(f"\n{BOLD}{section}{RESET}")
        print("─" * 50)
        self.test("GET /health", "GET", "/health", expect_code=200)
        
        # AI Functions
        section = "AI Text Processing"
        print(f"\n{BOLD}{section}{RESET}")
        print("─" * 50)
        
        self.test(
            "POST /ai/rewrite (basic text)",
            "POST", "/ai/rewrite",
            {"text": "The quick brown fox jumps over the lazy dog."},
            expect_code=200
        )
        
        self.test(
            "POST /ai/summary",
            "POST", "/ai/summary",
            {"text": "Breaking news: A local politician announces new development project. The initiative aims to improve infrastructure in the region."},
            expect_code=200
        )
        
        self.test(
            "POST /ai/seo",
            "POST", "/ai/seo",
            {"title": "New Tech Company Opens Office", "text": "A major technology firm has established operations."},
            expect_code=200
        )
        
        # Image Generation
        section = "Image Generation"
        print(f"\n{BOLD}{section}{RESET}")
        print("─" * 50)
        
        self.test(
            "POST /ai/generate-images",
            "POST", "/ai/generate-images",
            {"title": "Beautiful Sunset", "text": "A scenic photograph of the sunset over the horizon with vibrant colors."},
            expect_code=200
        )
        
        # Article Management
        section = "Article Management"
        print(f"\n{BOLD}{section}{RESET}")
        print("─" * 50)
        
        self.test(
            "GET /ai/articles",
            "GET", "/ai/articles?limit=5",
            expect_code=200
        )
        
        self.test(
            "GET /ai/memory (snapshot)",
            "GET", "/ai/memory",
            expect_code=200
        )
        
        # Full article generation
        section = "Full Pipeline"
        print(f"\n{BOLD}{section}{RESET}")
        print("─" * 50)
        
        self.test(
            "POST /ai/generate-article (full pipeline)",
            "POST", "/ai/generate-article",
            {
                "title": "City Council Approves New Park",
                "text": "The municipal government has approved plans for a new community park in downtown. The 5-acre space will feature gardens, walking trails, and children's playground facilities. Construction is expected to begin next month."
            },
            expect_code=200
        )
        
        # Summary
        section = "Test Results"
        print(f"\n{BOLD}{section}{RESET}")
        print("─" * 50)
        
        total = self.results["passed"] + self.results["failed"]
        print(f"Passed: {GREEN}{self.results['passed']}{RESET}")
        print(f"Failed: {RED}{self.results['failed']}{RESET}")
        print(f"Total:  {BOLD}{total}{RESET}")
        
        if self.results["failed"] == 0:
            success("All tests passed! 🎉")
        else:
            warning(f"{self.results['failed']} test(s) failed")
        
        print(f"{BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{RESET}\n")
    
    def test_specific(self, endpoint):
        """Test a specific endpoint."""
        endpoints = {
            "health": ("GET /health", "GET", "/health"),
            "rewrite": ("POST /ai/rewrite", "POST", "/ai/rewrite", {"text": "Sample text"}),
            "summary": ("POST /ai/summary", "POST", "/ai/summary", {"text": "Sample article"}),
            "seo": ("POST /ai/seo", "POST", "/ai/seo", {"title": "Test", "text": "Content"}),
            "images": ("POST /ai/generate-images", "POST", "/ai/generate-images", {"title": "Test", "text": "Content"}),
            "articles": ("GET /ai/articles", "GET", "/ai/articles"),
            "memory": ("GET /ai/memory", "GET", "/ai/memory"),
        }
        
        if endpoint not in endpoints:
            error(f"Unknown endpoint: {endpoint}")
            error(f"Available: {', '.join(endpoints.keys())}")
            return
        
        test_info = endpoints[endpoint]
        name, method, path = test_info[:3]
        data = test_info[3] if len(test_info) > 3 else None
        
        print(f"\n{BOLD}Testing: {name}{RESET}\n")
        self.test(name, method, path, data)


def main():
    parser = argparse.ArgumentParser(
        description="Test manus_agents FastAPI endpoints"
    )
    parser.add_argument(
        "--endpoint",
        help="Test specific endpoint (health, rewrite, summary, seo, images, articles, memory)"
    )
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Verbose output with full responses"
    )
    parser.add_argument(
        "--base-url",
        default=API_BASE,
        help="API base URL (default: " + API_BASE + ")"
    )
    
    args = parser.parse_args()
    
    tester = APITester(base_url=args.base_url, verbose=args.verbose)
    
    if args.endpoint:
        tester.test_specific(args.endpoint)
    else:
        tester.run_all_tests()


if __name__ == "__main__":
    main()
