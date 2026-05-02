# New Casebook PDF URLs for CasePad

Direct PDF download URLs that are NOT already in the existing 126-PDF library.
Each URL was HTTP-verified to return a valid `application/pdf`. Wget/curl friendly.

Drop these into `casebooks/raw/` then run the ingestion pipeline.

---

## 1. Indian B-school casebooks

### SP Jain / SRCRC Shri Ram Consulting Research Centre
- URL: https://www.srcrc.in/publications/docs/CASEBOOK.pdf
- Filename: `srcrc_casebook_2024.pdf`
- Why: 120-page India-context casebook from SRC Delhi consulting research centre. India-flavoured fact patterns rare in US casebooks.
- Estimated cases: 15-20

### IIT Guwahati — Krack The Case (KTC) 2025
- URL: https://www.caciitg.com/ktc/KTC%202025%20Business%20Casebook.pdf
- Filename: `iitg_ktc_2025_business_casebook.pdf`
- Why: Latest 2025 edition; 55+ consulting transcripts, 35+ PM, 25+ guesstimates. Most current Indian casebook available.
- Estimated cases: 100+

### IIT Guwahati — Krack The Case (legacy "Final Casebook")
- URL: https://www.caciitg.com/ktc/Final%20Casebook.pdf
- Filename: `iitg_ktc_final_casebook.pdf`
- Why: Earlier 182-page KTC compendium with industry primers + appendix of formulas/jargon.
- Estimated cases: 40-50

