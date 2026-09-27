import { useMemo, useState } from 'react';
import { songInfo, SongBody } from '../../song';
import type { SongInfo } from '../../song';
import type { DraftSong, LicenseSource } from '../../core';
import { useAdmin } from '../context';
import { LICENSE_HINTS, LICENSE_LABELS, baseName, extensionOf, readFileAsText } from '../util';

const LICENSES: LicenseSource[] = ['public-domain', 'ccli', 'onelicense', 'permission', 'original', 'other'];
const IMPORT_EXTENSIONS = new Set(['cho', 'chordpro', 'txt']);

function emptySong(): DraftSong {
  return {
    id: crypto.randomUUID(),
    title: '',
    license: 'other',
    text: '',
    updatedAt: new Date().toISOString(),
  };
}

export function SongsTab() {
  const { draft, updateDraft } = useAdmin();
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [auto, setAuto] = useState<SongInfo>({});

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return draft.songs;
    return draft.songs.filter(
      (s) => s.title.toLowerCase().includes(q) || (s.firstLine ?? '').toLowerCase().includes(q),
    );
  }, [draft.songs, query]);

  const selected = draft.songs.find((s) => s.id === selectedId) ?? null;

  function openNew() {
    const song = emptySong();
    updateDraft((d) => ({ ...d, songs: [...d.songs, song] }));
    setSelectedId(song.id);
    setAuto({});
  }

  function openEdit(id: string) {
    setSelectedId(id);
    const s = draft.songs.find((x) => x.id === id);
    setAuto(s ? songInfo(s.text) : {});
  }

  function patchSelected(patch: Partial<DraftSong>) {
    if (!selected) return;
    const id = selected.id;
    updateDraft((d) => ({
      ...d,
      songs: d.songs.map((s) => (s.id === id ? { ...s, ...patch, updatedAt: new Date().toISOString() } : s)),
    }));
  }

  function carry(
    current: DraftSong,
    prevAuto: SongInfo,
    nextAuto: SongInfo,
    field: keyof SongInfo,
    targetField: keyof DraftSong,
    patch: Record<string, unknown>,
  ) {
    const currentValue = (current as unknown as Record<string, unknown>)[targetField as string];
    const wasAuto = currentValue === prevAuto[field] || (currentValue == null && prevAuto[field] == null);
    if (wasAuto && nextAuto[field] !== undefined) {
      patch[targetField as string] = nextAuto[field];
    }
  }

  function onTextChange(text: string) {
    if (!selected) return;
    const next = songInfo(text);
    const patch: Record<string, unknown> = { text };
    carry(selected, auto, next, 'title', 'title', patch);
    carry(selected, auto, next, 'key', 'key', patch);
    carry(selected, auto, next, 'authors', 'authors', patch);
    carry(selected, auto, next, 'copyright', 'copyright', patch);
    carry(selected, auto, next, 'firstLine', 'firstLine', patch);
    carry(selected, auto, next, 'ccli', 'ccliSong', patch);
    patchSelected(patch as Partial<DraftSong>);
    setAuto(next);
  }

  function removeSong(id: string) {
    if (!confirm('Delete this song? This cannot be undone.')) return;
    updateDraft((d) => ({ ...d, songs: d.songs.filter((s) => s.id !== id) }));
    if (selectedId === id) setSelectedId(null);
  }

  async function importFiles(fileList: FileList | null) {
    if (!fileList) return;
    const imported: DraftSong[] = [];
    for (const file of Array.from(fileList)) {
      if (!IMPORT_EXTENSIONS.has(extensionOf(file.name))) continue;
      const text = await readFileAsText(file);
      const info = songInfo(text);
      imported.push({
        id: crypto.randomUUID(),
        title: info.title || baseName(file.name),
        firstLine: info.firstLine,
        key: info.key,
        authors: info.authors,
        copyright: info.copyright,
        ccliSong: info.ccli,
        license: 'other',
        text,
        updatedAt: new Date().toISOString(),
      });
    }
    if (imported.length) {
      updateDraft((d) => ({ ...d, songs: [...d.songs, ...imported] }));
    }
  }

  if (selected) {
    const warnings: string[] = [];
    if (!selected.title.trim()) warnings.push('Title is required.');
    if (selected.license === 'ccli') {
      if (!selected.ccliSong) warnings.push('A CCLI license needs a CCLI song number.');
      if (!draft.church.ccliLicense) {
        warnings.push('A CCLI license needs your church CCLI license number (see the Church tab).');
      }
    }

    return (
      <div className="sb-admin-editor">
        <button type="button" className="sb-admin-back" onClick={() => setSelectedId(null)}>
          ← Songs
        </button>
        <label className="sb-admin-field">
          <span>Title</span>
          <input value={selected.title} onChange={(e) => patchSelected({ title: e.target.value })} />
        </label>
        <div className="sb-admin-grid2">
          <label className="sb-admin-field">
            <span>Key</span>
            <input value={selected.key ?? ''} onChange={(e) => patchSelected({ key: e.target.value || undefined })} />
          </label>
          <label className="sb-admin-field">
            <span>Tempo</span>
            <input
              type="number"
              value={selected.tempo ?? ''}
              onChange={(e) => patchSelected({ tempo: e.target.value ? Number(e.target.value) : undefined })}
            />
          </label>
        </div>
        <label className="sb-admin-field">
          <span>Authors</span>
          <input
            value={selected.authors ?? ''}
            onChange={(e) => patchSelected({ authors: e.target.value || undefined })}
          />
        </label>
        <label className="sb-admin-field">
          <span>Copyright</span>
          <input
            value={selected.copyright ?? ''}
            onChange={(e) => patchSelected({ copyright: e.target.value || undefined })}
          />
        </label>
        <label className="sb-admin-field">
          <span>License source</span>
          <select
            value={selected.license}
            onChange={(e) => patchSelected({ license: e.target.value as LicenseSource })}
          >
            {LICENSES.map((l) => (
              <option key={l} value={l}>
                {LICENSE_LABELS[l]}
              </option>
            ))}
          </select>
          <span className="sb-admin-hint">{LICENSE_HINTS[selected.license]}</span>
        </label>
        <label className="sb-admin-field">
          <span>CCLI song #</span>
          <input
            value={selected.ccliSong ?? ''}
            onChange={(e) => patchSelected({ ccliSong: e.target.value || undefined })}
          />
        </label>

        {warnings.length > 0 && (
          <ul className="sb-admin-warnings">
            {warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        )}

        <div className="sb-admin-grid2">
          <div>
            <span className="sb-admin-label">ChordPro</span>
            <textarea
              className="sb-admin-chordpro"
              value={selected.text}
              onChange={(e) => onTextChange(e.target.value)}
              spellCheck={false}
            />
          </div>
          <div>
            <span className="sb-admin-label">Preview</span>
            <div className="sb-admin-preview">
              <SongBody text={selected.text} options={{ chords: true, transpose: 0 }} />
            </div>
          </div>
        </div>

        <button type="button" className="sb-admin-danger" onClick={() => removeSong(selected.id)}>
          Delete song
        </button>
      </div>
    );
  }

  return (
    <div className="sb-admin-list-view">
      <div className="sb-admin-toolbar">
        <input
          className="sb-admin-search"
          placeholder="Search songs"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="button" onClick={openNew}>
          Add song
        </button>
        <label className="sb-admin-import">
          Import
          <input
            type="file"
            multiple
            accept=".cho,.chordpro,.txt"
            onChange={(e) => {
              void importFiles(e.target.files);
              e.target.value = '';
            }}
          />
        </label>
      </div>
      <ul className="sb-admin-list">
        {filtered.map((s) => (
          <li key={s.id}>
            <button type="button" className="sb-admin-list-item" onClick={() => openEdit(s.id)}>
              <span className="sb-admin-list-title">{s.title || 'Untitled'}</span>
              {s.key && <span className="sb-admin-list-meta">{s.key}</span>}
            </button>
          </li>
        ))}
        {filtered.length === 0 && <li className="sb-admin-empty">No songs yet.</li>}
      </ul>
    </div>
  );
}
