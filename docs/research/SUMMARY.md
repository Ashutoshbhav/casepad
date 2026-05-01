# CasePad — Sourcing Research Summary

**Date:** 2026-05-01
**Status:** 131 verified casebook PDF URLs ingested into `scripts/ingest/sources.json` → `extra_pdf_urls`

## Headline numbers

| Metric | Count |
|---|---|
| Master URL list (master) | 156 |
| HTTP-verified (200 + `application/pdf`) | **131** |
| OK rate | 84% |
| Failures | 25 |

**Estimated cases reachable** (based on average ~20-25 cases per casebook, with significant cross-host duplication): **1500-2000 unique cases after dedup.** Comfortably above the 1000-case target.

## Verified URLs by category

| Category | Verified | Notes |
|---|---|---|
| GitHub raw | 42 | Backbone of the corpus — 6 community-aggregated repos (satyam-user/Consulting_Bot, Pranayshukla0610, Itish-Garg, ayush-agarwal-0502, Saurya29, GoncaloFelicio). Mix of US M7 + Indian IIM/ISB casebooks. |
| Aggregator (case-prep sites) | 35 | careerinconsulting.com (10), caseinterview.com (9), wallstreetoasis.com (7), theconsultingsociety.com (5), myconsultingcoach.com (4) — real PDFs hosted by case-prep aggregators. |
| S3 / CDN-hosted | 16 | Direct file URLs on AWS S3 / CloudFront from various casebook publishers. |
| US/EU B-school direct | 13 | wp.stolaf.edu (5), virginia.edu, kenan-flagler.unc.edu, etc. |
| Consulting firm direct | 12 | KPMG (5), McKinsey, BCG France, Oliver Wyman, Kearney, Accenture, Simon-Kucher, OC&C. |
| Indian B-school direct | 5 | caciitg.com (IIT-G KTC), bitsom.edu.in, iimv.ac.in (IIM Vizag), prometheus.xlri.ac.in. |
| Case competition direct | 5 | CFA Institute Past Champions (2), Mahindra War Room, BRANDSTORM 2025, Unstop API. |
| Other | 3 | |

## Failure breakdown (25 URLs, useful for future re-verification)

| Reason | Count | Notes |
|---|---|---|
| 4xx (auth/forbidden) | 11 | Mostly WAF blocks — McKinsey CDN, BCG site, Bain. Could be re-fetched with browser User-Agent in a follow-up. |
| Network/fetch failed | 6 | Likely timeouts or DNS issues. Worth a retry on the next pipeline run. |
| Not PDF (HTML viewer) | 5 | A few Issuu/Scribd-style URLs slipped past the filter. Skipped from extra_pdf_urls. |
| 5xx (server error) | 3 | Transient — worth retrying. |

## What the ingestion pipeline will do with these

1. The orchestrator (`scripts/ingest/index.ts`) reads `sources.json`. Both `sources` (open landing pages) and `extra_pdf_urls` (the 131 verified direct PDFs) are processed.
2. Each PDF is downloaded once, idempotently, into `casebooks/raw/`.
3. `pdf-parse` extracts text. `splitIntoCaseChunks()` splits on `Case N:` headers — typical casebooks have 15-50 cases each.
4. Groq Llama 3.1-8b extracts each case into structured JSON (title/industry/type/difficulty/problem_statement/interviewer_notes/ideal_structure).
5. Idempotent insert into Supabase. Re-runs skip duplicates by `(casebook_id, title)`.

## Top 10 highest-yield individual URLs

These are the casebooks expected to yield the most cases when ingested. Based on file size + known case counts from the underlying research:

1. `https://raw.githubusercontent.com/satyam-user/Consulting_Bot/main/Copy%20of%20IIMA%20Prep%20Book%202023-2024.pdf` — IIMA Prep Book 2023-24 (~75 cases reported)
2. `https://raw.githubusercontent.com/Saurya29/ConsultAi_Streamlit/main/data/Case-in-Point-2013.pdf` — Case in Point 2013 (~50 cases)
3. `https://www.wallstreetoasis.com/files/case-in-point-7th-edition1.pdf` — Case in Point 7th edition (~50+ cases)
4. `https://iimv.ac.in/uploads/Consulting_Casebook_2024-25.pdf` — IIM-V 2024-25 official
5. `https://www.bitsom.edu.in/wp-content/uploads/2024/03/BITSoM%20Casebook%202023-2024.pdf` — BITSoM 2023-24 official
6. `https://www.caciitg.com/ktc/Final%20Casebook.pdf` — IIT-G C&A KTC
7. `https://www.caciitg.com/ktc/KTC%202025%20Business%20Casebook.pdf` — IIT-G 2025
8. `https://prometheus.xlri.ac.in/static/media/XLRI_PM_Casebook_2024.3a6967361a2fc35743c5.pdf` — XLRI PM 2024
9. `https://careerinconsulting.com/wp-content/uploads/2019/12/6.-Wharton-Casebook-2017.pdf` — Wharton 2017
10. `https://careerinconsulting.com/wp-content/uploads/2019/12/8.-MIT-Sloan-Case-Book-2015.pdf` — MIT Sloan 2015

## Source research files

- `docs/research/github-casebooks.md` — GitHub repo enumeration
- `docs/research/direct-pdf-urls.md` — Google `filetype:pdf` discovery
- `docs/research/indian-bschool-casebooks.md` — IIM/ISB/XLRI/etc. per-school
- `docs/research/case-competition-briefs.md` — HULT/Brandstorm/KPMG ICC/etc.
- `docs/research/consulting-firm-cases.md` — McKinsey/BCG/Bain/etc. official
- `docs/research/alt-platform-sources.md` — Scribd/Issuu/SlideShare/Drive/etc. (mostly excluded from final list — viewer-only)

## Next step

Run the pipeline once Supabase + Groq credentials are in place:
```
npm run ingest:run
```
Throttled to ≤25 Groq calls/min. Expect 4-6 hours for full ingestion of all 131 PDFs. Idempotent — interruptable and resumable.