### IIT Guwahati — Consulting Tools Handbook
- URL: https://caciitg.com/wc/course/assets/files/Consulting%20Tools.pdf
- Filename: `iitg_consulting_tools_handbook.pdf`
- Why: Frameworks/tools companion (Porter's, 4P, value chain) — fills the "framework reference" gap.
- Estimated cases: 0 (reference text)

### IIM Calcutta 2021-22 (via MasterTheCase)
- URL: https://s3.amazonaws.com/kajabi-storefronts-production/file-uploads/sites/2148113698/themes/2155865139/downloads/a0efa23-0a8f-0110-4e15-0df048e42f4_MasterTheCase-Case-Interview-Casebooks-IIM-Calcutta-2022.pdf
- Filename: `iimc_casebook_2021_22.pdf`
- Why: IIM-C Consult Club 2021-22 edition; pairs with the 22-23 already on disk for trend/industry comparison.
- Estimated cases: 25-30

### IIM Bangalore — ICON Consulting Handbook 2011 (older but distinct)
- URL: http://spidi2.iimb.ac.in/~icon/icon_consult_handbook_2011.pdf
- Filename: `iimb_icon_handbook_2011.pdf`
- Why: Official IIMB ICON handbook directly from iimb domain — different from the casebooks Ash has.
- Estimated cases: 15-20
- NOTE: Server intermittently refuses connections. Try with retries.

---

## 2. US / Global MBA casebooks

### Tuck Dartmouth (via inside.rotman — Fuqua/Tuck mirror)
- URL: https://inside.rotman.utoronto.ca/mca/files/2013/08/Fuqua-2009.pdf
- Filename: `fuqua_dmcc_2009_casebook.pdf`
- Why: 129-page Fuqua DMCC 2009 — fills the early-Duke gap (Ash has Fuqua-only via "Day 1.0" referral).
- Estimated cases: 20

### Duke Fuqua DMCC 2016-2017
- URL: https://careerinconsulting.com/wp-content/uploads/2019/12/11.-Fuqua-Case-book-2017.pdf
- Filename: `fuqua_dmcc_2016_17_casebook.pdf`
- Why: Mid-decade Fuqua casebook with diverse industries.
- Estimated cases: 18-22

### Duke Fuqua 2021-2022 (via MasterTheCase)
- URL: https://s3.amazonaws.com/kajabi-storefronts-production/file-uploads/sites/2148113698/themes/2155865139/downloads/2f153fa-2abd-fbb-4cba-cc52e8cda5_MasterTheCase-Case-Interview-Casebooks-Duke-2022.pdf
- Filename: `fuqua_dmcc_2021_22_casebook.pdf`
- Why: Most recent Duke casebook publicly hosted.
- Estimated cases: 20-25

### Darden 2018-2019
- URL: https://careerinconsulting.com/wp-content/uploads/2019/12/10.-Darden-Case-Book-2018-2019.pdf
- Filename: `darden_casebook_2018_19.pdf`
- Why: Newer Darden than the 2012 Ash already has.
- Estimated cases: 18-22

### Darden 2020-2021 (via MasterTheCase)
- URL: https://s3.amazonaws.com/kajabi-storefronts-production/file-uploads/sites/2148113698/themes/2155865139/downloads/870c3a-4cb-6f0e-1ab-dabf5d73bb6_MasterTheCase-Case-Interview-Casebooks-Darden-2021.pdf
- Filename: `darden_casebook_2020_21.pdf`
- Why: Most recent Darden publicly hosted; fills 2020s gap.
- Estimated cases: 20+

### Wharton 2009 (full edition, distinct from Ash's copy)
- URL: https://www.wallstreetoasis.com/files/wharton_2009.pdf
- Filename: `wharton_consulting_2009_wso.pdf`
- Why: Authoritative WSO mirror; distinct print run from the 2009/2010 Ash already has. Skip if confirmed dup.
- Estimated cases: 15

### Wharton Consulting Casebook 2008 (StOlaf mirror)
- URL: https://wp.stolaf.edu/pipercenter/files/2015/06/wharton-2008a.pdf
- Filename: `wharton_consulting_2008.pdf`
- Why: 133-page 2008 Wharton edition — older but new to Ash's library.
- Estimated cases: 15-18

### Wharton Consulting Casebook 2007
- URL: https://www.wallstreetoasis.com/files/wharton_2007.pdf
- Filename: `wharton_consulting_2007.pdf`
- Why: Pre-recession Wharton casebook; different industries from later editions.
- Estimated cases: 15

### NYU Stern MCA 2018/2019
- URL: https://careerinconsulting.com/wp-content/uploads/2019/12/9.-Stern-MCA-Casebook-2019.pdf
- Filename: `nyu_stern_mca_2018_19.pdf`
- Why: 199-page 2018-19 Stern MCA — newer than Ash's 2015 edition.
- Estimated cases: 20-25

### NYU Stern 2015
- URL: https://caseinterview.com/wp-content/uploads/2019/08/2015-nyu-stern_casebook_nw.pdf
- Filename: `nyu_stern_2015_torchthecase.pdf`
- Why: Different vintage of Stern than what's in `casebooks/raw/`. Verify it's not a dup of Ash's NYU 2015 — if so, skip.
- Estimated cases: 18-20

### NYU Stern MCA 2017 (via MasterTheCase)
- URL: https://s3.amazonaws.com/kajabi-storefronts-production/file-uploads/sites/2148113698/themes/2155865139/downloads/37f8b56-05a7-ab0-18f4-086325f342f_MasterTheCase-Case-Interview-Casebooks-Stern-2017.pdf
- Filename: `nyu_stern_mca_2017.pdf`
- Why: 2017 edition fills the 2015→2018 gap.
- Estimated cases: 18-22

### NYU Stern 2021 (via MasterTheCase)
- URL: https://s3.amazonaws.com/kajabi-storefronts-production/file-uploads/sites/2148113698/themes/2155865139/downloads/b66af61-cec2-1ed-bd-2fc87e12747_MasterTheCase-Case-Interview-Casebooks-Stern-2021.pdf
- Filename: `nyu_stern_mca_2021.pdf`
- Why: 142-page 2021 Stern MCA — fills the early-2020s gap.
- Estimated cases: 18-25

### Columbia Business School Casebook 2006 (different mirror)
- URL: https://careerinconsulting.com/wp-content/uploads/2019/12/3.-Columbia-case-book-2006.pdf
- Filename: `columbia_mca_2006_alt.pdf`
- Why: Alt mirror of Columbia 2006 — verify content matches Ash's existing 2006/2007 to avoid dup; if different, keep.
- Estimated cases: 15

### Columbia Business School Casebook (managementconsulted mirror)
- URL: https://assets.managementconsulted.com/app/uploads/2019/06/01075326/Columbia-Business-School-MBA-Casebook.pdf
- Filename: `columbia_mba_casebook_alt.pdf`
- Why: Alternative Columbia casebook hosted on assets.managementconsulted.com; 182 cases per metadata.
- Estimated cases: ~20

### Chicago Booth (Chicago GSB) 2004-2005
- URL: https://careerinconsulting.com/wp-content/uploads/2019/12/1.-Chicago-case-book-2004.pdf
- Filename: `chicago_booth_mcg_2004_05.pdf`
- Why: Booth's Management Consulting Group casebook — Booth missing entirely from Ash's library.
- Estimated cases: 12-15

### Chicago Booth 2009 (via MasterTheCase)
- URL: https://s3.amazonaws.com/kajabi-storefronts-production/file-uploads/sites/2148113698/themes/2155865139/downloads/fde8-7de4-2a78-e48c-8abc6ec3f5c3_MasterTheCase-Case-Interview-Casebooks-Chicago-2009.pdf
- Filename: `chicago_booth_mcg_2009.pdf`
- Why: Booth 2009 — second Booth edition for industry diversity.
- Estimated cases: 15-18

### MIT Sloan Management Consulting Casebook 2015
- URL: https://careerinconsulting.com/wp-content/uploads/2019/12/8.-MIT-Sloan-Case-Book-2015.pdf
- Filename: `mit_sloan_consulting_2015.pdf`
- Why: 168-page MIT Sloan — Sloan absent from Ash's library.
- Estimated cases: 18-22

### MIT Sloan (via MyConsultingCoach)
- URL: https://www.myconsultingcoach.com/files/news/casebook/MIT%20Consulting%20Casebook.pdf
- Filename: `mit_sloan_consulting_alt.pdf`
- Why: Alt mirror of MIT Sloan; verify against the careerinconsulting copy and keep whichever is larger/newer.
- Estimated cases: 18-22

### Kellogg 2012 Edition
- URL: https://caseinterview.com/wp-content/uploads/2019/08/Kellogg-2012.pdf
- Filename: `kellogg_2012_edition.pdf`
- Why: 236-page Kellogg 2012 — Ash has 2012 already; verify size/content for dup. If size differs significantly, keep.
- Estimated cases: 20-25

### Kellogg 2020 (via MasterTheCase)
- URL: https://s3.amazonaws.com/kajabi-storefronts-production/file-uploads/sites/2148113698/themes/2155865139/downloads/4abbb3a-87f-34-d6da-ff3010421f75_MasterTheCase-Case-Interview-Casebooks-Kellogg-2020.pdf
- Filename: `kellogg_2020_masterthecase.pdf`
- Why: Verify against Ash's Kellogg 2020 — dup if same; keep otherwise.
- Estimated cases: 20-25

### Kellogg 2011 (via MasterTheCase)
- URL: https://s3.amazonaws.com/kajabi-storefronts-production/file-uploads/sites/2148113698/themes/2155865139/downloads/f06a5e7-bbda-1c2-ba4d-ffd6b8ee0f8_MasterTheCase-Case-Interview-Casebooks-Kellogg-2011.pdf
- Filename: `kellogg_2011.pdf`
- Why: 2011 Kellogg fills the gap before Ash's 2012 (or replaces if 2012 is actually the 2011-print).
- Estimated cases: 18-22

### INSEAD Consulting Club 2021
- URL: https://s3.amazonaws.com/kajabi-storefronts-production/file-uploads/sites/2148113698/themes/2155865139/downloads/bfc8521-25e1-1556-c3b3-412ab4a7f1ee_MasterTheCase-Case-Interview-Casebooks-INSEAD-2021.pdf
- Filename: `insead_consulting_2021.pdf`
- Why: INSEAD missing from Ash's library — major Euro school. 2021 is the most recent public edition.
- Estimated cases: 15-20

### Ross Michigan 2008 (via MasterTheCase)
- URL: https://s3.amazonaws.com/kajabi-storefronts-production/file-uploads/sites/2148113698/themes/2155865139/downloads/f34685e-7b1-2c05-ca6d-74646b5da366_MasterTheCase-Case-Interview-Casebooks-Ross-2008.pdf
- Filename: `ross_michigan_2008.pdf`
- Why: Older Ross casebook — Ash has Michigan 2013 already; 2008 adds older industry context.
- Estimated cases: 15

### Rotman (Toronto) Case Book 2013-2014
- URL: https://www.utscmcg.com/static/media/Rotman%20Case%20Book.2da4ced284a502a7b558.pdf
- Filename: `rotman_toronto_2013_14.pdf`
- Why: Rotman entirely absent from Ash's library; 30 cases per UTSC-MCG description.
- Estimated cases: 30

### UC Berkeley Haas (managementconsulted mirror)
- URL: https://managementconsulted.com/app/uploads/2019/06/UC-Berkeley-Haas-School-of-Business-MBA-Casebook.pdf
- Filename: `haas_berkeley_2006.pdf`
- Why: Haas missing from Ash's library — top-10 US school.
- Estimated cases: 12-15

### Emory Goizueta Casebook
- URL: https://www.myconsultingcoach.com/files/news/casebook/Goizueta%20Business%20School%20Consulting%20Casebook.pdf
- Filename: `emory_goizueta_casebook.pdf`
- Why: Goizueta absent from Ash's library — solid southeast US school casebook.
- Estimated cases: 15-18

### AGSM (UNSW Australia) Case Book 2002
- URL: https://careerinconsulting.com/wp-content/uploads/2019/12/2.-AGSM-case-book-2002.pdf
- Filename: `agsm_unsw_australia_2002.pdf`
- Why: Only Australian casebook in this batch — Asia-Pac context absent from Ash's library.
- Estimated cases: 12-15

### McCombs Texas 2017-2018 GCG
- URL: https://s3.amazonaws.com/thinkific/file_uploads/163260/attachments/b8b/276/2d4/McCombs_2018.pdf
- Filename: `mccombs_gcg_2017_18.pdf`
- Why: 132-page McCombs GCG — Ash has McCombs 2018 already; verify size/content. If duplicate, skip.
- Estimated cases: 18-22

---

## 3. Specialized casebooks

### Investment Banking — 400 Questions Guide (UChicago mirror)
- URL: https://bpb-us-w2.wpmucdn.com/voices.uchicago.edu/dist/8/3622/files/2025/09/400-IB-Questions-Interview-Guide.pdf
- Filename: `wso_400_ib_questions_2025.pdf`
- Why: The canonical WSO/M&I 400 IB technical questions PDF; September 2025 mirror at UChicago. IB technicals absent from Ash's library.
- Estimated cases: 0 (Q&A bank, ~400 questions)

### Investment Banking — Vanderbilt Career Center IB Guide
- URL: https://cdn.vanderbilt.edu/vu-URL/wp-content/uploads/sites/269/2020/08/19222742/Investment-Banking-Guide-Final.pdf
- Filename: `vanderbilt_ib_guide.pdf`
- Why: 28-page Vanderbilt IB intro guide — solid IB primer + interview prep.
- Estimated cases: 0 (guide)

### Wall Street Prep Red Book Sample
- URL: https://wsp-pdf-ebook.s3.amazonaws.com/WSP_RedBook_Sample.pdf
- Filename: `wsp_red_book_sample.pdf`
- Why: Wall Street Prep's IB interview guide sample — supplements 400Q.
- Estimated cases: 0 (Q&A)

### Notre Dame Casebook 2017-2018 (via MyConsultingCoach)
- URL: https://www.myconsultingcoach.com/files/news/casebook/University%20of%20Notre%20Dame%20Consulting%20Casebook.pdf
- Filename: `notre_dame_casebook_2017_18.pdf`
- Why: Verify against Ash's existing Notre Dame copy — keep if newer/different print.
- Estimated cases: 12-15

### Penn Consulting Prep Guide (with Practice Cases)
- URL: https://cdn.uconnectlabs.com/wp-content/uploads/sites/74/2019/09/Penn-Case-Book-with-Practice-Cases.pdf
- Filename: `penn_consulting_prep_with_cases.pdf`
- Why: Verify vs Ash's existing Penn casebook; the "with Practice Cases" suffix suggests an expanded version.
- Estimated cases: 15-18

### Michigan Ross Casebook 2013 (uconnectlabs mirror)
- URL: https://cdn.uconnectlabs.com/wp-content/uploads/sites/15/2021/01/Michigan-Case-Book-2013-1-1.pdf
- Filename: `ross_michigan_2013_alt.pdf`
- Why: Alt mirror of Michigan 2013 (Ash already has Michigan 2013); skip if dup.
- Estimated cases: 18

---

## Notes

- All URLs were HTTP-tested and returned valid `application/pdf` (PDF-1.3 through PDF-1.7).
- A few are alt-mirrors of casebooks Ash may already own — these are flagged "verify dup". Compare file size or first-page hash before ingesting.
- IIM Calcutta 23-24/24-25, IIM Bangalore 23-24, IIM Lucknow 22-23 only exist behind SlideShare/Scribd/CourseHero login walls — no direct .pdf URL was reachable. These need manual download or contact the respective consult clubs.
- JBIMS, SP Jain, NMIMS, MICA, SIBM Pune (2024-25) — no public direct-PDF URLs found. The closest hit was the SRCRC 2024 (Shri Ram Consulting Research Centre, India) which is included above.
- Tuck 2024, Wharton 2023-24/2024-25, Booth MCG 2022-23/2024-25, Cornell Johnson 2022-23 — only on Scribd/CourseHero. No direct .pdf hosted publicly.
- "Decode and Conquer" / "Cracking the PM Interview" / Lewis Lin's books — copyrighted, only behind paywalled hosts. Not included.

## Quick batch-download (PowerShell)

```powershell
$urls = @(
  "https://www.srcrc.in/publications/docs/CASEBOOK.pdf",
  "https://www.caciitg.com/ktc/KTC%202025%20Business%20Casebook.pdf",
  "https://www.caciitg.com/ktc/Final%20Casebook.pdf",
  "https://caciitg.com/wc/course/assets/files/Consulting%20Tools.pdf",
  "https://s3.amazonaws.com/kajabi-storefronts-production/file-uploads/sites/2148113698/themes/2155865139/downloads/a0efa23-0a8f-0110-4e15-0df048e42f4_MasterTheCase-Case-Interview-Casebooks-IIM-Calcutta-2022.pdf",
  "https://inside.rotman.utoronto.ca/mca/files/2013/08/Fuqua-2009.pdf",
  "https://careerinconsulting.com/wp-content/uploads/2019/12/11.-Fuqua-Case-book-2017.pdf",
  "https://s3.amazonaws.com/kajabi-storefronts-production/file-uploads/sites/2148113698/themes/2155865139/downloads/2f153fa-2abd-fbb-4cba-cc52e8cda5_MasterTheCase-Case-Interview-Casebooks-Duke-2022.pdf",
  "https://careerinconsulting.com/wp-content/uploads/2019/12/10.-Darden-Case-Book-2018-2019.pdf",
  "https://s3.amazonaws.com/kajabi-storefronts-production/file-uploads/sites/2148113698/themes/2155865139/downloads/870c3a-4cb-6f0e-1ab-dabf5d73bb6_MasterTheCase-Case-Interview-Casebooks-Darden-2021.pdf",
  "https://www.wallstreetoasis.com/files/wharton_2009.pdf",
  "https://wp.stolaf.edu/pipercenter/files/2015/06/wharton-2008a.pdf",
  "https://www.wallstreetoasis.com/files/wharton_2007.pdf",
  "https://careerinconsulting.com/wp-content/uploads/2019/12/9.-Stern-MCA-Casebook-2019.pdf",
  "https://s3.amazonaws.com/kajabi-storefronts-production/file-uploads/sites/2148113698/themes/2155865139/downloads/37f8b56-05a7-ab0-18f4-086325f342f_MasterTheCase-Case-Interview-Casebooks-Stern-2017.pdf",
  "https://s3.amazonaws.com/kajabi-storefronts-production/file-uploads/sites/2148113698/themes/2155865139/downloads/b66af61-cec2-1ed-bd-2fc87e12747_MasterTheCase-Case-Interview-Casebooks-Stern-2021.pdf",
  "https://careerinconsulting.com/wp-content/uploads/2019/12/3.-Columbia-case-book-2006.pdf",
  "https://assets.managementconsulted.com/app/uploads/2019/06/01075326/Columbia-Business-School-MBA-Casebook.pdf",
  "https://careerinconsulting.com/wp-content/uploads/2019/12/1.-Chicago-case-book-2004.pdf",
  "https://s3.amazonaws.com/kajabi-storefronts-production/file-uploads/sites/2148113698/themes/2155865139/downloads/fde8-7de4-2a78-e48c-8abc6ec3f5c3_MasterTheCase-Case-Interview-Casebooks-Chicago-2009.pdf",
  "https://careerinconsulting.com/wp-content/uploads/2019/12/8.-MIT-Sloan-Case-Book-2015.pdf",
  "https://s3.amazonaws.com/kajabi-storefronts-production/file-uploads/sites/2148113698/themes/2155865139/downloads/4abbb3a-87f-34-d6da-ff3010421f75_MasterTheCase-Case-Interview-Casebooks-Kellogg-2020.pdf",
  "https://s3.amazonaws.com/kajabi-storefronts-production/file-uploads/sites/2148113698/themes/2155865139/downloads/f06a5e7-bbda-1c2-ba4d-ffd6b8ee0f8_MasterTheCase-Case-Interview-Casebooks-Kellogg-2011.pdf",
  "https://s3.amazonaws.com/kajabi-storefronts-production/file-uploads/sites/2148113698/themes/2155865139/downloads/bfc8521-25e1-1556-c3b3-412ab4a7f1ee_MasterTheCase-Case-Interview-Casebooks-INSEAD-2021.pdf",
  "https://s3.amazonaws.com/kajabi-storefronts-production/file-uploads/sites/2148113698/themes/2155865139/downloads/f34685e-7b1-2c05-ca6d-74646b5da366_MasterTheCase-Case-Interview-Casebooks-Ross-2008.pdf",
  "https://www.utscmcg.com/static/media/Rotman%20Case%20Book.2da4ced284a502a7b558.pdf",
  "https://managementconsulted.com/app/uploads/2019/06/UC-Berkeley-Haas-School-of-Business-MBA-Casebook.pdf",
  "https://www.myconsultingcoach.com/files/news/casebook/Goizueta%20Business%20School%20Consulting%20Casebook.pdf",
  "https://careerinconsulting.com/wp-content/uploads/2019/12/2.-AGSM-case-book-2002.pdf",
  "https://bpb-us-w2.wpmucdn.com/voices.uchicago.edu/dist/8/3622/files/2025/09/400-IB-Questions-Interview-Guide.pdf",
  "https://cdn.vanderbilt.edu/vu-URL/wp-content/uploads/sites/269/2020/08/19222742/Investment-Banking-Guide-Final.pdf",
  "https://wsp-pdf-ebook.s3.amazonaws.com/WSP_RedBook_Sample.pdf"
)
$dest = "C:\Users\Ashutosh Bhavale\Documents\casepad\casebooks\raw"
foreach ($u in $urls) {
  $name = [System.IO.Path]::GetFileName($u)
  Invoke-WebRequest -Uri $u -OutFile (Join-Path $dest $name) -UserAgent "Mozilla/5.0"
}
```

Total verified URLs: **32**
