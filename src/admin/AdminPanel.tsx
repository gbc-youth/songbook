import { useState } from 'react';
import { AdminProvider, useAdmin } from './context';
import { SongsTab } from './tabs/SongsTab';
import { SetsTab } from './tabs/SetsTab';
import { FilesTab } from './tabs/FilesTab';
import { ChurchTab } from './tabs/ChurchTab';
import { PublishTab } from './tabs/PublishTab';

type Tab = 'songs' | 'sets' | 'files' | 'church' | 'publish';

const TABS: { id: Tab; label: string }[] = [
  { id: 'songs', label: 'Songs' },
  { id: 'sets', label: 'Sets' },
  { id: 'files', label: 'Files' },
  { id: 'church', label: 'Church' },
  { id: 'publish', label: 'Publish' },
];

export interface AdminPanelProps {
  onClose: () => void;
}

export function AdminPanel({ onClose }: AdminPanelProps) {
  return (
    <AdminProvider>
      <AdminPanelInner onClose={onClose} />
    </AdminProvider>
  );
}

function AdminPanelInner({ onClose }: AdminPanelProps) {
  const { loading, loadError, dirty } = useAdmin();
  const [tab, setTab] = useState<Tab>('songs');

  return (
    <div className="sb-admin-panel">
      <header className="sb-admin-header">
        <button type="button" className="sb-admin-close" onClick={onClose} aria-label="Close admin">
          ✕
        </button>
        <span className="sb-admin-title">Admin</span>
        <button type="button" className="sb-admin-publish-quick" onClick={() => setTab('publish')}>
          {dirty ? 'Unpublished changes' : 'Publish'}
        </button>
      </header>

      <nav className="sb-admin-tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={t.id === tab ? 'sb-admin-tab sb-admin-tab-active' : 'sb-admin-tab'}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main className="sb-admin-body">
        {loading && <p className="sb-admin-hint">Loading…</p>}
        {loadError && <p className="sb-admin-warning">{loadError}</p>}
        {!loading && !loadError && (
          <>
            {tab === 'songs' && <SongsTab />}
            {tab === 'sets' && <SetsTab />}
            {tab === 'files' && <FilesTab />}
            {tab === 'church' && <ChurchTab />}
            {tab === 'publish' && <PublishTab />}
          </>
        )}
      </main>
    </div>
  );
}
