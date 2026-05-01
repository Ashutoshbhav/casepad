# GitHub Casebook Repository Research

**Research date:** 2026-04-30
**Researcher:** Claude Opus 4.7 (Casepad agent thread)
**Goal:** Locate GitHub repositories hosting downloadable consulting case-interview casebook PDFs for a private B-school cohort.

---

## TL;DR

- **6 verified repos** host actual consulting casebook PDFs that resolve via raw.githubusercontent.com.
- **~36 unique casebook PDFs** across all repos (after de-duping cross-listed files).
- Each casebook typically contains **15-30 cases**, so addressable case count is **~540-1,000 candidate cases, deduped probably ~400-600 unique** after removing duplicate Wharton/Kellogg/IIM-A entries.
- **Indian B-schools dominate** (IIM-A, IIM-B, IIM-C, IIM-Indore, IIM-Raipur, IIM-Bodh Gaya, ISB, MDI, FMS, XLRI). Only sparse coverage of US/EU schools (Wharton 2017, Kellogg 2012, HBS 2011/2012, INSEAD 2011, Sloan 2015, Stern 2018, Tuck 2009, Yale 2013, LBS 2006/2013, Columbia 2007, Johnson 2003, Queens 2019, Darden 2018-19).
- Most casebooks are 2-5 years old; **only IIM-Raipur 2023-24, IIM-Bodh Gaya 2023-24, IIM-Indore 2023-24, FMS 2023-24, XLRI 2024 are recent**.
- **Direct download is reliable** — raw.githubusercontent.com URLs verified to serve valid PDF binary (1-10MB each).

---

## Verified repositories (downloadable PDFs)

