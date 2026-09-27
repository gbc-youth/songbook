import type { DraftFile } from '../../core';
import { useAdmin } from '../context';
import { MAX_FILE_SIZE, baseName, formatBytes, readFileAsBytes } from '../util';

export function FilesTab() {
  const { draft, updateDraft } = useAdmin();

  async function uploadFiles(fileList: FileList | null) {
    if (!fileList) return;
    const added: DraftFile[] = [];
    for (const file of Array.from(fileList)) {
      const bytes = await readFileAsBytes(file);
      added.push({
        id: crypto.randomUUID(),
        title: baseName(file.name),
        bytes,
        type: file.type || 'application/pdf',
        updatedAt: new Date().toISOString(),
      });
    }
    if (added.length) updateDraft((d) => ({ ...d, files: [...d.files, ...added] }));
  }

  function patch(id: string, p: Partial<DraftFile>) {
    updateDraft((d) => ({
      ...d,
      files: d.files.map((f) => (f.id === id ? { ...f, ...p, updatedAt: new Date().toISOString() } : f)),
    }));
  }

  function remove(id: string) {
    if (!confirm('Delete this file?')) return;
    updateDraft((d) => ({ ...d, files: d.files.filter((f) => f.id !== id) }));
  }

  return (
    <div className="sb-admin-list-view">
      <div className="sb-admin-toolbar">
        <label className="sb-admin-import">
          Upload PDF
          <input
            type="file"
            multiple
            accept="application/pdf"
            onChange={(e) => {
              void uploadFiles(e.target.files);
              e.target.value = '';
            }}
          />
        </label>
      </div>
      <ul className="sb-admin-list">
        {draft.files.map((f) => (
          <li key={f.id} className="sb-admin-file-row">
            <input className="sb-admin-file-title" value={f.title} onChange={(e) => patch(f.id, { title: e.target.value })} />
            <select value={f.songId ?? ''} onChange={(e) => patch(f.id, { songId: e.target.value || undefined })}>
              <option value="">(not attached to a song)</option>
              {draft.songs.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title || 'Untitled'}
                </option>
              ))}
            </select>
            <span className="sb-admin-file-size">{formatBytes(f.bytes.byteLength)}</span>
            {f.bytes.byteLength > MAX_FILE_SIZE && <span className="sb-admin-warning">large file</span>}
            <button type="button" aria-label="Delete" onClick={() => remove(f.id)}>
              Delete
            </button>
          </li>
        ))}
        {draft.files.length === 0 && <li className="sb-admin-empty">No files yet.</li>}
      </ul>
    </div>
  );
}
