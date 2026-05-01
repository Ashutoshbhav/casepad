#!/usr/bin/env python3
"""Generate docs/research/SUMMARY.md from the verifier output.

Reads:
  - docs/research/all-pdf-urls.txt          (master list)
  - docs/research/all-pdf-urls.verified.json (per-URL verifier report)
"""
from __future__ import annotations
import json
import re
from collections import Counter, defaultdict
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[2]
RESEARCH = ROOT / "docs" / "research"

MASTER = RESEARCH / "all-pdf-urls.txt"
VERIFIED_JSON = RESEARCH / "all-pdf-urls.verified.json"
SUMMARY = RESEARCH / "SUMMARY.md"


def host(u: str) -> str:
    try:
        return urlparse(u).hostname or ""
    except Exception:
        return ""


def categorize(u: str) -> str:
    h = host(u).lower()
    p = urlparse(u).path.lower()

    if h == "raw.githubusercontent.com":
        return "GitHub"
    if h.endswith(".ac.in") or h.endswith("caciitg.com"):
        return "Indian B-school (official)"
    if any(s in p for s in ("iim", "xlri", "fms", "isb", "iit", "mdi", "spjimr", "iift", "bitsom")):
        return "Indian B-school (mirror)"
    if h in {
        "www.mckinsey.com", "www.bcg.com", "media-publications.bcg.com",
        "www.bain.com", "www.accenture.com", "careers.accenture.com",
        "www.kearney.com", "www.simon-kucher.com", "www.simon-kucher.com",
        "www.kpmg.com", "assets.kpmg.com", "www2.deloitte.com",
        "www.occstrategy.com", "www.pwc.co.uk", "www.strategyand.pwc.com",
        "www.zs.com", "www.lek.com", "www.oliverwyman.com",
        "www.rolandberger.com", "www.cfainstitute.org",
    } or any(d in h for d in ("kpmg.com", "mckinsey.com", "bcg.com", "kearney.com",
                                "accenture.com", "deloitte.com", "simon-kucher.com",
                                "oliverwyman.com", "lek.com", "zs.com",
                                "rolandberger.com", "occstrategy.com", "pwc.co.uk")):
        return "Consulting firm (official)"
    if h.endswith(".edu") or h in {"economics.virginia.edu", "wp.stolaf.edu",
                                    "questromworld.bu.edu", "consultingconnect.nd.edu",
                                    "students.marshall.usc.edu",
                                    "www.kenan-flagler.unc.edu", "web.ics.purdue.edu",
                                    "www.bc.edu", "www.anderson.ucla.edu",
                                    "community.bus.emory.edu",
                                    "cdn.uconnectlabs.com", "cdn.careers.bloch.umkc.edu"}:
        return "US B-school (official)"
    if any(prep in h for prep in ("careerinconsulting.com", "caseinterview.com",
                                    "myconsultingcoach.com", "managementconsulted.com",
                                    "wallstreetoasis.com", "theconsultingsociety.com",
                                    "d3no4ktch0fdq4.cloudfront.net",
                                    "thinkific", "kajabi-storefronts",
                                    "files7.webydo.com")):
        return "US/EU B-school (prep mirror)"
    if "ximb.edu.in" in h or "mahindratransportawards.com" in h \
       or "tvz.hr" in h or "cloudfront.net" in h or "cfainstitute.org" in h \
       or "api.unstop.com" in h:
        return "Case competition brief"
    if "archive.org" in h:
        return "Internet Archive (book)"
    return "Other"


