-- Issue/hypothesis tree per session. The AI infers a tree from chat in real
-- time and stores it here so the right pane can render it without re-running
-- extraction on every render. Schema is loose JSONB:
--   { nodes: [{ id, label, parent_id|null, level, hypothesis?: string, mece_warning?: string }],
--     rubric: { mece, depth_balance, hypothesis_attached, driven_from_issue },  -- each 0-100
--     last_updated_turn: number }
alter table sessions add column if not exists issue_tree jsonb;
