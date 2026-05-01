# CasePad Ingestion Pipeline

The orchestrator at `scripts/ingest/index.ts` turns casebook PDFs into rows in the `cases`
and `casebooks` Supabase tables. It runs in two modes.

## Default mode — crawl open sources

```
npm run ingest:run
```

Walks the URLs in `scripts/ingest/sources.json`, downloads any linked `.pdf`
files into `casebooks/raw/`, then parses + extracts + inserts.

## From-disk mode — process manually-supplied PDFs

```
npm run ingest:run:disk
```

Skips discover and download entirely. Scans `casebooks/raw/*.pdf` and runs the
parse → extract → insert pipeline on every PDF found there. Use this when
openly-listed casebook PDFs are scarce and you want to drop files in by hand.

### Manual PDF naming convention

Files in `casebooks/raw/` should be named:

```
<school>__<descriptive-name>.pdf
```

The `<school>` prefix (everything before the first `__`) is used as the
casebook's `school` value. Files without a `__` separator default to
`school = 'manual'`.

The convention matches what the auto-downloader produces (see
`localPathFor()` in `scripts/ingest/download.ts`), so files written by either
path are interchangeable.

## Dry runs

Append `--dry-run` (or use the `:dry` script variants) to skip every DB write.
Extraction still runs; the orchestrator logs `[dry] would insert: <title>`
instead of inserting.

```
npm run ingest:run:dry        # default mode, no DB writes
npm run ingest:run:disk:dry   # from-disk mode, no DB writes
```

## Idempotency

Both modes are safe to re-run. `upsertCasebook` matches on `(school, title)`
and `insertCase` skips duplicates by `(casebook_id, title)`, so existing rows
are not duplicated.
