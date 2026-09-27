import { useEffect, useMemo } from 'react';
import type { ThemePref } from '../../core';
import { useAdmin } from '../context';
import { readFileAsBytes } from '../util';

const THEMES: ThemePref[] = ['system', 'light', 'sepia', 'dark'];

export function ChurchTab() {
  const { draft, updateDraft } = useAdmin();
  const { church, defaults } = draft;

  const logoUrl = useMemo(() => {
    if (!church.logo) return null;
    return URL.createObjectURL(new Blob([church.logo.bytes.slice()], { type: church.logo.type }));
  }, [church.logo]);
  useEffect(() => {
    return () => {
      if (logoUrl) URL.revokeObjectURL(logoUrl);
    };
  }, [logoUrl]);

  async function onLogoChange(file: File | undefined) {
    if (!file) return;
    const bytes = await readFileAsBytes(file);
    updateDraft((d) => ({ ...d, church: { ...d.church, logo: { bytes, type: file.type } } }));
  }

  return (
    <div className="sb-admin-editor">
      <label className="sb-admin-field">
        <span>Church name</span>
        <input
          value={church.name}
          onChange={(e) => updateDraft((d) => ({ ...d, church: { ...d.church, name: e.target.value } }))}
        />
      </label>

      <div className="sb-admin-field">
        <span>Logo</span>
        {logoUrl && <img className="sb-admin-logo-preview" src={logoUrl} alt="Church logo" />}
        <input type="file" accept="image/png,image/jpeg,image/svg+xml" onChange={(e) => void onLogoChange(e.target.files?.[0])} />
      </div>

      <label className="sb-admin-field">
        <span>CCLI license #</span>
        <input
          value={church.ccliLicense ?? ''}
          onChange={(e) =>
            updateDraft((d) => ({ ...d, church: { ...d.church, ccliLicense: e.target.value || undefined } }))
          }
        />
      </label>

      <label className="sb-admin-field">
        <span>License expiry</span>
        <input
          type="date"
          value={church.licenseExpires ?? ''}
          onChange={(e) =>
            updateDraft((d) => ({ ...d, church: { ...d.church, licenseExpires: e.target.value || undefined } }))
          }
        />
      </label>

      <label className="sb-admin-field">
        <span>Website</span>
        <input
          value={church.website ?? ''}
          onChange={(e) => updateDraft((d) => ({ ...d, church: { ...d.church, website: e.target.value || undefined } }))}
        />
      </label>

      <h3 className="sb-admin-subhead">Viewer defaults</h3>

      <label className="sb-admin-field">
        <span>Theme</span>
        <select
          value={defaults.theme}
          onChange={(e) => updateDraft((d) => ({ ...d, defaults: { ...d.defaults, theme: e.target.value as ThemePref } }))}
        >
          {THEMES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>

      <label className="sb-admin-field sb-admin-field-inline">
        <input
          type="checkbox"
          checked={defaults.chords}
          onChange={(e) => updateDraft((d) => ({ ...d, defaults: { ...d.defaults, chords: e.target.checked } }))}
        />
        <span>Chords on by default</span>
      </label>

      <label className="sb-admin-field">
        <span>Font scale</span>
        <input
          type="range"
          min="0.8"
          max="1.6"
          step="0.05"
          value={defaults.fontScale}
          onChange={(e) => updateDraft((d) => ({ ...d, defaults: { ...d.defaults, fontScale: Number(e.target.value) } }))}
        />
        <span className="sb-admin-hint">{defaults.fontScale.toFixed(2)}×</span>
      </label>
    </div>
  );
}
