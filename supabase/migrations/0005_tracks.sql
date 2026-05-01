-- Track support: students pick consulting / ib / pm / marketing / strategy
-- on signup. Cases get tagged. Rubric scoring varies per track.

create type if not exists track_kind as enum (
  'consulting', 'ib_pe_vc', 'pm', 'marketing', 'strategy_bizops', 'behavioral'
);

-- Per-user preferred track (set on first cases-page visit)
alter table users add column if not exists preferred_track track_kind default 'consulting';

-- Tag each case with applicable tracks (can apply to multiple)
alter table cases add column if not exists tracks track_kind[] default array['consulting']::track_kind[];

-- Track-specific scoring breakdown on sessions
alter table sessions add column if not exists track track_kind;

create index if not exists cases_tracks_idx on cases using gin(tracks);
create index if not exists sessions_track_idx on sessions(track);
