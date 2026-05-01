#!/usr/bin/env python3
"""Inject the verified URL list into scripts/ingest/sources.json's
extra_pdf_urls array. Preserves the existing `sources` array."""
from __future__ import annotations
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SOURCES = ROOT / "scripts" / "ingest" / "sources.json"
VERIFIED_TXT = ROOT / "docs" / "research" / "all-pdf-urls.verified.txt"


def main():
    urls = [l.strip() for l in VERIFIED_TXT.read_text(encoding="utf-8").splitlines() if l.strip()]
    cfg = json.loads(SOURCES.read_text(encoding="utf-8"))
    cfg["extra_pdf_urls"] = urls
    SOURCES.write_text(json.dumps(cfg, indent=2) + "\n", encoding="utf-8")
    print(f"Updated {SOURCES} with {len(urls)} verified URLs")


if __name__ == "__main__":
    main()