def main():
    urls = [l.strip() for l in MASTER.read_text(encoding="utf-8").splitlines() if l.strip()]
    report = json.loads(VERIFIED_JSON.read_text(encoding="utf-8"))
    by_url = {r["url"]: r for r in report}

    total = len(urls)
    ok = [r for r in report if r["ok"]]
    waf = [r for r in report if not r["ok"] and r.get("status") in (401, 403, 429)]
    dead = [r for r in report if not r["ok"] and r.get("status") in (404, 410)]
    server_err = [r for r in report if not r["ok"] and r.get("status") and 500 <= r["status"] < 600]
    network_err = [r for r in report if not r["ok"] and r.get("status") is None]
    not_pdf = [r for r in report if not r["ok"] and r.get("status") and 200 <= r["status"] < 300]
    other_fail = [r for r in report if not r["ok"]
                   and r not in waf and r not in dead
                   and r not in server_err and r not in network_err
                   and r not in not_pdf]

    # Group OK URLs by category
    by_cat: dict[str, list[str]] = defaultdict(list)
    for r in ok:
        by_cat[categorize(r["url"])].append(r["url"])

    # Total cases reachable estimate (per-casebook averages from research)
    # Average ~22 cases per casebook, with conservative weighting
    avg_per_casebook = 22
    avg_per_compbrief = 1
    avg_per_firm_pdf = 4
    est_cases = 0
    cat_to_avg = {
        "GitHub": avg_per_casebook,
        "Indian B-school (official)": avg_per_casebook,
        "Indian B-school (mirror)": avg_per_casebook,
        "US B-school (official)": avg_per_casebook,
        "US/EU B-school (prep mirror)": avg_per_casebook,
        "Consulting firm (official)": avg_per_firm_pdf,
        "Case competition brief": avg_per_compbrief,
        "Internet Archive (book)": 30,
        "Other": 5,
    }
    for cat, lst in by_cat.items():
        est_cases += len(lst) * cat_to_avg.get(cat, 5)

    # Top 10 highest yield (heuristic: GitHub repos with biggest casebook PDFs,
    # then official Indian/US B-school PDFs, then prep mirrors)
    yield_score = {
        "GitHub": 5,
        "Indian B-school (official)": 5,
        "US B-school (official)": 4,
        "US/EU B-school (prep mirror)": 3,
        "Indian B-school (mirror)": 3,
        "Consulting firm (official)": 2,
        "Internet Archive (book)": 4,
        "Case competition brief": 1,
        "Other": 1,
    }
    scored = []
    for r in ok:
        s = yield_score.get(categorize(r["url"]), 1)
        size = r.get("contentLength") or 0
        # multi-MB PDFs typically pack many cases
        scored.append((s * 1_000_000 + (size or 0), r["url"]))
    scored.sort(reverse=True)
    top10 = [u for _, u in scored[:10]]

    # Render
    lines: list[str] = []
    add = lines.append
    add("# Casebook URL Aggregation Summary")
    add("")
    add("**Generated:** 2026-04-30")
    add("**Source:** 6 deep-research outputs in `docs/research/` aggregated into a master list, then HTTP-verified.")
    add("")
    add("## Verification counts")
    add("")
    add(f"- **Total URLs in master list:** {total}")
    add(f"- **Verified OK (200 + application/pdf):** {len(ok)}")
    add(f"- **WAF-blocked / auth-gated (401/403/429):** {len(waf)} _(expected for BCG, McKinsey, some firm CDNs — retry with browser UA later)_")
    add(f"- **True 404 / 410 (dead links):** {len(dead)}")
    add(f"- **5xx server errors:** {len(server_err)}")
    add(f"- **Network / DNS / TLS errors:** {len(network_err)}")
    add(f"- **200 but not application/pdf (HTML/redirect):** {len(not_pdf)}")
    if other_fail:
        add(f"- **Other failures:** {len(other_fail)}")
    add("")
    add(f"**Estimated total cases reachable from verified PDFs:** ~{est_cases:,} _(using {avg_per_casebook}/casebook and lower averages for firm pages and competition briefs)_")
    add("")
    add("## Verified URLs by source category")
    add("")
    cat_order = [
        "GitHub",
        "Indian B-school (official)",
        "Indian B-school (mirror)",
        "US B-school (official)",
        "US/EU B-school (prep mirror)",
        "Consulting firm (official)",
        "Case competition brief",
        "Internet Archive (book)",
        "Other",
    ]
    for cat in cat_order:
        lst = by_cat.get(cat, [])
        add(f"### {cat} ({len(lst)})")
        if not lst:
            add("")
            add("_(none verified)_")
            add("")
            continue
        for u in sorted(lst):
            add(f"- {u}")
        add("")

    add("## Top 10 highest-yield individual URLs")
    add("")
    for i, u in enumerate(top10, 1):
        add(f"{i}. {u}")
    add("")

    add("## Failure patterns")
    add("")
    add("Grouped by host to make retry/replacement decisions easier.")
    add("")
    failures = [r for r in report if not r["ok"]]
    fail_by_host = Counter(host(r["url"]) for r in failures)
    for h, n in fail_by_host.most_common(20):
        add(f"- `{h}`: {n} failure(s)")
    add("")

    if waf:
        add("### WAF-blocked / auth-gated URLs (401/403/429)")
        add("")
        add("These hosts reject scripted fetchers but typically serve real PDFs to a browser. Re-fetch with a browser UA, or download manually and ingest via `npm run ingest:run:disk`.")
        add("")
        for r in waf[:30]:
            add(f"- [{r['status']}] {r['url']}")
        if len(waf) > 30:
            add(f"- _...and {len(waf) - 30} more_")
        add("")

    if dead:
        add("### Dead links (404/410)")
        add("")
        for r in dead[:30]:
            add(f"- [{r['status']}] {r['url']}")
        if len(dead) > 30:
            add(f"- _...and {len(dead) - 30} more_")
        add("")

    SUMMARY.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Wrote {SUMMARY}")


if __name__ == "__main__":
    main()
