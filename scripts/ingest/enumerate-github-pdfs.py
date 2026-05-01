#!/usr/bin/env python3
"""Enumerate PDFs from the 6 verified casebook repos and emit download_url list."""
import json
import sys
import urllib.request

REPOS = [
    ("satyam-user/Consulting_Bot", ""),
    ("Pranayshukla0610/Consulting-Case-Books", ""),
    ("Itish-Garg/Casebooks", ""),
    ("ayush-agarwal-0502/ConsultBot_LLM", ""),
    ("ayush-agarwal-0502/ConsultBot_LLM", "iim_casebooks"),
    ("Saurya29/ConsultAi_Streamlit", ""),
    ("Saurya29/ConsultAi_Streamlit", "data"),
    ("GoncaloFelicio/Practice-Case-Interviews", ""),
]


def list_pdfs(repo: str, path: str) -> list[str]:
    url = f"https://api.github.com/repos/{repo}/contents/{path}"
    req = urllib.request.Request(url, headers={"User-Agent": "casepad-aggregator"})
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read())
    except Exception as e:
        print(f"WARN {repo}/{path}: {e}", file=sys.stderr)
        return []
    out = []
    if not isinstance(data, list):
        return out
    for entry in data:
        if entry.get("type") == "file" and entry.get("name", "").lower().endswith(".pdf"):
            durl = entry.get("download_url")
            if durl:
                out.append(durl)
    return out


def main():
    all_urls: list[str] = []
    for repo, subpath in REPOS:
        pdfs = list_pdfs(repo, subpath)
        print(f"{repo}/{subpath} -> {len(pdfs)} PDFs", file=sys.stderr)
        all_urls.extend(pdfs)
    # de-dupe preserving order
    seen = set()
    uniq = []
    for u in all_urls:
        if u not in seen:
            seen.add(u)
            uniq.append(u)
    print(f"Total unique GitHub PDF URLs: {len(uniq)}", file=sys.stderr)
    for u in uniq:
        print(u)


if __name__ == "__main__":
    main()
