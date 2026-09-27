import { useState } from 'react';
import * as core from '../../core';
import { useAdmin } from '../context';
import { defaultGithubTarget, defaultZipTarget, type GithubTarget, type ZipTarget } from '../db';

function appUrl(): string {
  return location.origin + (import.meta.env.BASE_URL ?? '/');
}

export function PublishTab() {
  const { target, setTarget, dirty, publishing, publishError, publish, rotateKey, lastPublish } = useAdmin();
  const [copied, setCopied] = useState(false);
  const [rotateConfirm, setRotateConfirm] = useState(false);

  const kind = target?.kind ?? 'github';

  function setKind(k: 'github' | 'zip') {
    if (k === 'github') setTarget(target && target.kind === 'github' ? target : defaultGithubTarget());
    else setTarget(target && target.kind === 'zip' ? target : defaultZipTarget());
  }

  function patchGithub(patch: Partial<GithubTarget>) {
    const base = target && target.kind === 'github' ? target : defaultGithubTarget();
    setTarget({ ...base, ...patch });
  }

  function patchZip(patch: Partial<ZipTarget>) {
    const base = target && target.kind === 'zip' ? target : defaultZipTarget();
    setTarget({ ...base, ...patch });
  }

  const link = lastPublish ? core.buildJoinLink(appUrl(), lastPublish.joinInfo) : null;

  async function copyLink() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard API unavailable; the link is still shown for manual copy
    }
  }

  return (
    <div className="sb-admin-editor">
      <div className="sb-admin-dirty-row">
        {dirty ? (
          <span className="sb-admin-dirty">Unpublished changes</span>
        ) : (
          <span className="sb-admin-hint">Published — up to date</span>
        )}
      </div>

      <h3 className="sb-admin-subhead">Publish target</h3>
      <div className="sb-admin-field-inline">
        <label>
          <input type="radio" name="target-kind" checked={kind === 'github'} onChange={() => setKind('github')} />
          GitHub
        </label>
        <label>
          <input type="radio" name="target-kind" checked={kind === 'zip'} onChange={() => setKind('zip')} />
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
            <input
              value={target?.kind === 'github' ? target.owner : ''}
              onChange={(e) => patchGithub({ owner: e.target.value })}
            />
          </label>
          <label className="sb-admin-field">
            <span>Repository</span>
            <input
              value={target?.kind === 'github' ? target.repo : ''}
              onChange={(e) => patchGithub({ repo: e.target.value })}
            />
          </label>
          <label className="sb-admin-field">
            <span>Branch</span>
            <input
              value={target?.kind === 'github' ? target.branch : 'main'}
              onChange={(e) => patchGithub({ branch: e.target.value })}
            />
          </label>
          <label className="sb-admin-field">
            <span>Path</span>
            <input
              value={target?.kind === 'github' ? target.path : 'songbook'}
              onChange={(e) => patchGithub({ path: e.target.value })}
            />
          </label>
          <label className="sb-admin-field">
            <span>Token</span>
            <input
              type="password"
              value={target?.kind === 'github' ? target.token : ''}
              onChange={(e) => patchGithub({ token: e.target.value })}
            />
          </label>
        </div>
      )}

      {kind === 'zip' && (
        <div className="sb-admin-target-form">
          <p className="sb-admin-hint">
            Publishing downloads a .zip with everything the bundle needs. Extract it to any static host with CORS
            (GitHub Pages, Cloudflare R2, S3…) and give the public base URL below so join links point at it.
          </p>
          <label className="sb-admin-field">
            <span>Public base URL</span>
            <input
              placeholder="https://example.com/songbook/"
              value={target?.kind === 'zip' ? target.baseUrl : ''}
              onChange={(e) => patchZip({ baseUrl: e.target.value })}
            />
          </label>
        </div>
      )}

      <button type="button" className="sb-admin-primary" disabled={publishing || !target} onClick={() => void publish()}>
        {publishing ? 'Publishing…' : 'Publish'}
      </button>
      {target?.kind === 'github' && (
        <p className="sb-admin-hint">raw.githubusercontent.com caches for a few minutes — updates may take a little while to show up.</p>
      )}
      {publishError && <p className="sb-admin-warning">{publishError}</p>}

      {link && (
        <div className="sb-admin-join-link">
          <h3 className="sb-admin-subhead">Join link</h3>
          <p className="sb-admin-warning">
            Anyone with this link can read the songbook. To cut off an old link, rotate the key below — it makes a new
            link and the old one stops working.
          </p>
          <code className="sb-admin-link-text">{link}</code>
          <button type="button" onClick={() => void copyLink()}>
            {copied ? 'Copied' : 'Copy link'}
          </button>
          <p className="sb-admin-hint">QR code: future work — copy the link and share it directly for now.</p>
        </div>
      )}

      <h3 className="sb-admin-subhead">Rotate key</h3>
      <p className="sb-admin-hint">
        Generates a new key, republishes every file under it, and gives you a new join link. Old links stop working
        once devices next need it. Use this if a link leaked or a device should lose access.
      </p>
      {rotateConfirm ? (
        <div className="sb-admin-field-inline">
          <button
            type="button"
            className="sb-admin-danger"
            disabled={publishing || !target}
            onClick={() => {
              setRotateConfirm(false);
              void rotateKey();
            }}
          >
            Confirm rotate
          </button>
          <button type="button" onClick={() => setRotateConfirm(false)}>
            Cancel
          </button>
        </div>
      ) : (
        <button type="button" disabled={publishing || !target} onClick={() => setRotateConfirm(true)}>
          Rotate key
        </button>
      )}
    </div>
  );
}
