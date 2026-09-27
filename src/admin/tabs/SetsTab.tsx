import { useState } from 'react';
import type { SetItem, SetList } from '../../core';
import { useAdmin } from '../context';

function emptySet(): SetList {
  return { id: crypto.randomUUID(), title: '', items: [] };
}

function move<T>(arr: T[], from: number, to: number): T[] {
  if (to < 0 || to >= arr.length) return arr;
  const next = arr.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function SetsTab() {
  const { draft, updateDraft } = useAdmin();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = draft.sets.find((s) => s.id === selectedId) ?? null;

  function openNew() {
    const set = emptySet();
    updateDraft((d) => ({ ...d, sets: [...d.sets, set] }));
    setSelectedId(set.id);
  }

  function patchSelected(patch: Partial<SetList>) {
    if (!selected) return;
    const id = selected.id;
    updateDraft((d) => ({ ...d, sets: d.sets.map((s) => (s.id === id ? { ...s, ...patch } : s)) }));
  }

  function setItems(items: SetItem[]) {
    patchSelected({ items });
  }

  function removeSet(id: string) {
    if (!confirm('Delete this set list?')) return;
    updateDraft((d) => ({ ...d, sets: d.sets.filter((s) => s.id !== id) }));
    if (selectedId === id) setSelectedId(null);
  }

  if (selected) {
    return (
      <div className="sb-admin-editor">
        <button type="button" className="sb-admin-back" onClick={() => setSelectedId(null)}>
          ← Sets
        </button>
        <label className="sb-admin-field">
          <span>Title</span>
          <input value={selected.title} onChange={(e) => patchSelected({ title: e.target.value })} />
        </label>
        <label className="sb-admin-field">
          <span>Date</span>
          <input type="date" value={selected.date ?? ''} onChange={(e) => patchSelected({ date: e.target.value || undefined })} />
        </label>

        <span className="sb-admin-label">Songs</span>
        <ul className="sb-admin-set-items">
          {selected.items.map((item, i) => {
            const song = draft.songs.find((s) => s.id === item.songId);
            return (
              <li key={`${item.songId}-${i}`} className="sb-admin-set-item">
                <select
                  value={item.songId}
                  onChange={(e) => {
                    const items = selected.items.slice();
                    items[i] = { ...items[i], songId: e.target.value };
                    setItems(items);
                  }}
                >
                  <option value="" disabled>
                    Choose a song
                  </option>
                  {draft.songs.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title || 'Untitled'}
                    </option>
                  ))}
                </select>
                <input
                  className="sb-admin-set-key"
                  placeholder={song?.key ?? 'key'}
                  value={item.key ?? ''}
                  onChange={(e) => {
                    const items = selected.items.slice();
                    items[i] = { ...items[i], key: e.target.value || undefined };
                    setItems(items);
                  }}
                />
                <input
                  className="sb-admin-set-note"
                  placeholder="note"
                  value={item.note ?? ''}
                  onChange={(e) => {
                    const items = selected.items.slice();
                    items[i] = { ...items[i], note: e.target.value || undefined };
                    setItems(items);
                  }}
                />
                <div className="sb-admin-reorder">
                  <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => setItems(move(selected.items, i, i - 1))}>
                    ↑
                  </button>
                  <button
                    type="button"
                    aria-label="Move down"
                    disabled={i === selected.items.length - 1}
                    onClick={() => setItems(move(selected.items, i, i + 1))}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    aria-label="Remove"
                    onClick={() => setItems(selected.items.filter((_, j) => j !== i))}
                  >
                    ✕
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
        <button
          type="button"
          disabled={draft.songs.length === 0}
          onClick={() => setItems([...selected.items, { songId: draft.songs[0]?.id ?? '' }])}
        >
          Add song to set
        </button>

        <button type="button" className="sb-admin-danger" onClick={() => removeSet(selected.id)}>
          Delete set list
        </button>
      </div>
    );
  }

  return (
    <div className="sb-admin-list-view">
      <div className="sb-admin-toolbar">
        <button type="button" onClick={openNew}>
          New set list
        </button>
      </div>
      <ul className="sb-admin-list">
        {draft.sets.map((s) => (
          <li key={s.id}>
            <button type="button" className="sb-admin-list-item" onClick={() => setSelectedId(s.id)}>
              <span className="sb-admin-list-title">{s.title || 'Untitled set'}</span>
              {s.date && <span className="sb-admin-list-meta">{s.date}</span>}
            </button>
          </li>
        ))}
        {draft.sets.length === 0 && <li className="sb-admin-empty">No set lists yet.</li>}
      </ul>
    </div>
  );
}
