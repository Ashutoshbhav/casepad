"""Dump all cases from Supabase to docs/qa/case-audit.md.
Uses urllib + REST API to avoid the Node.js + Supabase + Windows libuv crash."""
import json, os, urllib.request, urllib.parse, sys, pathlib

URL = os.environ.get('NEXT_PUBLIC_SUPABASE_URL')
KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
if not URL or not KEY:
    print('Missing env vars. Source from .env.local first.', file=sys.stderr); sys.exit(1)

req = urllib.request.Request(
    f'{URL}/rest/v1/cases?select=id,title,industry,case_type,difficulty,problem_statement,interviewer_notes,ideal_structure,casebook_id,provenance&order=casebook_id.asc,title.asc',
    headers={'apikey': KEY, 'Authorization': f'Bearer {KEY}'},
)
with urllib.request.urlopen(req) as r:
    cases = json.loads(r.read())

print(f'Total cases in DB: {len(cases)}')

lines = ['# CasePad — FULL Case Audit\n']
lines.append(f'All {len(cases)} cases. Mark each:\n')
lines.append('- `[x]` good — keep as-is')
lines.append('- `[~]` usable but rough — keep, can polish later')
lines.append('- `[ ]` bad — DELETE\n')
lines.append('Then run `node --env-file=.env.local scripts/qa/apply-audit.mjs --apply`.\n')
lines.append('---\n')

def s(x):
    if isinstance(x, str): return x
    return json.dumps(x, ensure_ascii=False)

for i, c in enumerate(cases, 1):
    book = (c.get('provenance') or {}).get('casebook_title', 'unknown')
    book = book.replace('manual__', '').replace('_20', ' ').replace('.pdf', '')
    lines.append(f"## {i}. `[ ]` {c['title']}")
    lines.append(f"**id:** `{c['id']}` · **book:** {book} · **industry:** {c.get('industry','')} · **type:** {c.get('case_type','')} · **difficulty:** {c.get('difficulty','')}\n")
    lines.append('### Problem statement')
    lines.append((c.get('problem_statement') or '_(empty)_')[:1500])
    lines.append('')
    lines.append('### Interviewer notes (reveal-on-question)')
    notes = c.get('interviewer_notes') or []
    if notes:
        for n in notes[:5]:
            trig = ', '.join(s(t) for t in (n.get('trigger_keywords') or []))[:200]
            rev = (n.get('reveal_text') or '')[:300]
            lines.append(f"- **trigger:** {trig or '_(none)_'}")
            lines.append(f"  **reveal:** {rev}")
        if len(notes) > 5:
            lines.append(f'- _(+{len(notes)-5} more)_')
    else:
        lines.append('_(none)_')
    lines.append('')
    lines.append('### Ideal structure')
    struct = c.get('ideal_structure') or {}
    lines.append(f"framework: {struct.get('framework') or '_(none)_'}")
    branches = struct.get('branches') or []
    for b in branches[:6]:
        subs = ', '.join(s(x) for x in (b.get('subnodes') or []))[:200]
        lines.append(f"- **{b.get('node','?')}** → {subs or '_(no subnodes)_'}")
    insights = struct.get('key_insights') or []
    if insights:
        ins = ' · '.join(s(x) for x in insights[:3])[:300]
        lines.append(f"**insights:** {ins}")
    lines.append('\n---\n')

out = pathlib.Path('docs/qa/case-audit.md')
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text('\n'.join(lines), encoding='utf-8')
print(f'Wrote {out} ({len(cases)} cases)')
