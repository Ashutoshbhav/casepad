"""Scan Ash's Downloads + Documents + OneDrive for case-shaped PDFs and copy
them into casebooks/raw/ for ingest.

Heuristic: include if filename matches "case" pattern AND does NOT match
course-notes/exam/lecture-deck patterns. Skip casepad's own dirs.
"""
import shutil, re, pathlib, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

ROOTS = [
    pathlib.Path(r"C:\Users\Ashutosh Bhavale\Downloads"),
    pathlib.Path(r"C:\Users\Ashutosh Bhavale\Documents"),
    pathlib.Path(r"C:\Users\Ashutosh Bhavale\OneDrive\Desktop"),
    pathlib.Path(r"C:\Users\Ashutosh Bhavale\Desktop"),
]

DEST = pathlib.Path("casebooks/raw")
DEST.mkdir(parents=True, exist_ok=True)

# Skip these whole-path substrings entirely
SKIP_PATH = re.compile(
    r"casepad|node_modules|\.git|\.next|\.venv|Case_Competitions|"
    r"_dupes|/raw/|/ocr/",
    re.IGNORECASE,
)

# Filename must contain at least one of these to be considered
INCLUDE_KW = re.compile(
    r"case|brief|problem.statement|simulation|scenario|business.problem|"
    r"competition|assignment|challenge",
    re.IGNORECASE,
)

# Skip if filename contains these (course content / not a case)
EXCLUDE_KW = re.compile(
    r"\bnotes?\b|\bnote\b|\bquizz?\b|\bexam\b|\bterm\b|\bsession\b|"
    r"\bsyllabus\b|\bdeck\b|\bppt\b|\bppt[x]?\.pdf$|\blecture\b|"
    r"\bchapter\b|\brevision\b|\bcheat.?sheet\b|\bsolution\b|"
    r"\bframework\b|\boutline\b|\bsummary\b|\bworkshop\b|"
    r"\btextbook\b|\btake.home\b|\btopic\b|\bread\b|\bslide\b|"
    r"\bbook.notes\b|\bclass.\b|\bsem.?\b|\bmidterm\b|\bend.?term\b|"
    r"\bglossary\b|\bcontract\b|\bcurriculum\b|\bdraft\b|"
    r"\binvoice\b|\breceipt\b|\bsalary\b|\boffer.letter\b|"
    r"\bresume\b|\bcv\b",
    re.IGNORECASE,
)

found = 0
for root in ROOTS:
    if not root.exists(): continue
    for p in root.rglob('*.pdf'):
        full = str(p).replace('\\', '/')
        if SKIP_PATH.search(full): continue
        name = p.name
        if not INCLUDE_KW.search(name): continue
        if EXCLUDE_KW.search(name): continue
        # Size sanity: < 50KB likely a flier; > 50MB likely a textbook
        try:
            size = p.stat().st_size
            if size < 5000 or size > 50_000_000: continue
        except: continue

        target_name = ('ash-' + p.parent.name + '__' + p.name).replace(' ', '_').replace('/', '_')
        target = DEST / target_name
        if target.exists(): continue
        try:
            shutil.copy2(p, target)
            print(f'  + {p.parent.name}/{p.name} -> {target.name}')
            found += 1
        except Exception as e:
            print(f'  err {p.name}: {e}')

print(f'\nDone. Imported {found} case-shaped PDFs.')
