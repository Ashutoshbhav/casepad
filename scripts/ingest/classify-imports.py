"""LLM-classify each imported PDF: case-prompt vs deliverable/report.
Sends first 2000 chars to DeepSeek V4 via NVIDIA NIM. Outputs results to
docs/qa/import-classified.md and DELETES files classified as deliverable
from casebooks/raw/."""
import re, pathlib, sys, io, os, json, urllib.request, urllib.error
import fitz
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

NVIDIA_KEY = os.environ.get('NVIDIA_API_KEY')
if not NVIDIA_KEY:
    # Read from .env.local
    for ln in pathlib.Path('.env.local').read_text().splitlines():
        if ln.startswith('NVIDIA_API_KEY='):
            NVIDIA_KEY = ln.split('=', 1)[1].strip()
            break
if not NVIDIA_KEY:
    print('NVIDIA_API_KEY not found', file=sys.stderr); sys.exit(1)

URL = 'https://integrate.api.nvidia.com/v1/chat/completions'
MODEL = 'deepseek-ai/deepseek-v4-flash'

SYSTEM = """You classify PDF excerpts into one of three categories:

1. CASE_PROMPT — A business problem someone wants the reader to solve. Has a
   protagonist/client, a real-world business question, context/data, and an
   ASK that requires analysis. (Examples: "Should X enter market Y?",
   "Why are profits declining?", "Help client estimate market size".)
   The problem is UNSOLVED in the document.

2. DELIVERABLE — Someone's ANALYSIS or recommendation for a case. Has phrases
   like "Our recommendation", "Strategic plan", "Executive Summary",
   "Diagnosis", or presents conclusions/answers. The reader is being told
   what was decided, not asked to decide.

3. NOT_CASE — Something else entirely: financial reports, product
   catalogues, certificates, course notes, glossaries, recruitment brochures,
   submission rules without an actual case attached, etc.

Respond with JSON only: {"verdict": "CASE_PROMPT|DELIVERABLE|NOT_CASE", "reason": "<10 word explanation>"}"""

def classify(text: str) -> dict:
    body = json.dumps({
        'model': MODEL,
        'messages': [
            {'role': 'system', 'content': SYSTEM},
            {'role': 'user', 'content': f'EXCERPT:\n\n{text[:2000]}\n\nClassify.'},
        ],
        'response_format': {'type': 'json_object'},
        'temperature': 0.0,
        'max_tokens': 80,
        'stream': False,
    }).encode()
    req = urllib.request.Request(URL, data=body, headers={
        'Authorization': f'Bearer {NVIDIA_KEY}',
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    })
    try:
        with urllib.request.urlopen(req, timeout=90) as r:
            data = json.loads(r.read())
        content = data['choices'][0]['message']['content']
        return json.loads(content)
    except Exception as e:
        return {'verdict': 'ERROR', 'reason': str(e)[:80]}

RAW = pathlib.Path('casebooks/raw')
files = sorted([p for p in RAW.glob('comp-*.pdf')])
print(f'Classifying {len(files)} imported PDFs via DeepSeek V4...\n')

out_lines = ['# Imported case-comp LLM classification\n']
counts = {}
delete_list = []

for i, p in enumerate(files, 1):
    try:
        doc = fitz.open(p)
        text = '\n'.join((page.get_text() or '') for page in doc[:3])[:2500]
        doc.close()
    except Exception as e:
        print(f'  [{i}/{len(files)}] {p.name} — parse error: {e}')
        continue
    if len(text.strip()) < 50:
        verdict = {'verdict': 'NOT_CASE', 'reason': 'empty/scanned PDF'}
    else:
        verdict = classify(text)
    v = verdict.get('verdict', 'ERROR')
    counts[v] = counts.get(v, 0) + 1
    print(f'  [{i:02d}/{len(files)}] {v:13s} {p.name[:60]}  -- {verdict.get("reason","")[:50]}')
    out_lines.append(f"## `[{v}]` {p.name}")
    out_lines.append(f"reason: {verdict.get('reason','')}")
    out_lines.append('')
    if v in ('DELIVERABLE', 'NOT_CASE'):
        delete_list.append(p)

print(f'\nVerdicts: {counts}')

# Write report
report = pathlib.Path('docs/qa/import-classified.md')
report.parent.mkdir(parents=True, exist_ok=True)
report.write_text('\n'.join(out_lines), encoding='utf-8')
print(f'Report: {report}')
print(f'Will delete {len(delete_list)} non-case PDFs:')
for p in delete_list: print(f'  - {p.name}')

if '--apply' in sys.argv:
    for p in delete_list:
        try: p.unlink()
        except: pass
    print(f'\nDeleted {len(delete_list)} files.')
else:
    print('\n[dry-run] Re-run with --apply to delete.')
