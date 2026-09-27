import { useState } from 'react';
import type { JoinInfo } from '../core';
import { parseJoinFragment } from '../core';
// The demo key is published alongside the demo bundle by scripts/build-demo.ts.
// Read at build time; if the file doesn't exist yet this import fails until it does.
import demoKey from '../../demo/key.txt?raw';
import { BookIcon } from './icons';

// A songbook of public-domain hymns, so people can see the app before their church sets one up.
const DEMO_SOURCE = 'https://gbc-youth.github.io/songbook/demo/';

interface WelcomeProps {
  join: (info: JoinInfo, onProgress: (done: number, total: number) => void) => Promise<void>;
  onCreateSongbook: () => void;
  /** Surfaced when a join fragment arrived at boot but joining failed (e.g. offline). */
  initialError?: string;
}

export function Welcome({ join, onCreateSongbook, initialError }: WelcomeProps) {
  const [pasted, setPasted] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(initialError ?? null);
  const canPaste = typeof navigator !== 'undefined' && !!navigator.clipboard?.readText;

  async function runJoin(info: JoinInfo) {
    setError(null);
    setBusy(true);
    setProgress({ done: 0, total: 1 });
    try {
      await join(info, (done, total) => setProgress({ done, total }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not join this songbook.');
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  function handleJoinPasted() {
    const info = parseJoinFragment(pasted.trim());
    if (!info) {
      setError("That doesn't look like a join link.");
      return;
    }
    void runJoin(info);
  }

  async function handlePasteButton() {
    try {
      const text = await navigator.clipboard.readText();
      setPasted(text);
    } catch {
      // Clipboard read denied; the user can still paste manually into the field.
    }
  }

  function handleDemo() {
    void runJoin({ source: DEMO_SOURCE, key: demoKey.trim() });
  }

  return (
    <div className="sb-app-welcome">
      <BookIcon size={30} className="sb-app-welcome-mark" />
      <h1 className="sb-app-welcome-title">Songbook</h1>
      <p className="sb-app-welcome-body">
        Your church's lyrics and chords, offline, from a link your admin shares with you.
      </p>

      <button
        type="button"
        className="sb-app-btn sb-app-btn-primary sb-app-explore-btn"
        onClick={handleDemo}
        disabled={busy}
      >
        Explore public hymns
      </button>
      <p className="sb-app-explore-caption">No link needed. See how it works with hymns anyone may sing.</p>

      <div className="sb-app-rule" />

      <label className="sb-app-field-label" htmlFor="sb-join-input">
        Have a join link?
      </label>
      <div className="sb-app-join-row">
        <input
          id="sb-join-input"
          className="sb-app-input"
          type="text"
          inputMode="url"
          placeholder="Paste the link your church sent you"
          value={pasted}
          onChange={(e) => setPasted(e.target.value)}
          disabled={busy}
        />
        {canPaste && (
          <button
            type="button"
            className="sb-app-btn"
            onClick={handlePasteButton}
            disabled={busy}
          >
            Paste
          </button>
        )}
      </div>
      <button
        type="button"
        className="sb-app-btn sb-app-join-btn"
        onClick={handleJoinPasted}
        disabled={busy || !pasted.trim()}
      >
        Join
      </button>

      {progress && (
        <p className="sb-app-progress" role="status">
          Joining… {progress.done}/{progress.total}
        </p>
      )}
      {error && (
        <p className="sb-app-error" role="alert">
          {error}
        </p>
      )}

      <button type="button" className="sb-app-link-btn" onClick={onCreateSongbook} disabled={busy}>
        Create a songbook
      </button>
    </div>
  );
}
