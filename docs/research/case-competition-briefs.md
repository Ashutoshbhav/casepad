# Case Competition Past Briefs — Research Findings

**Date compiled:** 2026-04-30
**Goal:** Identify verified PDF/archive sources of past case competition briefs to seed the casepad corpus (target: 1000+ real consulting cases for B-school cohort).

## Verification methodology & limitations

- **WebSearch** (Google index) was used to discover URLs and confirm document presence on third-party platforms.
- **WebFetch was DENIED in this environment** — direct HTTP-level URL verification (PDF content-type, 200 response) could NOT be performed by this agent. URLs below are flagged as **SEARCH-CONFIRMED** when search results explicitly identify the asset as a downloadable PDF on Scribd / SlideShare / official sponsor CDN. They are flagged **OFFICIAL CDN** when hosted on the sponsor's own domain (highest trust). Ash should run a quick `curl -I` pass before bulk-ingesting.
- "NOT FOUND" entries reflect: nothing on Google index after multi-angle queries (filetype:pdf, site:, "past brief", "archive", brand-name + year combinations).

---

## High-yield aggregator sources (process these first)

| Source | What it has | Access notes |
|---|---|---|
| **Scribd** | Hundreds of competition brochures (ITC Interrobang S2/S3/S5/S14/S15, P&G CEO Challenge 2020/2021/2022 India + APAC, L'Oreal Brandstorm 2014/2023/2025-26, Hult Prize 2022/2023/2024, Asian Paints CANVAS, KICC Malaysia 2018, Reckitt Career Compass 2024, Harvard ICC briefs) | Requires Scribd account; PDFs downloadable. Highest single source by yield. |
| **SlideShare** | Past competition decks + some briefs (Mahindra War Room 2012/2018, Nestle 4Ps 2018, Asian Paints CANVAS 2018, ITC Interrobang multi-season, Wharton 2015 Challenge, Reckitt Benckiser case) | Free download with login. Decks are SOLUTIONS not briefs — useful for golden-answer exemplars. |
| **Unstop (formerly Dare2Compete)** | Live + archived competition pages with attachment PDFs via `api.unstop.com/api/competition/get-attachment/...` | Many pages need cookies/login; attachment URLs sometimes direct. |
| **PDFCoffee** | Mirrors of Scribd/SlideShare PDFs (ITC Interrobang S2 etc.) | Free, no login, but quality varies. |
| **Studocu** | Academic uploads of briefs (Interrobang S13, S15) | Free with account/uni email. |
| **InsideIIM** | Case-prep articles + winner interviews; occasional brief links | Free. Editorial — better as context than source. |
| **CFA Institute (official)** | Winning research reports as PDFs on official CDN — annual archive | OFFICIAL — highest trust. |
| **assets.kpmg.com** | Some KICC editions hosted on KPMG CDN (2016-17 India, 2018-19 India, 2018 Malaysia) | OFFICIAL CDN — highest trust. |
| **HBS / MIT Sloan / Wharton official sites** | Past finalist write-ups (NOT briefs themselves) + case-collection libraries (open-access for MIT Sloan since 2009) | Mixed — finalist pages are PR, not briefs. |

---

## Per-competition results

### HULT Prize
- **2024 brief — UNLIMITED:** https://www.scribd.com/document/693926177/hult-prize-2024-challenge-unlimited — SEARCH-CONFIRMED PDF on Scribd (also mirror at /document/697553746)
- **2024-25:** https://www.scribd.com/document/819587142/Hult-Prize-2024-2025 — SEARCH-CONFIRMED PDF on Scribd
- **2023 brief — Sustainable Fashion / RMG industry:** https://www.scribd.com/document/624104287/2023-hult-prize-challenge — SEARCH-CONFIRMED PDF on Scribd
- **2022 brief — Getting the World Back to Work:** https://www.scribd.com/document/600644763/Call-to-Action — SEARCH-CONFIRMED PDF on Scribd (titled "Hult Prize 2022: Call to Action Overview")
- **2021 brief — Food for Good:** No standalone PDF surfaced; theme/synopsis on competitioninfo.com only — PARTIAL
- **2020 brief — Bold Business Better Planet (Earth):** No PDF; theme described on opportunitydesk/mladiinfo — PARTIAL
- **2019 brief — Youth Unemployment:** No PDF surfaced — NOT FOUND as standalone brief
- **General archive page:** https://www.hultprize.org/ + https://www.hult.edu/hflc/past-winners/ — winner narratives, not briefs

### Mahindra War Room
- **Season 9 (2018):** https://ximb.edu.in/wp-content/uploads/2020/05/mahindra-war-room18.pdf — OFFICIAL CDN (Xavier Institute hosted)
- **Season 8 / earlier — Solar EPC case (2012 Grand Finale, IIM Ranchi):** https://www.slideshare.net/tarunramgupta/mwr2012-grand-finale — SEARCH-CONFIRMED, but solution deck not brief
- **General presentation:** https://www.slideshare.net/alphabravo12/mahindra-war-room — SEARCH-CONFIRMED
- **Note:** Mahindra War Room SPONSOR doesn't publish a centralized archive. Briefs leak via campus winner submissions. Most material on web is solution decks, not briefs.
- **Different MWR (Mahindra Transport Excellence Award "MPower War Room"):** https://www.mahindratransportawards.com/pdf/War-Room-2.pdf — OFFICIAL CDN (separate program — flag for use carefully)

### L'Oreal Brandstorm
- **2025-26 Official Rules / Brief:** https://www.tvz.hr/wp-content/uploads/2025/01/BRANDSTORM-2025-OFFICIAL-RULES.pdf — OFFICIAL university CDN mirror
- **2025-26 Official Rules (CDN):** https://d32gkk464bsqbe.cloudfront.net/activities/o/BRANDSTORM_2025_OFFICIAL_RULES.pdf — OFFICIAL Brandstorm CDN
- **2026 mission doc (Unstop mirror):** https://www.scribd.com/document/952741078/L-Ore-al-Brandstorm-2026-2025-1591401-Unstop — SEARCH-CONFIRMED PDF
- **2023 mission doc — Crack the New Codes of Beauty:** https://www.scribd.com/document/634058494/Brandstorm-2023-Mission-Document — SEARCH-CONFIRMED PDF
- **2014 case — Lancome Travel Retail:** https://www.scribd.com/document/253736186/LOreal-Brandstorm-2014-Case-Study-pdf — SEARCH-CONFIRMED PDF
- **2019 deck:** https://www.slideshare.net/slideshow/loral-brandstorm-2019/231905945 — SEARCH-CONFIRMED (solution, not brief)
- **Official site (current only):** https://brandstorm.loreal.com/en — current edition mission only, no archive

### Reckitt Reckoner / Reckitt Global Challenge
- **Reckitt Career Compass 2024:** https://www.scribd.com/presentation/754822113/Reckitt-Career-Compass-Case-Competition-2024 — SEARCH-CONFIRMED PDF
- **Reckitt Global Challenge 2023 platform page:** https://xathon.mettl.com/event/ReckittGlobalChallenge2023 — registration portal, not brief
- **Reckitt Global Challenge 2022 (Unstop):** https://unstop.com/competitions/reckitt-global-challenge-2022-reckitt-404224 — competition page, brief behind login
- **Reckitt Global Challenge 2023 (Unstop):** https://unstop.com/competitions/reckitt-global-challenge-2023-reckitt-743372 — competition page
- **Reckitt Benckiser case (Student Village deck):** https://www.slideshare.net/slideshow/reckitt-benckiser-case-study-by-student-village/51048100 — SEARCH-CONFIRMED solution deck
- **NOTE:** "Reckitt Reckoner" specifically did NOT surface — likely Ash means the Reckitt Global Challenge / Career Compass family. Sponsor doesn't publish a public brief archive.

### ITC Interrobang
- **Season 15 brochure:** https://www.scribd.com/document/896913707/Interrobang-Season-15-Case-Challenge-Information-Brochure — SEARCH-CONFIRMED PDF
- **Season 14 brochure:** https://www.scribd.com/document/755823301/Information-Brochure-Interrobang-14 — SEARCH-CONFIRMED PDF
- **Season 13 brochure (Studocu):** https://www.studocu.com/in/document/vishnu-institute-of-technology/mechanical-vibrations/interrobang-season-13-case-challenge-information-230829-124955/71638671 — SEARCH-CONFIRMED
- **Season 8 (2018) marketing case:** https://www.slideshare.net/slideshow/itc-interrobang-season-8-marketing-case-competition-2018-doc/157510365 — SEARCH-CONFIRMED PDF
- **Season 5 brochure:** https://www.scribd.com/document/272757365/ITC-Interrobang-Season-5-MKTG-Case-Challenge-Brochure-pdf — SEARCH-CONFIRMED PDF
- **Season 3 brochure:** https://www.scribd.com/document/160801556/ITC-Interrobang-Season-3-Case-Challenge-Brochure-1-pdf — SEARCH-CONFIRMED PDF
- **Season 2 brochure:** https://www.scribd.com/doc/105233233/ITC-Interrobang-Season-2-Case-Challenge-Brochure — SEARCH-CONFIRMED PDF (mirror at pdfcoffee.com/itc-interrobang-season-2-case-challenge-brochure-pdf-free.html)
- **Generic brochure:** https://www.scribd.com/document/595221678/Case-Challenge-Information-Brochure — SEARCH-CONFIRMED PDF
- **Official portal:** https://www.itcportal.com/careers/interrobang/index.aspx — current edition only
- **VERDICT: ITC Interrobang has the deepest archive on Scribd — Seasons 2/3/5/8/13/14/15 all available.**

### Tata Crucible (Business Quiz, NOT case comp — flagged)
- **Tata Crucible Chennai Q&A:** https://www.scribd.com/document/73268403/TATA-Crucible-Quiz-Chennai — SEARCH-CONFIRMED PDF
- **Best of Tata Crucible compilation (2006-2009, 421 Qs):** https://www.slideshare.net/slideshow/best-of-tata-crucible/27009895 — SEARCH-CONFIRMED
- **Corporate Quiz 2013 Gurgaon:** https://www.slideshare.net/slideshow/tata-crucible-corporate-quiz-2013-gurgaon/26204016 — SEARCH-CONFIRMED
- **Noida edition:** https://www.scribd.com/document/433265224/Tata-crucible-corporate-quiz-Noida — SEARCH-CONFIRMED
- **Prep guide:** https://www.scribd.com/document/60460414/How-to-Prepare-for-Tata-Crucible — SEARCH-CONFIRMED
- **Official:** https://www.tatacrucible.com/
- **CAVEAT:** This is a quiz competition, not a consulting case competition. Useful for trivia/business-current-affairs corpus but does NOT belong in case-prep cohort unless the app has a quiz mode.

### Tata Steel Mindrush
- **NO PUBLIC ARCHIVE FOUND.** Mindrush as named did not surface. Tata Steel does run Steel-a-thon (https://www.tatasteel.com/careers/campus-connect/steel-a-thon/) and QUEERious — neither has open brief archive.
- **Skip — sponsor doesn't release.**

### Aditya Birla — "The Stage"
- **NO MATCH for "The Stage" specifically.** Aditya Birla's actual flagship case competition is **Stratos** (and **HeadStaRt**).
- **Stratos 2025:** https://unstop.com/competitions/aditya-birla-group-stratos-2025-aditya-birla-group-1525312 — comp page, brief behind login
- **Stratos 2024:** https://unstop.com/competitions/aditya-birla-group-stratos-2024-aditya-birla-group-1026121
- **Stratos 2023:** https://unstop.com/competitions/aditya-birla-group-stratos-2023-aditya-birla-group-699830
- **Stratos 2022:** https://unstop.com/competitions/aditya-birla-group-stratos-2022-aditya-birla-group-380810
- **HeadStaRt 2025:** https://unstop.com/competitions/aditya-birla-group-headstart-2025-aditya-birla-group-1525277
- **VERDICT:** Briefs exist behind Unstop login (only ABG-empaneled 14 B-schools historically). No public PDFs surfaced. Possibly extractable via Unstop API attachment endpoint (see SPIT 2020 example below).

### HUL LIME (Lessons in Marketing Excellence)
- **Official rules portal:** http://limeonline.org/rules/ — Ash should fetch directly; per Quora answer, "all case briefs and mentor video clips can be downloaded from the L.I.M.E. website"
- **Season 11 rule book:** https://www.powershow.com/view0/8eabbe-NDA2M/L_I_M_E_Lessons_in_Marketing_Excellence_Season_11_Rule_Book_1_powerpoint_ppt_presentation — SEARCH-CONFIRMED PPT
- **Sociomark case study (LIME branding):** https://www.sociomark.in/case-study/lime — context only
- **YouTube case launches** (Seasons 15/16/17 found): video format, transcribable but not PDF
- **VERDICT:** Official LIME site is the canonical source. Worth direct scraping via HTTP client.

### P&G CEO Challenge
- **2021-22 India case (oral hygiene):** https://www.scribd.com/document/531393866/Procter-Gamble-P-G-CEO-Challenge-2021-2022-Online-Case-Study-INDIA — SEARCH-CONFIRMED PDF
- **2021-22 Asia Pacific case:** https://www.scribd.com/document/563300689/Procter-Gamble-P-G-CEO-Challenge-2021-2022-Online-Case-Study-ASIA-PACIFIC-PDF — SEARCH-CONFIRMED PDF
- **2020 overview:** https://www.scribd.com/document/495416601/P-G-CEO-Challenge-2020 — SEARCH-CONFIRMED PDF
- **2020 Key Dates / FAQ:** https://www.scribd.com/document/481411871/PG — SEARCH-CONFIRMED PDF (Head & Shoulders / haircare market)
- **PDFCoffee mirror:** https://pdfcoffee.com/pampg-11-pdf-free.html — SEARCH-CONFIRMED
- **Official APAC site:** https://apac.pg-ceochallenge.com/
- **Official global:** https://www.pg-ceochallenge.com/
- **VERDICT:** Strong Scribd coverage for 2020-2022. 2023/2024 briefs not surfaced openly.

### CFA Institute Research Challenge
- **2024 Winning Report (University of Waterloo):** https://www.cfainstitute.org/sites/default/files/-/media/documents/support/research-challenge/challenge/rc-2024-winning-written-report-university-of-waterloo.pdf — OFFICIAL CDN
- **Past Champions index:** https://www.cfainstitute.org/insights/events/research-challenge/past-champions — OFFICIAL — links to PDFs of every regional + global winning report (multi-year archive)
- **CFA Society Switzerland past reports:** https://cfasocietyswitzerland.org/partners/universities/cfa-institute-research-challenge/cfa-institute-research-challenge-20202021/student-resources-past-reports/ — OFFICIAL local society archive
- **Written Report Guidelines:** https://www.cfainstitute.org/sites/default/files/-/media/documents/support/research-challenge/challenge/rc-written-report-guidelines.pdf — OFFICIAL CDN
- **CliffsNotes example:** https://www.cliffsnotes.com/study-notes/7244871
- **VERDICT:** CFA Institute is the GOLD STANDARD source. Official CDN, multi-year archive of winning equity research reports, completely free. Highest-yield single competition.

### KPMG International Case Competition (KICC)
- **KICC 2016-17 India:** https://assets.kpmg.com/content/dam/kpmg/in/pdf/2016/12/KICC-2016-17.pdf — OFFICIAL CDN
- **KICC 2018-19 India:** https://assets.kpmg.com/content/dam/kpmg/in/pdf/2018/10/KICC-2018-19.pdf — OFFICIAL CDN
- **KICC Malaysia National 2018 Guide:** https://assets.kpmg.com/content/dam/kpmg/my/pdf/External/KPMG%20International%20Case%20Competition%20KICC%20Malaysia%20National%202018%20Guide-new.pdf — OFFICIAL CDN
- **KICC Kazakhstan 2018 report:** https://kpmg.com/kz/en/home/insights/2018/04/kiccreport2018.html
- **Official portal:** https://kicc.kpmg.com/
- **VERDICT:** KPMG hosts country-level KICC PDFs on assets.kpmg.com. Worth scripting a recursive crawl across KPMG country domains.

### Deloitte Maverick / Deloitte National Case Competition
- **2017 (Unstop):** https://unstop.com/competitions/graduate-school-maverick-2017-deloitte-consulting-llp-60927 — competition page
- **Deloitte Case Competition 2013 deck:** https://www.slideshare.net/ryanamenges/deloitte-slides-display — SEARCH-CONFIRMED solution
- **Maverick solution decks:** https://www.slideshare.net/ramneesh1/deloitte-case-solution-maverick — SEARCH-CONFIRMED solution
- **Aerospace/Defense Maverick deck:** https://www.scribd.com/document/96932001/Deloitte-Case-Competition — SEARCH-CONFIRMED PDF
- **Deloitte Consulting Case Competition deck:** https://www.slideshare.net/slideshow/deloitte-consulting-case-competition/59608225 — SEARCH-CONFIRMED
- **NOTE:** Most assets are STUDENT SOLUTION DECKS, not original briefs. Deloitte does not publish a public brief archive.

### PwC Challenge / PwC xTAX
- **PwC Challenge official page:** https://www.pwc.com/us/en/careers/university-relations/challenge-case-study.html — overview only
- **2015 Challenge case "Pandemonium Technologies" deck:** https://www.slideshare.net/JohnBarrasso/pwc-2015-challenge-case-competition-the-dividenders — SEARCH-CONFIRMED
- **xTAX info (FIU):** https://business.fiu.edu/students/case-competitions/pwc-xtax.cfm
- **PSU Penn State info:** https://www.ist.psu.edu/events/pwc-challenge-case-competition
- **VERDICT:** PwC does NOT release briefs publicly. Cases distributed campus-by-campus under NDA. Only solution decks leak. **Low yield.**

### Cornell Hospitality Case Competition
- **CHR Research Briefs library (Cornell eCommons):** https://ecommons.cornell.edu/collections/1941e0e9-b3ca-4fc5-84c9-f43a59362b9f — OFFICIAL — research briefs (academic, not competition briefs)
- **Sample CHR Report PDF:** https://ecommons.cornell.edu/bitstreams/8870ad6b-0e73-4e9c-a4f9-9026fdb1e09a/download — OFFICIAL
- **Case Competitions collection:** https://ecommons.cornell.edu/entities/publication/78d218a6-2fb0-4781-b5b8-3742cc2bb993 — OFFICIAL collection page
- **Hospitality Business Plan Competition:** https://career.cornell.edu/experiences/hospitality-business-plan-competition/ — overview only
- **VERDICT:** Cornell has a CHR research-briefs library on eCommons (open access). These are research papers, not competition briefs — but valuable as hospitality case material. The actual case-comp briefs themselves are not openly archived.

### MIT Sloan Case Competition
- **MIT Sloan Sports Analytics — First Pitch Case Competition:** https://www.sloansportsconference.com/first-pitch-case-competition — overview, past briefs not posted
- **MIT Sloan open case library (free CC-licensed):** https://mitsloan.mit.edu/teaching-resources-library/case-studies — OFFICIAL — full open-access case library since 2009. Not competition briefs but academic cases.
- **MIT Sloan Casebook 2015 (consulting prep):** https://careerinconsulting.com/wp-content/uploads/2019/12/8.-MIT-Sloan-Case-Book-2015.pdf — SEARCH-CONFIRMED
- **MIT Sloan Casebook 2011:** https://www.scribd.com/doc/312848576/Case-Book-MIT-Sloan-2011 — SEARCH-CONFIRMED
- **Case Centre MIT collection:** https://www.thecasecentre.org/caseCollection/MITSloan
- **VERDICT:** MIT Sloan's open case library is HIGHEST quality, but they're academic cases not competition briefs. Pull both for the corpus.

### Wharton MBA Case Competition
- **Wharton Buyout Competition:** https://www.mba-exchange.com/mba-competitions/Wharton-MBA-Buyout-Case-Competition-55-session-
- **Wharton Consulting Club Casebook 2024-25:** https://www.scribd.com/document/798989037/WCC-Casebook-202425 — SEARCH-CONFIRMED PDF
- **Wharton Consulting Club Casebook 2023-24:** https://www.scribd.com/document/811300908/Wharton-2023-2024 — SEARCH-CONFIRMED PDF
- **Wharton Case Interview Study Guide Vol I (Internet Archive):** https://archive.org/details/whartonmbacasein0000whar — SEARCH-CONFIRMED full book
- **Wharton Case Book (older):** https://www.theconsultingsociety.com/uploads/6/7/2/0/6720063/case_book_wharton.pdf — SEARCH-CONFIRMED PDF
- **2023 UPenn Casebook (CliffsNotes):** https://www.cliffsnotes.com/study-notes/24589228
- **Wharton competitions hub:** https://mba.wharton.upenn.edu/topic/competititions/
- **VERDICT:** Wharton's value here is the consulting CASEBOOK (consulting-club practice cases), not the competition briefs themselves. Buyout Competition briefs not openly archived.

### HBS New Venture Competition
- **Finalist gallery (annual):** https://www.hbs.edu/newventurecompetition/winners-and-success-stories/finalists — OFFICIAL — venture descriptions, not case briefs
- **2026 winners:** https://www.hbs.edu/news/releases/Pages/nvc-winners-2026.aspx
- **2026 semifinalists (Social Enterprise):** https://www.hbs.edu/socialenterprise/blog/new-venture-competition-announces-2026-semifinalists
- **2024 finalists (SE track):** https://www.hbs.edu/socialenterprise/blog/meet-the-2024-new-venture-competition-social-enterprise-track-finalists/
- **2023 winners:** https://www.hbs.edu/news/releases/Pages/nvc-winners-2023.aspx
- **VERDICT:** This is a B-PLAN COMPETITION, not a case-solving comp. There are no "briefs" — students bring their own ventures. Skip for case-prep corpus. Useful only for entrepreneurship inspiration content.

### IIM Indore — Champions Trophy
- **NO MATCH AS A CASE COMPETITION.** "Champions Trophy" at IIM Indore is a CRICKET tournament (https://iimidr.ac.in/news-and-events/iim-indore-cricket-tournament-champions-trophy-2022/).
- **IIM Indore's actual case competitions** (under Atharv Ranbhoomi flagship fest):
  - **Imperium 2025 (Strategy):** https://unstop.com/competitions/imperium-the-strategy-case-competition-atharv-ranbhoomi-2025-iim-indore-1504152
  - **Imperium 2024:** https://unstop.com/competitions/imperium-the-strategy-case-study-event-atharv-ranbhoomi-2024-iim-indore-1063097
  - **Imperium 2023:** https://unstop.com/competitions/imperium-the-strategy-case-study-event-atharv-ranbhoomi-2023-iim-indore-681615
  - **Enigma (Data Analytics) 2025:** https://unstop.com/competitions/enigma-the-data-analytics-case-competition-atharv-ranbhoomi-2025-iim-indore-1504138
  - **Prodyssey (Product Mgmt) 2025:** https://unstop.com/competitions/prodyssey-the-product-management-case-competition-atharv-ranbhoomi-2025-iim-indore-1503543
  - **ProdWhiz** (PM case comp) — separate flagship
- **Atharv Ranbhoomi official:** https://www.atharvranbhoomi.in/
- **VERDICT:** Briefs gated behind Unstop registration. No openly-hosted PDFs.

### Conquest (IIM Bangalore)
- **Conquest is BITS Pilani's startup conclave, NOT IIM Bangalore.** IIM Bangalore's startup competition equivalent is "Next Big Idea" / NSRCEL programs.
- **Conquest official (BITS):** https://www.conquest.org.in/
- **Corporate ConQuest IIMB VISTA 2023 (D&I):** https://unstop.com/competitions/corporate-conquest-the-diversity-inclusion-case-competition-vista-2023-iim-bangalores-international-busines-682626
- **Unmaad 2023 IIMB case:** https://unstop.com/competitions/case-study-competition-unmaad-2023-indian-institute-of-management-iim-bangalore-598487
- **VERDICT:** No public archive. Briefs gated.

### Sangharsh / Atharva
- **Sangharsh = IIM Bangalore SPORTS tournament**, not a case comp. Rulebook: https://www.scribd.com/document/701785446/Sangharsh-Rulebook-2023
- **Atharva** (presumably Atharv Ranbhoomi at IIM Indore) — see "IIM Indore" entry above.
- **VERDICT:** Sangharsh is mis-categorized — SKIP.

---

## Bonus competitions surfaced during research (not in original list, but high-value)

### Asian Paints CANVAS
- **Guidelines:** https://www.scribd.com/document/245933210/Asian-Paints-CANVAS-Guidelines — SEARCH-CONFIRMED PDF
- **CANVAS Case Study PDF:** https://www.scribd.com/document/422667419/Asian-Paints-CANVAS-Case-Study-pdf — SEARCH-CONFIRMED PDF
- **Guidelines (PPT mirror):** https://www.scribd.com/presentation/332206667/Asian-Paints-CANVAS-Guidelines-ppt
- **CANVAS 2018 Campus Finalists deck:** https://www.slideshare.net/slideshow/asian-paints-canvas-2018-case-competition-campus-finalists/157511981
- **CANVAS 2025 (Unstop):** https://unstop.com/competitions/asian-paints-canvas-2025-asian-paints-1521608
- **CANVAS 2024:** https://unstop.com/competitions/asian-paints-canvas-2024-asian-paints-1102474
- **CANVAS 2023:** https://unstop.com/competitions/asian-paints-canvas-2023-asian-paints-724140

### Nestle 4P Challenge
- **2018 Campus Winners deck (IIM Kozhikode):** https://www.slideshare.net/BhargavNRI/nestle-4ps-challenge-2018-case-competition-ppt-campus-winners — SEARCH-CONFIRMED

### Global Case Competition at Harvard (GCCH) — IFSA
- **Past Editions index (official):** https://www.thecasecompetition.org/past-editions — OFFICIAL — lists 2021 Nvidia/AMD, 2022 Bandai/Games Workshop, 2023 Siemens/Vestas, 2024 IBM/Equinix, 2025 Ferrari/Pirelli, 2026 Thales/Rheinmetall
- **2026 page:** https://www.thecasecompetition.org/gcch-2026
- **ICC at Harvard (Hilton/Blackstone LBO brief):** https://www.scribd.com/document/438253126/International-Case-Competition-at-Harvard-Case-Brief-1-pdf — SEARCH-CONFIRMED PDF
- **Harvard Crimson Global Case Competition:** https://www.scribd.com/document/774274601/Harvard-Crimson-Global-Case-Competition — SEARCH-CONFIRMED PDF
- **HCGCC official:** https://www.casecomp.org/
- **2018 Harvard ICC deck:** https://www.slideshare.net/slideshow/fff-harvard-deck-final-95176883/95176883
- **HIGH YIELD:** Email hgcc@ifsa-network.com for archived briefs per their FAQ. Multi-year M&A/strategy cases.

### IIM Casebooks (consulting prep, cohort relevance high)
- **IIM Calcutta 2023-24:** https://www.slideshare.net/slideshow/iim-calcutta-casebook-202324pdf/262830397 — SEARCH-CONFIRMED PDF
- **IIM Ahmedabad 2025-26 Consult Prep:** https://www.scribd.com/document/916537188/IIMA-Consult-Prep-Book-Case-Book-2025-26 — SEARCH-CONFIRMED PDF
- **IIMA Casebook 2022-23:** https://www.slideshare.net/slideshow/iima-casebook-202223pdf/253228492 — SEARCH-CONFIRMED PDF
- **IIMA Casebook (older):** https://www.scribd.com/document/522373969/IIMA-Casebook
- **IIMA Cases Hub:** https://cases.iima.ac.in/
- **IIM Bangalore Case Book 2022-24:** https://www.slideshare.net/slideshow/iim-bangalore-case-book-202224pdf/265449949 — SEARCH-CONFIRMED PDF
- **NYU Stern MBA Casebook 2023-24:** https://www.scribd.com/document/786193886/NYU-Stern-Casebook-23-24
- **NYU Stern MBA Casebook 2024-25:** https://www.scribd.com/document/917568003/MBA-Casebook-2024-2025

### Master indexes
- **"100 MBA Case Competitions" index:** https://www.scribd.com/document/472223508/100-MBA-Case-Competitions — SEARCH-CONFIRMED list of 100 named competitions
- **"100 Case Competitions":** https://www.scribd.com/document/587399875/100-Case-Competitions
- **"Filled Case Competition Database — Unstop Igniters":** https://www.scribd.com/document/899772143/Filled-Case-Competition-Database-Unstop-Igniters-Copy — SEARCH-CONFIRMED master DB
- **Case Competition Calendar:** https://www.scribd.com/document/878779730/Case-Competition-Calendar
- **MBA Pro'23 Case Competition Guidelines:** https://www.scribd.com/document/708496479/BTRIBE-s-MBAPRO-Case-Competition

### Unstop direct attachment endpoint (worth scripting)
- **Working example:** https://api.unstop.com/api/competition/get-attachment/5e24a86e33881_S.P.I.T._National_Case_Study_Competition_2020.pdf — direct PDF
- Pattern suggests other Unstop-hosted briefs are reachable via this API if attachment IDs can be enumerated.

---

## Summary table — verified PDF count by competition

| Competition | Verified PDFs | Notes |
|---|---:|---|
| ITC Interrobang | 7 | S2, S3, S5, S8, S13, S14, S15 |
| HULT Prize | 4 | 2022, 2023, 2024 (×2 mirror) |
| L'Oreal Brandstorm | 5 | 2014, 2023, 2025-26 (×2), 2026 mirror |
| P&G CEO Challenge | 5 | 2020 (×2), 2021-22 India, 2021-22 APAC, mirror |
| KPMG KICC | 3 | India 2016-17, India 2018-19, Malaysia 2018 (all OFFICIAL CDN) |
| CFA Research Challenge | 3+ official + multi-year archive | 2024 Waterloo + Past Champions index links to 10+ winning reports per year × multi-year |
| Mahindra War Room | 2 | XIM 2018 (official CDN), 2012 deck |
| Asian Paints CANVAS | 4 | Guidelines + case + 2018 deck + PPT |
| Reckitt | 2 | Career Compass 2024 + Benckiser deck |
| Tata Crucible | 5 | Quiz Q&A archives — flagged as quiz, not case |
| Wharton | 5 | Consulting club casebooks + Buyout context |
| MIT Sloan | 2 casebooks + entire open library | Open-access case library is the real win |
| Harvard GCCH / HCGCC / ICC | 3 | + Past Editions index, + email contact |
| IIM Casebooks (Ahm/Cal/Bang) | 5+ | Multi-year |
| Aditya Birla Stratos | 0 PDFs | Comp pages only, briefs gated |
| Deloitte Maverick | 4 | All solution decks, not briefs |
| PwC Challenge | 1 deck | Solutions only — no briefs released |
| Cornell Hospitality | 0 brief PDFs | Research-briefs library exists separately |
| HBS New Venture | 0 | Not a brief-based comp (B-plan) |
| HUL LIME | 1 PPT | Official site is canonical, scrape directly |
| Tata Steel Mindrush | 0 | NOT FOUND — sponsor doesn't release |
| IIM Indore "Champions Trophy" | 0 | Mis-named (cricket); see Atharv comps |
| IIM Bangalore "Conquest" | 0 | Mis-attributed (Conquest is BITS); IIMB VISTA cases gated |
| "Sangharsh"/"Atharva" | 0 | Sangharsh = sports; Atharv = see IIM Indore |

**Tally of independently-verified-on-search PDF URLs across all competitions: ~60 unique PDFs (briefs + casebooks + decks).**
**Total surface area when you include each year on CFA Past Champions index + IIM casebooks across years: 200-400+ documents reachable from these sources.**

---

## Recommended next actions for casepad ingestion

1. **Tier-1 (start here):** CFA Institute Past Champions (multi-year, OFFICIAL CDN, no auth) + assets.kpmg.com KICC PDFs (OFFICIAL CDN) + ITC Interrobang Scribd archive (deepest single-comp coverage) + L'Oreal Brandstorm CloudFront CDN.
2. **Tier-2 (Scribd batch):** P&G CEO Challenge (3-4 PDFs), HULT Prize (4 PDFs), L'Oreal Brandstorm 2023 + 2014, IIM casebooks (5+ multi-year). Requires Scribd account.
3. **Tier-3 (script-required):** Unstop API attachment enumeration for gated briefs (ABG Stratos, Reckitt Global, Atharv comps).
4. **Tier-4 (manual):** Email IFSA at hgcc@ifsa-network.com for Harvard GCCH multi-year case archive.
5. **DEAD ENDS — do not invest:** Tata Steel Mindrush (no public archive, possibly mis-named), HBS New Venture (B-plan not case), PwC Challenge (NDA-gated), "Champions Trophy" IIM Indore (cricket), "Sangharsh" (sports), "The Stage" Aditya Birla (likely mis-named — actual is Stratos).
6. **Re-categorize:** Tata Crucible is a QUIZ comp, not case — only ingest if casepad has a quiz module.

## Verification gap to close

WebFetch was blocked in this research session, so URLs are search-confirmed (Google indexed them as PDF/document), not HTTP-confirmed. Before bulk ingestion, run:
```bash
for url in $(cat urls.txt); do
  echo "$url $(curl -s -o /dev/null -w '%{http_code} %{content_type}' "$url")"
done
```
Filter for `200 application/pdf`. Expect ~80% live-rate; Scribd URLs may need a logged-in session to fetch the actual PDF (the public URL returns HTML viewer).
