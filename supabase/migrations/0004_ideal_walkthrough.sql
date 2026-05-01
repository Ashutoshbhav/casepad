-- Cache an LLM-generated step-by-step ideal solve per case so the debrief
-- page can show issue tree + hypothesis tree + L0-L4 thinking + step-by-step
-- reasoning without re-generating on every view.
alter table cases add column if not exists ideal_walkthrough jsonb;
