'use client';

import React, { useEffect, useState } from 'react';
import type { IssueTree, TreeNode } from '@/lib/groq/issue-tree';

// IssueTreePanel — renders the AI-inferred tree, lets user edit nodes
// inline, drag-drop to re-parent, and re-run extraction. The tree is
// fetched on mount + after every chat turn (parent triggers via prop).
//
// War Room visuals: active node = brass ring; decided branches = ivory;
// non-committed siblings of the committed root fade + scale down 400ms.

export function IssueTreePanel({
  sessionId,
  refreshTrigger,
  committedRootId,
  onCommitRoot,
}: {
  sessionId: string;
  refreshTrigger: number;
  committedRootId?: string | null;
  onCommitRoot?: (id: string | null) => void;
}) {
  const [tree, setTree] = useState<IssueTree | null>(null);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const isInitial = refreshTrigger === 0;
      if (!isInitial) setLoading(true);
      try {
        const r = await fetch('/api/issue-tree', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, mode: isInitial ? 'get' : 'extract' }),
        });
        if (!r.ok) return;
        const j = await r.json();
        if (!cancelled) setTree(j.tree);
      } catch {} finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [sessionId, refreshTrigger]);

  const rebuild = async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/issue-tree', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, mode: 'extract' }),
      });
      const j = await r.json();
      setTree(j.tree);
    } finally {
      setLoading(false);
    }
  };

  const saveTree = async (next: IssueTree) => {
    setTree(next);
    fetch('/api/issue-tree', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, mode: 'save', tree: next }),
    }).catch(() => {});
  };

  const deleteNode = (id: string) => {
    if (!tree) return;
    const removeIds = new Set([id]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const n of tree.nodes) {
        if (n.parent_id && removeIds.has(n.parent_id) && !removeIds.has(n.id)) {
          removeIds.add(n.id); changed = true;
        }
      }
    }
    saveTree({ ...tree, nodes: tree.nodes.filter((n) => !removeIds.has(n.id)) });
  };

  const renameNode = (id: string, label: string) => {
    if (!tree) return;
    saveTree({
      ...tree,
      nodes: tree.nodes.map((n) => (n.id === id ? { ...n, label } : n)),
    });
  };

  const reparentNode = (id: string, newParentId: string | null) => {
    if (!tree) return;
    if (id === newParentId) return;
    const byId = new Map(tree.nodes.map((n) => [n.id, n]));
    const parent = newParentId ? byId.get(newParentId) : null;
    const newLevel = parent ? parent.level + 1 : 0;
    saveTree({
      ...tree,
      nodes: tree.nodes.map((n) =>
        n.id === id ? { ...n, parent_id: newParentId, level: newLevel } : n
      ),
    });
  };

  const onDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
  };
  const onDrop = (e: React.DragEvent, newParent: string | null) => {
    e.preventDefault();
    e.stopPropagation();
    const id = e.dataTransfer.getData('text/plain');
    if (id) reparentNode(id, newParent);
  };

  // User commits a root branch by clicking it (toggle behavior). Sibling
  // roots tuck. Click again on the same committed root to un-commit.
  const commitRoot = (id: string) => {
    if (!onCommitRoot) return;
    onCommitRoot(committedRootId === id ? null : id);
  };

  if (!tree) {
    return (
      <div
        className="flex flex-col h-full p-4 text-xs"
        style={{ color: 'var(--color-text-muted)' }}
      >
        {loading
          ? <span>Inferring tree from your latest turn…</span>
          : 'Empty. The tree fills as you state your structure in chat.'}
      </div>
    );
  }

  const childrenOf = (pid: string | null) =>
    tree.nodes.filter((n) => n.parent_id === pid);

  // Vertical family-hierarchy renderer. Each node is a card with its
  // L0..L5 level badge in the top-left corner. Children render in a
  // horizontal row directly beneath the parent. Connector lines are
  // pure CSS via ::before/::after on the .org-li class (defined in
  // globals.css). Drag-drop, edit, delete, commit, tucking — all preserved.
  const renderNode = (n: TreeNode, rootId: string): React.ReactElement => {
    const kids = childrenOf(n.id);
    const isEditing = editingId === n.id;
    const isActive = activeId === n.id;
    const lvl = Math.max(0, Math.min(5, n.level ?? 0));
    const isRoot = lvl === 0;
    const isTucked = committedRootId != null && rootId !== committedRootId;

    return (
      <li
        key={n.id}
        className={`org-li ${isTucked ? 'tree-node-tucked' : 'tree-node-active'}`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => onDrop(e, n.id)}
      >
        <div
          draggable
          onDragStart={(e) => onDragStart(e, n.id)}
          onClick={() => {
            setActiveId(n.id);
            if (isRoot) commitRoot(n.id);
          }}
          className="group org-card relative inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md cursor-pointer transition-colors"
          style={{
            background: isActive
              ? 'rgba(217, 119, 87, 0.08)'
              : 'var(--color-bg-elevated)',
            border: `1px solid ${isActive
              ? 'var(--color-accent)'
              : isRoot
                ? 'var(--color-accent-bright)'
                : 'var(--color-border)'}`,
            color: 'var(--color-text-primary)',
            minWidth: 110,
            maxWidth: 240,
          }}
        >
          {/* Level badge — top-left of the card. L0 coral, L1+ muted. */}
          <span
            className="font-mono text-[9px] uppercase tracking-[0.12em] px-1 py-px rounded"
            style={{
              background: isRoot ? 'var(--color-accent)' : 'var(--color-bg-sunken)',
              color: isRoot ? 'var(--color-accent-fg)' : 'var(--color-text-muted)',
              fontWeight: 700,
              flexShrink: 0,
            }}
            aria-label={`level ${lvl}`}
          >
            L{lvl}
          </span>

          {isEditing ? (
            <input
              autoFocus
              value={editLabel}
              onChange={(e) => setEditLabel(e.target.value)}
              onBlur={() => { renameNode(n.id, editLabel); setEditingId(null); }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { renameNode(n.id, editLabel); setEditingId(null); }
                if (e.key === 'Escape') setEditingId(null);
              }}
              className="text-xs rounded px-1 py-0.5 flex-1"
              style={{
                background: 'var(--color-bg-sunken)',
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
            />
          ) : (
            <span
              onDoubleClick={() => { setEditingId(n.id); setEditLabel(n.label); }}
              className="text-[12px] flex-1 select-none leading-tight"
              style={{
                color: isRoot ? 'var(--color-accent-bright)' : 'var(--color-text-primary)',
                fontWeight: isRoot ? 600 : 400,
              }}
              title="click to set active · double-click to rename · drag to re-parent"
            >
              {n.label}
            </span>
          )}
          {n.mece_warning && (
            <span
              title={n.mece_warning}
              className="text-xs"
              style={{ color: 'var(--color-accent)' }}
            >
              ⚠
            </span>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); deleteNode(n.id); }}
            className="invisible group-hover:visible text-xs px-1"
            style={{ color: 'var(--color-signal-danger)' }}
            title="delete this node + its children"
          >
            ×
          </button>
        </div>

        {n.hypothesis && (
          <div
            className="text-[10px] mt-0.5"
            style={{
              fontFamily: 'var(--font-accent)',
              color: 'var(--color-text-secondary)',
              maxWidth: 240,
              margin: '4px auto 0',
              lineHeight: 1.4,
            }}
          >
            ↳ {n.hypothesis}
          </div>
        )}

        {kids.length > 0 && (
          <ul className="org-children">
            {kids.map((c) => renderNode(c, rootId))}
          </ul>
        )}
      </li>
    );
  };

  const roots = childrenOf(null);
  const maxLevel = Math.min(5, Math.max(0, ...tree.nodes.map((n) => n.level ?? 0)));

  return (
    <div
      className="flex flex-col h-full overflow-auto p-4"
      style={{ color: 'var(--color-text-primary)' }}
    >
      <header className="flex items-center justify-between mb-3">
        <div
          className="font-mono text-[11px] uppercase tracking-[0.16em] flex items-center gap-2"
          style={{ color: 'var(--color-accent)' }}
        >
          Issue tree
          {loading && (
            <span
              className="text-[9px] normal-case"
              style={{ color: 'var(--color-text-muted)' }}
            >
              updating…
            </span>
          )}
        </div>
        <button
          onClick={rebuild}
          disabled={loading}
          className="font-mono text-[10px] uppercase tracking-[0.14em] px-2 py-0.5 rounded disabled:opacity-50 transition-colors"
          style={{
            background: 'var(--color-bg-elevated)',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: 'var(--color-border)',
            color: 'var(--color-text-secondary)',
          }}
        >
          {loading ? '…' : '↻ rebuild'}
        </button>
      </header>

      <div className="grid grid-cols-2 gap-1.5 mb-3 text-[10px]">
        <RubricBar label="MECE" value={tree.rubric.mece} />
        <RubricBar label="depth balance" value={tree.rubric.depth_balance} />
        <RubricBar label="hypotheses" value={tree.rubric.hypothesis_attached} />
        <RubricBar label="root-driven" value={tree.rubric.driven_from_issue} />
      </div>

      {/* Level legend — explicit L0..L5 markers */}
      <div className="meta-label flex items-center gap-2 mb-3">
        <span>Levels</span>
        {[0, 1, 2, 3, 4, 5].map((lvl) => {
          const reached = lvl <= maxLevel;
          return (
            <span
              key={lvl}
              className="px-1 py-px rounded"
              style={{
                background: lvl === 0
                  ? 'var(--color-accent)'
                  : reached ? 'var(--color-bg-sunken)' : 'transparent',
                color: lvl === 0
                  ? 'var(--color-accent-fg)'
                  : reached ? 'var(--color-text-secondary)' : 'var(--color-text-muted)',
                opacity: reached ? 1 : 0.4,
                fontWeight: 700,
              }}
            >
              L{lvl}
            </span>
          );
        })}
      </div>

      {roots.length === 0 ? (
        <div
          className="text-xs mt-4"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Empty. The tree fills as you state your structure in chat.
        </div>
      ) : (
        <div className="org-tree">
          <ul onDragOver={(e) => e.preventDefault()} onDrop={(e) => onDrop(e, null)}>
            {roots.map((r) => renderNode(r, r.id))}
          </ul>
        </div>
      )}

      <div
        className="meta-label mt-auto pt-3"
        style={{
          borderTop: '1px solid var(--color-border)',
          marginTop: '0.75rem',
        }}
      >
        Click L0 to commit · double-click to rename · drag to re-parent
      </div>
    </div>
  );
}

function RubricBar({ label, value }: { label: string; value: number }) {
  // Brass for healthy, muted for low. Single accent — no rose/amber stack.
  const filled = value >= 70;
  return (
    <div>
      <div className="meta-label flex justify-between">
        <span>{label}</span>
        <span style={{ color: 'var(--color-text-secondary)' }}>{value}</span>
      </div>
      <div
        className="h-1 rounded mt-0.5 overflow-hidden"
        style={{ background: 'var(--color-bg-sunken)' }}
      >
        {/* GPU-friendly fill: full-width element scaled on transform-X.
            Was previously animating `width: %` with `transition: all` —
            triggered layout per frame and showed up as jank under the
            tree's frequent re-renders. Now transform-only, transition
            scoped to the single property that actually moves. */}
        <div
          className="h-full"
          style={{
            width: '100%',
            transformOrigin: 'left center',
            transform: `scaleX(${Math.max(0, Math.min(100, value)) / 100})`,
            transition: 'transform 240ms cubic-bezier(0.32, 0.72, 0, 1)',
            background: filled
              ? 'var(--color-accent)'
              : 'var(--color-text-muted)',
            willChange: 'transform',
          }}
        />
      </div>
    </div>
  );
}
