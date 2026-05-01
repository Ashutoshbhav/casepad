"""Open each imported case PDF and classify: case-prompt vs deliverable.
Uses heuristics on the first ~1500 chars + filename. Output goes to
docs/qa/import-verify.md so Ash can review and override.
"""
import re, pathlib, sys, io, json
import fitz
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

RAW = pathlib.Path('casebooks/raw')

# Strong signals it's a CASE PROMPT
CASE_PROMPT_RE = re.compile(
    r'\bclient\b|\bCEO\b|\bour\s+client\b|\bthe\s+client\b|'
    r'\binterviewer\b|\binterview\s+question\b|'
    r'\bproblem\s+statement\b|\bcase\s+facts\b|\bbackground:\s|'
    r'\byou\s+are\s+(a|an)\s+(consultant|analyst|advisor)\b|'
    r'\byou\s+have\s+been\s+hired\b|\byou\s+are\s+brought\s+in\b|'
    r'\bestimate\s+the\b|\bsize\s+the\s+market\b',
    re.IGNORECASE,
)

# Strong signals it's a DELIVERABLE / OUR OUTPUT
DELIVERABLE_RE = re.compile(
    r'\bour\s+recommendation\b|\bexecutive\s+summary\b|'
    r'\bstrategic\s+(recommendation|plan|roadmap|analysis|audit|synthesis|playbook)\b|'
    r'\b(prepared|submitted|presented)\s+by\b|'
    r'\bteam\s+(name|members)\b|'
    r'\bagenda\b.*\bappendix\b|'
    r'\bfinal\s+(submission|defense|deck|presentation)\b|'
    r'\bdiagnosis\s+&\s+prescription\b',
    re.IGNORECASE,
)

# Filename hints
DELIVERABLE_FNAME = re.compile(
    r'strategy|research|playbook|deck|synthesis|recommendation|plan|'
    r'analysis|diversification|growth|report|submission|executive|'
    r'memorandum|framework|roadmap|positioning|pivot|turnaround|'
    r'reflection|defense|defence|ecosystem|gtm|narrative|memorial|'
    r'audit|intelligence|prep\.|preparation|first.draft|final',
    re.IGNORECASE,
)

# Targets — only the comp-* ones I just added (skip the casebook__ ones)
files = sorted([p for p in RAW.glob('comp-*.pdf')])
print(f'Verifying {len(files)} imported case-comp PDFs\n')

results = []
for p in files:
    try:
        doc = fitz.open(p)
        first = '\n'.join((page.get_text() or '') for page in doc[:3])[:2500]
        doc.close()
    except Exception as e:
        results.append({'file': p.name, 'verdict': 'ERROR', 'reason': str(e)[:100], 'snippet': ''})
        continue

    name = p.name
    fname_deliverable = bool(DELIVERABLE_FNAME.search(name))
    body_case = len(CASE_PROMPT_RE.findall(first)) >= 2
    body_deliv = len(DELIVERABLE_RE.findall(first)) >= 1

    # Decide
    if body_case and not body_deliv:
        verdict, reason = 'CASE', 'case-prompt language in body'
    elif body_deliv and not body_case:
        verdict, reason = 'DELIV', 'deliverable language in body'
    elif body_case and body_deliv:
        verdict, reason = 'MIXED', 'has both signals — needs manual review'
    elif fname_deliverable:
        verdict, reason = 'DELIV', 'filename suggests deliverable, no clear case signal'
    else:
        verdict, reason = 'UNCLEAR', 'no strong signals either way'
    results.append({
        'file': name,
        'verdict': verdict,
        'reason': reason,
        'snippet': first[:600].replace('\n', ' '),
    })

# Write report
out = pathlib.Path('docs/qa/import-verify.md')
out.parent.mkdir(parents=True, exist_ok=True)
md = ['# Imported case-comp verification\n', f'{len(files)} PDFs scanned. Verdicts:\n']
counts = {}
for r in results:
    counts[r['verdict']] = counts.get(r['verdict'], 0) + 1
for v, n in sorted(counts.items()):
    md.append(f'- **{v}**: {n}')
md.append('\n---\n')
for r in results:
    md.append(f"## `[{r['verdict']}]` {r['file']}")
    md.append(f"reason: {r['reason']}")
    md.append(f"```\n{r['snippet']}\n```\n")
out.write_text('\n'.join(md), encoding='utf-8')
print(f'Verdicts: {counts}')
print(f'Report: {out}')
