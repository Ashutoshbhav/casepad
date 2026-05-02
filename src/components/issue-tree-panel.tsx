'use client';

import React, { useEffect, useState } from 'react';
import type { IssueTree, TreeNode } from '@/lib/groq/issue-tree';

// IssueTreePanel — renders the AI-inferred tree, lets user edit nodes
// inline, drag-drop to re-parent, and re-run extraction. The tree is
// fetched on mount + after every chat turn (parent triggers via prop).

export function IssueTreePanel({ sessionId, refreshTrigger }: { sessionId: string; refreshTrigger: number }) {
  const [tree, setTree] = useState<IssueTree | null>(null);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');

  // Fetch existing tree on mount
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const r = await fetch('/api/issue-tree', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, mode: 'extract' }),
        });
        if (!r.ok) return;
        const j = await r.json();
        if (!cancelled) setTree(j.tree);
      } catch {}
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
    // Recompute level based on new parent
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

  if (!tree) {
    return (
      <div className="flex flex-col h-full p-4 text-xs text-zinc-500">
        Tree will appear as you talk. Empty so far.
      </div>
    );
  }

  // Build child map
  const childrenOf = (pid: string | null) =>
    tree.nodes.filter((n) => n.parent_id === pid);

  const renderNode = (n: TreeNode, indent: number): React.ReactElement => {
    const kids = childrenOf(n.id);
    const isEditing = editingId === n.id;
    return (
      <li key={n.id} className="my-0.5" onDragOver={(e) => e.preventDefault()} onDrop={(e) => onDrop(e, n.id)}>
        <div
          draggable
          onDragStart={(e) => onDragStart(e, n.id)}
          className="group flex items-center gap-1 py-0.5 hover:bg-zinc-900 rounded px-1"
        >
          <span className="text-zinc-600 text-xs">{'·  '.repeat(indent)}</span>
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
              className="text-xs bg-zinc-900 border border-zinc-700 rounded px-1 py-0.5 text-zinc-100 flex-1"
            />
          ) : (
            <span
              onClick={() => { setEditingId(n.id); setEditLabel(n.label); }}
              className={`text-xs cursor-pointer flex-1 ${n.level === 0 ? 'text-emerald-300 font-semibold' : n.level === 1 ? 'text-emerald-400' : 'text-zinc-200'}`}
              title="click to edit"
            >
              {n.label}
            </span>
          )}
          {n.mece_warning && (
            <span title={n.mece_warning} className="text-amber-400 text-xs">⚠</span>
          )}
          <button
            onClick={() => deleteNode(n.id)}
            className="invisible group-hover:visible text-rose-500 text-xs px-1"
            title="delete this node + its children"
          >
            ×
          </button>
        </div>
        {n.hypothesis && (
          <div className="ml-6 text-[11px] text-violet-300 italic">↳ {n.hypothesis}</div>
        )}
        {kids.length > 0 && (
          <ul className="ml-3">{kids.map((c) => renderNode(c, indent + 1))}</ul>
        )}
      </li>
    );
  };

  const roots = childrenOf(null);

  return (
    <div className="flex flex-col h-full overflow-y-auto p-3 text-zinc-200">
      <header className="flex items-center justify-between mb-3">
        <div className="text-xs uppercase text-emerald-300">Issue tree</div>
        <button
          onClick={rebuild}
          disabled={loading}
          className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 hover:bg-zinc-700 disabled:opacity-50"
        >
          {loading ? '…' : '↻ rebuild'}
        </button>
      </header>

      {/* Mini-rubric */}
      <div className="grid grid-cols-2 gap-1.5 mb-3 text-[10px]">
        <RubricBar label="MECE" value={tree.rubric.mece} />
        <RubricBar label="depth balance" value={tree.rubric.depth_balance} />
        <RubricBar label="hypotheses" value={tree.rubric.hypothesis_attached} />
        <RubricBar label="root-driven" value={tree.rubric.driven_from_issue} />
      </div>

      {roots.length === 0 ? (
        <div className="text-xs text-zinc-500 mt-4">Empty. The tree fills as you state your structure in chat.</div>
      ) : (
        <ul onDragOver={(e) => e.preventDefault()} onDrop={(e) => onDrop(e, null)}>
          {roots.map((r) => renderNode(r, 0))}
        </ul>
      )}

      <div className="mt-auto pt-3 text-[10px] text-zinc-600 border-t border-zinc-900 mt-3">
        Click a node to rename. × to delete. Drag to re-parent.
      </div>
    </div>
  );
}

function RubricBar({ label, value }: { label: string; value: number }) {
  const color = value >= 70 ? 'bg-emerald-500' : value >= 40 ? 'bg-amber-500' : 'bg-rose-500';
  return (
    <div>
      <div className="flex justify-between text-zinc-500">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="h-1 bg-zinc-900 rounded mt-0.5 overflow-hidden">
        <div className={`h-full ${color} transition-all`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
