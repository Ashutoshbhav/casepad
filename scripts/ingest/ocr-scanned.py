"""OCR scanned PDFs into text files for LLM extraction.

Targets PDFs in casebooks/raw/ where direct text extraction yielded near-zero
text (per docs/research/pdf-audit.json `ocrNeeded: true`). Renders each page
to an image at 200 DPI and runs Tesseract on it. Output goes to
casebooks/ocr/<original-name>.txt for the second-pass extractor to pick up.
"""
import os, sys, json, pathlib
import fitz  # PyMuPDF
from PIL import Image
import pytesseract
import io

# Tesseract install location on Windows
TESSERACT_EXE = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
if pathlib.Path(TESSERACT_EXE).exists():
    pytesseract.pytesseract.tesseract_cmd = TESSERACT_EXE

RAW = pathlib.Path('casebooks/raw')
OUT = pathlib.Path('casebooks/ocr')
OUT.mkdir(parents=True, exist_ok=True)

audit_path = pathlib.Path('docs/research/pdf-audit.json')
if not audit_path.exists():
    print('Run `npm run audit:pdfs` first to identify OCR-needed files.', file=sys.stderr)
    sys.exit(1)

audit = json.loads(audit_path.read_text())
targets = [r['file'] for r in audit if r.get('ocrNeeded') and r.get('numPages', 0) > 1]

print(f'OCR targets: {len(targets)}')
for fname in targets:
    pdf_path = RAW / fname
    out_path = OUT / (fname.replace('.pdf', '.txt'))
    if out_path.exists() and out_path.stat().st_size > 1000:
        print(f'  skip {fname} (already OCR\'d, {out_path.stat().st_size//1000}kc)')
        continue
    if not pdf_path.exists():
        print(f'  miss {fname} (not found)')
        continue
    print(f'  OCR {fname}...')
    doc = fitz.open(pdf_path)
    pages_text = []
    for page_num, page in enumerate(doc):
        pix = page.get_pixmap(dpi=200)
        img = Image.open(io.BytesIO(pix.tobytes('png')))
        text = pytesseract.image_to_string(img)
        pages_text.append(f'-- {page_num + 1} of {len(doc)} --\n{text}')
        if (page_num + 1) % 10 == 0:
            print(f'    page {page_num+1}/{len(doc)}')
    doc.close()
    full = '\n\n'.join(pages_text)
    out_path.write_text(full, encoding='utf-8')
    print(f'  → {len(full)//1000}kc to {out_path}')
print('Done.')