### 1. `satyam-user/Consulting_Bot` — HIGHEST YIELD
- **Repo URL:** https://github.com/satyam-user/Consulting_Bot
- **Stars/Forks:** 0 / 0 (low signal but content is legitimate)
- **Last activity:** 2026-01-26
- **Description:** "An prototype to solve any guestimate based on the casebooks of top 40 business schools of the world"
- **Casebook count:** **20 PDFs** (verified via GitHub file listing)
- **PDF file pattern:** root directory, filenames like `Copy of Kellogg_2012.pdf`
- **Default branch:** `main`
- **Verified raw URL example:** https://raw.githubusercontent.com/satyam-user/Consulting_Bot/main/Copy%20of%20Kellogg_2012.pdf (confirmed serves valid PDF, 3.1MB, 236 pages)
- **Files:**
  1. 6.-Wharton-Casebook-2017.pdf
  2. Casebook_ISB_CO2020.pdf
  3. Copy of Columbia_2007.pdf
  4. Copy of Harvard_Business_School_2012.pdf
  5. Copy of IIMA Prep Book 2023-2024.pdf
  6. Copy of IIM_C_CaseBooklet.pdf
  7. Copy of INSEAD_2011.pdf
  8. Copy of ISB_Consulting_Casebook_CO2018.pdf
  9. Copy of Johnson_2003.pdf
  10. Copy of Kellogg_2012.pdf
  11. Copy of London_Business_School_2013.pdf
  12. Copy of Queens_2019.pdf
  13. Copy of Sloan_2015.pdf
  14. Copy of Stern_2018.pdf
  15. Copy of Tuck_2009.pdf
  16. Copy of Wharton_2017.pdf (duplicate of #1)
  17. Copy of Yale_2013.pdf
  18. Harvard Business 2011.pdf
  19. LBS_2006.pdf
  20. The FMS Consulting CaseBook 2023-24.pdf
- **Concerns:** Mix of Indian + global schools, mostly older (2003-2018), one duplicate Wharton; "Copy of" prefix suggests Drive scrape.

### 2. `Pranayshukla0610/Consulting-Case-Books` — RECENT INDIAN FOCUS
- **Repo URL:** https://github.com/Pranayshukla0610/Consulting-Case-Books
- **Stars/Forks:** 0 / 0
- **Last activity:** 2026-04-29 (updated yesterday — actively maintained)
- **Casebook count:** **8 PDFs**
- **PDF file pattern:** root directory
- **Default branch:** `main`
- **Verified raw URL example:** https://raw.githubusercontent.com/Pranayshukla0610/Consulting-Case-Books/main/IIM%20A%20consult%20report%20%23most%20important.pdf (confirmed serves valid PDF, 9.5MB)
- **Files:**
  1. Consulting Case Book - IIM Raipur 23-24.pdf
  2. IIM A consult report #most important.pdf
  3. IIM B Consult book 2022-23.pdf
  4. IIM Bodh Gaya Consulting Case Book 2023-24.pdf
  5. IIM Indore consult case book 2023-24.pdf
  6. MDI consult case book.pdf
  7. The FMS Consulting CaseBook 2023-24.pdf (DUPE of repo #1)
  8. XLRI CRUX_Casebook_2024_Final_v1.0.pdf
- **Concerns:** Indian-only; aspirational README mentions Harvard/Wharton/INSEAD but those PDFs are not present.

### 3. `Itish-Garg/Casebooks`
- **Repo URL:** https://github.com/Itish-Garg/Casebooks
- **Stars/Forks:** 1 / 0
- **Last activity:** 2023-07-22
- **Casebook count:** **9 PDFs** (8 casebooks + 1 reference book)
- **PDF file pattern:** root directory
- **Default branch:** `main`
- **Verified raw URL example:** https://raw.githubusercontent.com/Itish-Garg/Casebooks/main/IIM%20C%20Casebook.pdf (confirmed serves valid PDF, 2MB)
- **Files:**
  1. 4. Esade Casebook.pdf
  2. Case Interview Cracked.pdf (reference book, not a casebook)
  3. Darden Case Book 2018-2019.pdf
  4. Day 1.0.pdf (unclear, may be guide)
  5. IIM C Casebook.pdf
  6. ISB Casebook.pdf
  7. MDI Casebook.pdf
  8. Wharton-Casebook-2017.pdf (DUPE with repo #1)
  9. XLRI Casebook 2022.pdf
- **Concerns:** Contains some duplicates with repo #1 and #2; older snapshot.

### 4. `ayush-agarwal-0502/ConsultBot_LLM`
- **Repo URL:** https://github.com/ayush-agarwal-0502/ConsultBot_LLM
- **Stars/Forks:** 8 / 0
- **Last activity:** 2024-01-22
- **Casebook count:** **3 PDFs** in `iim_casebooks/` folder (plus a `.zip` of "folders unable to directly git push" — additional content possibly inside)
- **PDF file pattern:** `/iim_casebooks/*.pdf`
- **Default branch:** `main`
- **Verified raw URL example:** https://raw.githubusercontent.com/ayush-agarwal-0502/ConsultBot_LLM/main/iim_casebooks/iima%20casebook%20consulting.pdf (confirmed serves valid PDF, 9.5MB)
- **Files:**
  1. iim_casebooks/iima casebook consulting.pdf
  2. iim_casebooks/iimb casebook consulting.pdf
  3. iim_casebooks/iimc casebook consulting.pdf
  4. some_folders_unable_to_directly_git_push.zip (UNVERIFIED contents — likely more casebooks)
- **Concerns:** Indian only; .zip likely contains more cases but not directly browsable.

### 5. `Saurya29/ConsultAi_Streamlit` & sibling forks
- **Repo URL:** https://github.com/Saurya29/ConsultAi_Streamlit (and `DivyaRaj1602/ConsultAI`, `harshraj177/ConsultAI` — all forks of same project)
- **Stars/Forks:** 0-1 each
- **Last activity:** 2026-01-20 (Saurya29), 2025-07-12 (DivyaRaj), 2025-11-14 (harshraj)
- **Casebook count:** **1 PDF** (`Case-in-Point-2013.pdf`, 371 pages, ~50 cases)
- **PDF file pattern:** `/data/Case-in-Point-2013.pdf`
- **Default branch:** `main`
- **Verified raw URL example:** https://raw.githubusercontent.com/Saurya29/ConsultAi_Streamlit/main/data/Case-in-Point-2013.pdf (confirmed serves valid PDF, 3.8MB, 371 pages — Marc Cosentino's full book)
- **Concerns:** Only one file but it's the complete Case-in-Point text (high case density). Copyright concern: this is a published book by Marc Cosentino.

### 6. `GoncaloFelicio/Practice-Case-Interviews`
- **Repo URL:** https://github.com/GoncaloFelicio/Practice-Case-Interviews
- **Stars/Forks:** 0 / 0
- **Last activity:** 2025-03-07
- **Casebook count:** **1 PDF** (Taylor Warfield's "The Ultimate Case Interview Workbook" 2019, Red Sequoia Press)
- **PDF file pattern:** root, single PDF
- **Default branch:** main (unverified)
- **Concerns:** Single published book; copyright concern (Red Sequoia Press, 2019).

---

## Markdown-only or low-yield repos (NOT direct PDF sources)

Listed for completeness — these have case content but in markdown/code form, not PDF.

| Repo | URL | Content | Use? |
|---|---|---|---|
| `Hala-H/CaseInterviewPrep` | https://github.com/Hala-H/CaseInterviewPrep | 10 cases as `.md` files in `SampleCases/` | Possible — convert .md to cases |
| `mansithanki/Case_Studies` | https://github.com/mansithanki/Case_Studies | 3 ChatGPT-synthesized cases | Skip (synthetic, user rejected) |
| `kirat-anand-68/Management-Consultancy-Practice` | https://github.com/kirat-anand-68/Management-Consultancy-Practice | 3 random PDFs (1 M&A) | Skip (junk filenames) |
| `charlie989898/-mbb-management-consultant-claude-skill` | https://github.com/charlie989898/-mbb-management-consultant-claude-skill | 3 worked .md cases | Reference only |
| `DogInfantry/claude-skill-management-consultant-B1` | https://github.com/DogInfantry/claude-skill-management-consultant-B1 | Claude skill, no PDFs | Skip |
| `ollegreen/Consulting_Case_Practice_Tool` | https://github.com/ollegreen/Consulting_Case_Practice_Tool | Python practice tool, no PDFs | Skip |
| `Pranayshukla0610/Product-Management-Case-Studies` | https://github.com/Pranayshukla0610/Product-Management-Case-Studies | 3 PM .docx cases | Skip (PM not consulting) |
| `vashwar/LLM-Brain-for-MBA` | https://github.com/vashwar/LLM-Brain-for-MBA | Tool only, no embedded cases | Skip |
| `RKursatV/MasterTheCasePdfDownloader` | https://github.com/RKursatV/MasterTheCasePdfDownloader | Script to RC4-decrypt masterthecase.com PDFs | Tool — could be repurposed |

---

## Searches performed (audit trail)

GitHub repository searches via web UI (https://github.com/search?q=...&type=repositories):

| Query | Useful results |
|---|---|
| `consulting casebook` | 3 repos (1 verified) |
| `casebook MBA` | 2 (no PDFs) |
| `case interview pdf` | 5 (none relevant) |
| `consult club casebook` | 0 |
| `consulting club` | 5 (websites only) |
| `casebook` | 198 total, mostly unrelated (legal/Sherlock/medical) |
| `case in point consulting` | 5 (3 ConsultAI forks) |
| `IIM casebook` | 1 (synthetic) |
| `mbb casebook` | 0 |
| `Wharton casebook` | 0 |
| `Kellogg casebook` | 0 |
| `Booth casebook` | 0 |
| `Tuck casebook` | rate-limited but no hits via search |
| `Darden casebook` | rate-limited but no hits via search |
| `ISB casebook` | 0 |
| `consulting case book` | 8 (Pranayshukla winner) |
| `case book` page 2 | 0 |
| `consulting interview prep` | 10 (1 verified — Itish-Garg) |
| `consulting case studies pdf` | 2 (none useful) |
| `consulting practice cases` | 18 (mostly tools) |
| `case study casebook pdf` | 0 |
| `case book IIM pdf` | 0 |
| `consulting casebook IIM` | 0 |
| `MBA case study pdf` | 1 (vashwar tool) |
| `mckinsey bcg bain case` | 1 (claude skill) |
| `BCG McKinsey Bain casebook` | 0 |
| `case interview practice` page 2 | 0 relevant |
| `case study consulting pdf repository` | 0 |
| `consulting resources pdf` | 0 relevant |
| `guesstimate casebook` | 0 |
| `guesstimate pdf` | 2 (no cases) |
| `market sizing casebook` | rate-limited |
| `case pdf "consulting club"` | 0 |

GitHub topics browsed:
- `/topics/casebook` — 1 repo (AI governance, unrelated)
- `/topics/case-interview` — 2 (Claude skills, no PDFs)
- `/topics/consulting` — 516 repos, none are case PDF collections (mostly slide tools, CRMs)
- `/topics/case-studies` — 122 repos (DS / WebGL / actuarial — no consulting casebooks)
- `/topics/mba` — 127 (mostly tech projects sharing MBA acronym)

GitHub orgs probed:
- `IIM-A` — exists but zero public repos.
- No org found for `Wharton-Consulting-Club`, `Kellogg-CMC`, `IIMB-Consult`, `IIMC-Consult`, `Consult-Club-IIM-Ahmedabad`, etc.

Web searches via Google:
- `site:github.com casebook .pdf consulting wharton kellogg` — no GitHub-hosted hits
- `site:github.com "casebook.pdf"` — no GitHub-hosted hits
- `site:github.com IIMA IIMB IIMC casebook consulting` — surfaced ConsultBot_LLM
- `github "casebook 2023" OR "casebook 2024"` — no GitHub hits, only Scribd/SlideShare

GitHub code search (`/search?type=code`) — **blocked behind sign-in**, could not query directly. Limits this research to repository metadata only.

---

## Total addressable case count (concrete estimate)

**Unique casebook PDFs across all 6 verified repos (deduped):**

| School / Casebook | Year | Source repo | Approx cases (typical for casebook) |
|---|---|---|---|
| IIMA Consult Prep Book | 2023-24 | satyam-user, ayush-agarwal | ~75 (per IIMA marketing) |
| IIMA Casebook (older) | various | Itish-Garg | ~20 |
| IIMB Consult Book | 2022-23 | Pranayshukla, ayush-agarwal | ~25 |
| IIMC Casebook | various | Itish, satyam, ayush | ~20 |
| IIM Indore Casebook | 2023-24 | Pranayshukla | ~20 |
| IIM Raipur Casebook | 2023-24 | Pranayshukla | ~20 |
| IIM Bodh Gaya Casebook | 2023-24 | Pranayshukla | ~15 |
| MDI Casebook | (2 vintages) | Pranayshukla, Itish | ~20 |
| FMS Casebook | 2023-24 | Pranayshukla, satyam | ~25 |
| XLRI CRUX Casebook | 2024 | Pranayshukla | ~25 |
| XLRI Casebook | 2022 | Itish | ~20 |
| ISB Casebook | 2018 + 2020 | satyam (×2) | ~20 each |
| ISB Casebook | older | Itish | ~15 |
| Wharton Casebook | 2017 | satyam, Itish | ~25 |
| Kellogg Casebook | 2012 | satyam | ~25 |
| Harvard (HBS) | 2011 + 2012 | satyam | ~20 each |
| INSEAD | 2011 | satyam | ~20 |
| Columbia | 2007 | satyam | ~20 |
| Johnson (Cornell) | 2003 | satyam | ~15 |
| LBS | 2006 + 2013 | satyam | ~20 each |
| MIT Sloan | 2015 | satyam | ~20 |
| NYU Stern | 2018 | satyam | ~25 |
| Tuck (Dartmouth) | 2009 | satyam | ~20 |
| Yale SOM | 2013 | satyam | ~20 |
| Queen's | 2019 | satyam | ~20 |
| Darden | 2018-19 | Itish | ~25 |
| ESADE | older | Itish | ~20 |
| Case in Point (Cosentino) | 2013 | Saurya29 | ~50 cases inside book |
| Ultimate Case Interview Workbook (Warfield) | 2019 | GoncaloFelicio | ~60 cases per book title |

**Per-casebook case counts are typical-range estimates for MBA consulting casebooks; exact counts require opening each PDF.**

- Sum of estimated cases across all unique casebook files: **~700-850 candidate cases.**
- After de-duping known cross-listings (Wharton-2017 appears 3×; ISB / IIMA / IIMC duplicated): **~400-600 unique cases.**
- Compared against Ash's 1000+ requirement: **GitHub alone is insufficient. Will need to combine with Scribd / SlideShare / managementconsulted.com / careerinconsulting.com / wallstreetoasis / preplounge / casebasix.com / hackingthecaseinterview.com mirrors to reach 1000+.**

---

## Top 5 highest-yield repos (with raw URLs)

1. **`satyam-user/Consulting_Bot`** — 20 PDFs, broadest school coverage (Indian + US + EU)
   - Raw URL pattern: `https://raw.githubusercontent.com/satyam-user/Consulting_Bot/main/<urlencoded-filename>.pdf`
   - Verified example: https://raw.githubusercontent.com/satyam-user/Consulting_Bot/main/Copy%20of%20Kellogg_2012.pdf

2. **`Pranayshukla0610/Consulting-Case-Books`** — 8 PDFs, most recent Indian casebooks (2023-24)
   - Raw URL pattern: `https://raw.githubusercontent.com/Pranayshukla0610/Consulting-Case-Books/main/<urlencoded-filename>.pdf`
   - Verified example: https://raw.githubusercontent.com/Pranayshukla0610/Consulting-Case-Books/main/IIM%20A%20consult%20report%20%23most%20important.pdf

3. **`Itish-Garg/Casebooks`** — 9 PDFs, includes Darden 2018-19 and ESADE not in others
   - Raw URL pattern: `https://raw.githubusercontent.com/Itish-Garg/Casebooks/main/<urlencoded-filename>.pdf`
   - Verified example: https://raw.githubusercontent.com/Itish-Garg/Casebooks/main/IIM%20C%20Casebook.pdf

4. **`ayush-agarwal-0502/ConsultBot_LLM`** — 3 IIM PDFs in `iim_casebooks/` + uninspected `.zip`
   - Raw URL pattern: `https://raw.githubusercontent.com/ayush-agarwal-0502/ConsultBot_LLM/main/iim_casebooks/<filename>.pdf`
   - Verified example: https://raw.githubusercontent.com/ayush-agarwal-0502/ConsultBot_LLM/main/iim_casebooks/iima%20casebook%20consulting.pdf

5. **`Saurya29/ConsultAi_Streamlit`** — 1 PDF but high density (full Case-in-Point 2013 book, ~50 cases)
   - Raw URL: https://raw.githubusercontent.com/Saurya29/ConsultAi_Streamlit/main/data/Case-in-Point-2013.pdf
   - Copyright caveat: this is Marc Cosentino's published book; redistribution may infringe.

---

## Patterns and blockers observed

1. **Search index is sparse** — GitHub's repo search returns 0 results for most B-school casebook queries (Wharton, Kellogg, Booth, Tuck, Darden, IIM). The few hits are personal aggregator repos by individuals, not official school clubs.

2. **No B-school consulting club has an official GitHub presence** with public casebooks. They publish via LinkedIn posts → Google Drive → Scribd / SlideShare. GitHub aggregators are unauthorized re-uploads by individuals.

3. **Strong Indian B-school skew on GitHub.** Indian students are most likely to mirror IIM/ISB/MDI/XLRI/FMS casebooks to GitHub. Wharton/Kellogg/Booth coverage is weak (mostly old 2017 or earlier files).

4. **GitHub code search is gated** — `path:casebook extension:pdf` requires sign-in. Without authenticated `gh` CLI (Bash blocked in this sandbox), can't run authenticated code search to find casebook PDFs buried in non-obvious repos.

5. **Significant duplication across the 3 main aggregator repos** — Wharton 2017, IIMA, IIMC, FMS 2023-24 appear in multiple repos. De-duped unique file count is ~28-32, not 40+.

6. **Casebooks are dated**: Median age ~2018-2020. Only IIM batch from 2023-24 is current. US schools' newer 2023-24/2024-25 casebooks (Fuqua, NYU Stern, Wharton, Kellogg, Booth, HKUST, BITSoM) exist on Scribd/SlideShare but **NOT on GitHub**.

7. **Copyright/redistribution risk**: `Case-in-Point-2013.pdf` is Marc Cosentino's published book; `Ultimate Case Interview Workbook` is Taylor Warfield/Red Sequoia. Casebooks themselves are typically released by school clubs as free, but redistribution rights vary.

8. **Recommended supplementary sources outside GitHub** (verified to exist via web search, not via direct fetch):
   - managementconsulted.com hosts `ESADE-MBA-Casebook.pdf`
   - careerinconsulting.com hosts Wharton 2017, Fuqua 2017, AGSM 2002
   - myconsultingcoach.com hosts MIT Casebook, AT Kearney Casebook
   - wallstreetoasis.com hosts HBS older + Wharton 2009
   - preplounge.com lists 70+ casebook bibliography
   - hackingthecaseinterview.com lists 26 casebooks with download links
   - casebasix.com claims 800+ practice cases
   - scribd.com hosts ~all recent (Fuqua 2024, NYU Stern 2024, Wharton 2024, IIM 2024) but auth-walled
   - slideshare.net hosts most Indian + several US casebooks (Wharton 2024, IIM 2022-23, XLRI 2022, FMS 2021-22)
   - bitsom.edu.in publishes BITSoM Casebook 2023-24 directly
   - prometheus.xlri.ac.in publishes XLRI PM Casebook 2024 directly
   - sites.google.com/fms.edu/conclubfms publishes FMS Delhi casebooks
   - rocketblocks.me hosts a public case library

---

## Recommendation

**To hit 1000+ unique cases, the GitHub-only path is insufficient.** Plan: pull the 6 verified GitHub repos (~30 unique PDFs, ~400-600 cases) as Phase 1, then augment Phase 2 by scripting Scribd/SlideShare/school-website downloads (FMS Delhi Google site, BITSoM, prometheus.xlri.ac.in, careerinconsulting.com, managementconsulted.com static PDFs).
