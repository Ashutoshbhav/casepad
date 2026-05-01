"""Import original case-prompt PDFs from
C:\\Users\\Ashutosh Bhavale\\Downloads\\Case_Competitions\\<folder>/
into casebooks/raw/ for ingest.

Heuristic: skip Ash's own deliverables (strategy decks, research, final
submissions) by filename keyword filter. Take only PDFs that look like
the original case brief.
"""
import shutil, re, pathlib, sys, io
# Force UTF-8 stdout to handle filenames with non-ASCII chars on Windows.
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

SOURCE = pathlib.Path(r"C:\Users\Ashutosh Bhavale\Downloads\Case_Competitions")
DEST = pathlib.Path("casebooks/raw")
DEST.mkdir(parents=True, exist_ok=True)

# Filename substrings that indicate Ash's own deliverable, not the original case
DELIVERABLE_KW = re.compile(
    r"strategy|research|final|deck|playbook|synthesis|recommendation|plan|"
    r"analysis|diversification|growth|report|submission|executive|memorandum|"
    r"framework|brief\b|roadmap|positioning|pivot|turnaround|reflection|"
    r"defense|defence|ecosystem|gtm|playbook|narrative|playbook|prompt|round|"
    r"clarification|memorial",
    re.IGNORECASE,
)

if not SOURCE.exists():
    print(f"Not found: {SOURCE}", file=sys.stderr); sys.exit(1)

copied = 0
skipped = 0
for folder in sorted(SOURCE.iterdir()):
    if not folder.is_dir():
        continue
    pdfs = list(folder.glob("*.pdf"))
    candidates = [p for p in pdfs if not DELIVERABLE_KW.search(p.name)]
    if not candidates:
        # Fallback — take the shortest filename as the prompt
        candidates = sorted(pdfs, key=lambda p: len(p.name))[:1] if pdfs else []
    print(f"[{folder.name}] {len(pdfs)} pdfs, {len(candidates)} candidate(s):")
    for p in candidates:
        target_name = f"comp-{folder.name}__{p.name}".replace(' ', '_')
        target = DEST / target_name
        if target.exists():
            print(f"  skip (exists): {target.name}")
            skipped += 1
            continue
        shutil.copy2(p, target)
        print(f"  copied: {p.name} -> {target.name}")
        copied += 1
print(f"\nDone. Copied {copied}, skipped {skipped}.")
