import type { ChurchInfo, ThemePref, ViewerDefaults } from '../core';
import { BackIcon, MinusIcon, PlusIcon } from './icons';

interface SettingsScreenProps {
  church: ChurchInfo;
  version: number;
  publishedAt: string;
  effective: ViewerDefaults;
  onThemeChange: (theme: ThemePref) => void;
  onChordsDefaultChange: (chords: boolean) => void;
  onFontScaleChange: (delta: number) => void;
  syncStatusText: string;
  syncing: boolean;
  onCheckUpdates: () => void;
  onManageSongbook: () => void;
  onLeaveSongbook: () => void;
  onBack: () => void;
}

const THEMES: { value: ThemePref; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'sepia', label: 'Sepia' },
  { value: 'dark', label: 'Dark' },
];

export function SettingsScreen(props: SettingsScreenProps) {
  function handleLeave() {
    if (window.confirm('Leave this songbook? Its songs and files will be removed from this device.')) {
      props.onLeaveSongbook();
    }
  }

  return (
    <div className="sb-app-settings">
      <header className="sb-app-topbar">
        <button type="button" className="sb-app-icon-btn" onClick={props.onBack} aria-label="Back">
          <BackIcon />
        </button>
        <span className="sb-app-topbar-title">Settings</span>
        <span className="sb-app-topbar-spacer" />
      </header>

      <section className="sb-app-settings-section">
        <h2 className="sb-app-settings-heading">Appearance</h2>
        <div className="sb-app-segmented" role="radiogroup" aria-label="Theme">
          {THEMES.map((t) => (
            <button
              key={t.value}
              type="button"
              role="radio"
              aria-checked={props.effective.theme === t.value}
              className={`sb-app-segment${props.effective.theme === t.value ? ' sb-app-segment-active' : ''}`}
              onClick={() => props.onThemeChange(t.value)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </section>

      <section className="sb-app-settings-section">
        <h2 className="sb-app-settings-heading">Reading</h2>
        <label className="sb-app-settings-row">
          <span>Show chords by default</span>
          <input
            type="checkbox"
            checked={props.effective.chords}
            onChange={(e) => props.onChordsDefaultChange(e.target.checked)}
          />
        </label>
        <div className="sb-app-settings-row">
          <span>Text size</span>
          <div className="sb-app-toolbar-group">
            <button
              type="button"
              className="sb-app-toolbar-btn"
              onClick={() => props.onFontScaleChange(-0.1)}
              aria-label="Smaller text"
            >
              <MinusIcon />
            </button>
            <span>{Math.round(props.effective.fontScale * 100)}%</span>
            <button
              type="button"
              className="sb-app-toolbar-btn"
              onClick={() => props.onFontScaleChange(0.1)}
              aria-label="Larger text"
            >
              <PlusIcon />
            </button>
          </div>
        </div>
      </section>

      <section className="sb-app-settings-section">
        <h2 className="sb-app-settings-heading">Sync</h2>
        <p className="sb-app-body-copy">{props.syncStatusText}</p>
        <button
          type="button"
          className="sb-app-btn"
          onClick={props.onCheckUpdates}
          disabled={props.syncing}
        >
          {props.syncing ? 'Checking…' : 'Check for updates'}
        </button>
      </section>

      <section className="sb-app-settings-section">
        <h2 className="sb-app-settings-heading">This songbook</h2>
        <p className="sb-app-body-copy">{props.church.name}</p>
        <p className="sb-app-body-copy sb-app-muted">
          Version {props.version} · published {props.publishedAt.slice(0, 10)}
        </p>
        <button type="button" className="sb-app-btn" onClick={props.onManageSongbook}>
          Manage songbook
        </button>
      </section>

      <section className="sb-app-settings-section">
        <button type="button" className="sb-app-link-btn sb-app-danger" onClick={handleLeave}>
          Leave this songbook
        </button>
      </section>
    </div>
  );
}
