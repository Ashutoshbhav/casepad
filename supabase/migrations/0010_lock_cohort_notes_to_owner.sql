-- Tighten cohort_notes RLS: was qual=true (anyone authenticated could read
-- everyone's notes). Now: each user sees only their own notes. Matches the
-- intent stated in the cohort design — notes are personal, not a cohort
-- chat board.
--
-- Insert/update policies were already user-scoped (with check user_id =
-- auth.uid()); just tightening the SELECT side here.

drop policy if exists cohort_notes_read on cohort_notes;
create policy cohort_notes_read
  on cohort_notes for select
  to authenticated
  using (auth.uid() = user_id);

-- Also explicit update + delete owner-only (was missing).
drop policy if exists cohort_notes_update on cohort_notes;
create policy cohort_notes_update
  on cohort_notes for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists cohort_notes_delete on cohort_notes;
create policy cohort_notes_delete
  on cohort_notes for delete
  to authenticated
  using (auth.uid() = user_id);
