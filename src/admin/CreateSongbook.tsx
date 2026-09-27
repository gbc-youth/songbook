import { useState } from 'react';
import * as core from '../core';
import type { JoinInfo, Manifest } from '../core';
import {
  defaultDraft,
  defaultGithubTarget,
  defaultZipTarget,
  initState,
  saveTarget,
  type GithubTarget,
  type PublishTarget,
  type ZipTarget,
} from './db';
import { publishToGithub } from './publish/github';
import { buildZipBundle } from './publish/zip';
import { triggerDownload } from './util';

export interface CreateSongbookProps {
  onCreated: (info: JoinInfo) => void;
  onCancel: () => void;
}

export function CreateSongbook({ onCreated, onCancel }: CreateSongbookProps) {
  const [churchName, setChurchName] = useState('');
  const [kind, setKind] = useState<'github' | 'zip'>('github');
  const [github, setGithub] = useState<GithubTarget>(defaultGithubTarget());
  const [zip, setZip] = useState<ZipTarget>(defaultZipTarget());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!churchName.trim()) {
      setError('Church name is required.');
      return;
    }
    if (kind === 'github' && (!github.owner || !github.repo || !github.token)) {
      setError('Owner, repository and token are required.');
      return;
    }
    if (kind === 'zip' && !zip.baseUrl.trim()) {
      setError('The public base URL is required.');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const key = core.generateKey();
      const draft = defaultDraft(churchName.trim());
      let info: JoinInfo;
      let manifest: Manifest;
      let target: PublishTarget;

      if (kind === 'github') {
        const built = await core.buildBundle(key, draft, null);
        const result = await publishToGithub(github, built, built.manifest.version);
        info = { source: result.sourceUrl, key };
        manifest = built.manifest;
        target = github;
      } else {
        const built = await buildZipBundle(key, draft, null, null);
        triggerDownload(built.bytes, 'songbook.zip', 'application/zip');
        const source = zip.baseUrl.endsWith('/') ? zip.baseUrl : `${zip.baseUrl}/`;
        info = { source, key };
        manifest = built.manifest;
        target = zip;
      }

      await initState(draft, manifest);
      await saveTarget(target);
      onCreated(info);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="sb-admin-panel sb-admin-create">
      <header className="sb-admin-header">
        <span className="sb-admin-title">New songbook</span>
      </header>
      <div className="sb-admin-body">
        <label className="sb-admin-field">
          <span>Church name</span>
          <input value={churchName} onChange={(e) => setChurchName(e.target.value)} />
        </label>

        <h3 className="sb-admin-subhead">Where will it be hosted?</h3>
        <div className="sb-admin-field-inline">
          <label>
            <input type="radio" name="create-target-kind" checked={kind === 'github'} onChange={() => setKind('github')} />
            GitHub
          </label>
          <label>
            <input type="radio" name="create-target-kind" checked={kind === 'zip'} onChange={() => setKind('zip')} />
            Download .zip
          </label>
        </div>

        {kind === 'github' && (
          <div className="sb-admin-target-form">
            <p className="sb-admin-hint">
              Create a token at{' '}
              <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noreferrer">
                github.com/settings/personal-access-tokens/new
              </a>
              : 1) name it and pick this one repository, 2) under Repository permissions set{' '}
              <strong>Contents: Read and write</strong>, 3) generate it and paste it below.
            </p>
            <label className="sb-admin-field">
              <span>Owner</span>
              <input value={github.owner} onChange={(e) => setGithub({ ...github, owner: e.target.value })} />
            </label>
            <label className="sb-admin-field">
              <span>Repository</span>
              <input value={github.repo} onChange={(e) => setGithub({ ...github, repo: e.target.value })} />
            </label>
            <label className="sb-admin-field">
              <span>Branch</span>
              <input value={github.branch} onChange={(e) => setGithub({ ...github, branch: e.target.value })} />
            </label>
            <label className="sb-admin-field">
              <span>Path</span>
              <input value={github.path} onChange={(e) => setGithub({ ...github, path: e.target.value })} />
            </label>
            <label className="sb-admin-field">
              <span>Token</span>
              <input type="password" value={github.token} onChange={(e) => setGithub({ ...github, token: e.target.value })} />
            </label>
          </div>
        )}

        {kind === 'zip' && (
          <div className="sb-admin-target-form">
            <p className="sb-admin-hint">
              Creating downloads a starter .zip. Extract it to any static host with CORS, then give the public base
              URL it will live at.
            </p>
            <label className="sb-admin-field">
              <span>Public base URL</span>
              <input
                placeholder="https://example.com/songbook/"
                value={zip.baseUrl}
                onChange={(e) => setZip({ ...zip, baseUrl: e.target.value })}
              />
            </label>
          </div>
        )}

        {error && <p className="sb-admin-warning">{error}</p>}

        <div className="sb-admin-field-inline">
          <button type="button" className="sb-admin-primary" disabled={busy} onClick={() => void submit()}>
            {busy ? 'Creating…' : 'Create songbook'}
          </button>
          <button type="button" disabled={busy} onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
