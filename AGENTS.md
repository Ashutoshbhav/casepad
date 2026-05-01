<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Ingestion

See `docs/INGESTION.md` for the orchestrator. Two modes:

- `npm run ingest:run` — crawl open sources listed in `scripts/ingest/sources.json`.
- `npm run ingest:run:disk` — process PDFs you've dropped into `casebooks/raw/` (named `<school>__<name>.pdf`).

Append `--dry-run` (or use `:dry` script variants) to skip DB writes.
