#!/usr/bin/env bash
# Wait for the in-flight main ingest to finish, then run remaining phases.
cd "$(dirname "$0")/../.."
exec > logs/all-phases.log 2>&1
echo "=== Waiting for main ingest to finish ==="
until grep -q "orchestrator.*done" logs/ingest-run.log 2>/dev/null; do sleep 30; done
echo "=== Main ingest done at $(date) ==="
echo
echo "=== Phase 2: classify + clean comp imports ==="
python scripts/ingest/classify-imports.py --apply || echo "(phase 2 had failures, continuing)"
echo
echo "=== Phase 3: OCR scanned PDFs ==="
python scripts/ingest/ocr-scanned.py || echo "(phase 3 had failures, continuing)"
echo
echo "=== Phase 4: second pass (LLM-as-finder slabs, all books, looser prompt) ==="
INGEST_CONCURRENCY=4 npm run ingest:second-pass || echo "(phase 4 had failures, continuing)"
echo
echo "=== ALL PHASES COMPLETE at $(date) ==="
