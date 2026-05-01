#!/usr/bin/env python3
"""Build the master URL list.

Combines:
  - 42 raw.githubusercontent.com URLs from enumerate-github-pdfs.py
  - All direct-PDF URLs harvested from the 5 other research markdown files

Filtering rules (per aggregator task):
  - URL must end in .pdf OR be on a known-good direct-PDF host
  - Skip viewer-only platforms (Scribd, Issuu, SlideShare, Academia.edu,
    CourseHero, PdfCoffee, StudyLib, CliffsNotes, Studocu, Coursesidekick,
    Kupdf, PowerShow)
  - Skip Drive folder URLs (drive.google.com/drive/folders/*)
  - Skip Drive file viewer URLs (drive.google.com/file/d/*/view) — these
    are HTML viewers, not direct PDF binaries
  - Skip Telegram/Reddit/Quora/LinkedIn/Facebook/YouTube landing pages
"""
from __future__ import annotations
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RESEARCH = ROOT / "docs" / "research"

VIEWER_HOSTS = {
    "scribd.com", "es.scribd.com",
    "issuu.com",
    "slideshare.net",
    "academia.edu",
    "coursehero.com",
    "pdfcoffee.com",
    "studylib.net",
    "cliffsnotes.com",
    "studocu.com",
    "coursesidekick.com",
    "kupdf.net",
    "powershow.com",
}

LANDING_HOSTS = {
    "t.me", "telegram.me",
    "reddit.com", "www.reddit.com",
    "quora.com", "www.quora.com", "devanshme.quora.com",
    "linkedin.com", "www.linkedin.com", "in.linkedin.com",
    "facebook.com", "www.facebook.com",
    "youtube.com", "www.youtube.com", "youtu.be",
    "fishbowlapp.com", "www.fishbowlapp.com",
    "telegrouplink.net",
}

# Hosts whose URLs may not end in .pdf but still serve PDF binary
# (per the task's allowlist hint)
DIRECT_PDF_HOSTS = {
    "raw.githubusercontent.com",
}


URL_RE = re.compile(r"https?://[^\s)\]\"'<>`]+")


def host(u: str) -> str:
    m = re.match(r"https?://([^/]+)", u)
    return (m.group(1).lower() if m else "")


def is_drive_folder(u: str) -> bool:
    return "drive.google.com/drive/folders/" in u


def is_drive_viewer(u: str) -> bool:
    # drive.google.com/file/d/<id>/view — HTML viewer, not raw PDF
    return bool(re.search(r"drive\.google\.com/file/d/[^/]+/(view|preview)", u))


def is_drive_direct(u: str) -> bool:
    # drive.google.com/uc?export=download&id=...
    return "drive.google.com/uc?export=download" in u


def github_blob(u: str) -> bool:
    # github.com/.../blob/... is HTML; raw.githubusercontent.com is the binary
    return "github.com" in u and "/blob/" in u and "raw.githubusercontent.com" not in u


def keep(u: str) -> bool:
    u = u.strip().rstrip(".,);:`'\"")
    if not u.startswith("http"):
        return False
    h = host(u)
    if h in VIEWER_HOSTS or h in LANDING_HOSTS:
        return False
    if is_drive_folder(u):
        return False
    if is_drive_viewer(u):
        return False
    if github_blob(u):
        return False
    if u.lower().endswith(".pdf"):
        return True
    if h in DIRECT_PDF_HOSTS:
        # raw.githubusercontent.com pattern URLs (path ends with `/`) are
        # not real files — they're the URL templates in the research notes.
        if u.endswith("/"):
            return False
        return True
    if is_drive_direct(u):
        return True
    # McKinsey .ashx (PST PDFs) — known to serve PDF binary
    if "mckinsey.com" in h and u.lower().endswith(".ashx"):
        return True
    # Kearney /documents/.../*.pdf?...
    if h.endswith("kearney.com") and ".pdf" in u.lower():
        return True
    # Otherwise reject
    return False


def main():
    text_blobs: list[str] = []
    for md in sorted(RESEARCH.glob("*.md")):
        text_blobs.append(md.read_text(encoding="utf-8", errors="ignore"))
    combined = "\n".join(text_blobs)

    # Add the GitHub-enumerated URLs
    gh_path = Path("/tmp/github-pdfs.txt")
    if not gh_path.exists():
        # fallback: re-run the enumerator
        out = subprocess.check_output(
            ["python", str(ROOT / "scripts" / "ingest" / "enumerate-github-pdfs.py")],
            text=True,
        )
        gh_urls = [l.strip() for l in out.splitlines() if l.strip()]
    else:
        gh_urls = [l.strip() for l in gh_path.read_text().splitlines() if l.strip()]

    raw_urls = URL_RE.findall(combined)
    all_urls = gh_urls + raw_urls

    seen: set[str] = set()
    keepers: list[str] = []
    for u in all_urls:
        u = u.strip().rstrip(".,);:`'\"")
        if u in seen:
            continue
        if keep(u):
            seen.add(u)
            keepers.append(u)

    out_path = RESEARCH / "all-pdf-urls.txt"
    out_path.write_text("\n".join(keepers) + "\n", encoding="utf-8")
    print(f"Wrote {len(keepers)} URLs to {out_path}", file=sys.stderr)


if __name__ == "__main__":
    main()
