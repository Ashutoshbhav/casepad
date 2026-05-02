-- Foundation hardening: prevent re-ingestion duplicates within a single casebook.
-- The (casebook_id, lower(title)) pair is what we treat as identity for cases.
-- Tulsa Hotel-style 5x duplicates surfaced in the 2026-05-02 audit because no
-- such constraint existed. After foundation-cleanup.mjs removed the existing
-- collisions, we add the index so future ingest runs fail-fast on duplicates
-- rather than silently inserting partial extractions.

create unique index if not exists idx_cases_unique_in_casebook
  on cases (casebook_id, lower(title))
  where casebook_id is not null;
