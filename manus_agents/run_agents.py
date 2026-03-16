"""
run_agents.py
-------------
Entry point for the manus_agents multi-agent system.

Usage:
  python run_agents.py              → continuous loop (every 30 min)
  python run_agents.py --once       → single scrape-process cycle and exit
  python run_agents.py --loop       → continuous loop
  python run_agents.py --api        → start admin API only (port 8002)
  python run_agents.py --api --loop → API + automation loop concurrently
  python run_agents.py --dry-run    → sanity check without any network/LLM calls
"""

import sys, os, time, threading, argparse, logging
sys.path.insert(0, os.path.dirname(__file__))

from master_agent.agent import MasterAgent
from config.settings    import LOOP_INTERVAL_SECONDS

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("manus-agents")

_banner = lambda m: print(f"\n{'━'*66}\n  {m}\n{'━'*66}")


# ── Modes ──────────────────────────────────────────────────────────────────────

def run_once():
    master = MasterAgent()
    _banner("Running single pipeline cycle")
    saved = master.run()
    log.info(f"Done. {saved} article(s) saved.")


def run_loop():
    master = MasterAgent()
    _banner(f"Starting continuous loop (interval={LOOP_INTERVAL_SECONDS}s)")
    while True:
        try:
            master.run()
        except Exception as exc:
            log.error(f"Unhandled loop error: {exc}")
        log.info(f"Sleeping {LOOP_INTERVAL_SECONDS}s …")
        time.sleep(LOOP_INTERVAL_SECONDS)


def run_api():
    import uvicorn
    _banner("Starting Admin API on http://0.0.0.0:8002")
    uvicorn.run("api.server:app", host="0.0.0.0", port=8002, reload=False)


def dry_run():
    _banner("Dry-run sanity check")
    master = MasterAgent()
    result = master.dry_run()
    for k, v in result.items():
        print(f"  {k:20s}: {v}")


# ── CLI ────────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="manus_agents — Local Multi-Agent AI Newsroom"
    )
    parser.add_argument("--once",    action="store_true", help="one cycle and exit")
    parser.add_argument("--api",     action="store_true", help="start admin API server")
    parser.add_argument("--loop",    action="store_true", help="continuous loop")
    parser.add_argument("--dry-run", action="store_true", dest="dry", help="smoke test")
    args = parser.parse_args()

    if args.dry:
        dry_run()
    elif args.once:
        run_once()
    elif args.api and args.loop:
        t = threading.Thread(target=run_loop, daemon=True)
        t.start()
        run_api()
    elif args.api:
        run_api()
    else:
        run_loop()


if __name__ == "__main__":
    main()
