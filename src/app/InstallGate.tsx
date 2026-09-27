import { useState } from 'react';
import type { InstallGateKind } from './platform';
import { AddSquareIcon, BookIcon, CheckIcon, OpenAppIcon, ShareIcon } from './icons';

interface InstallGateProps {
  kind: Exclude<InstallGateKind, 'none'>;
  /** The original full join link (with fragment), only present for 'install-with-copy'. */
  joinLink?: string;
}

export function InstallGate({ kind, joinLink }: InstallGateProps) {
  const [copied, setCopied] = useState(false);

  if (kind === 'in-app') {
    return (
      <div className="sb-app-gate">
        <BookIcon size={28} className="sb-app-gate-mark" />
        <h1 className="sb-app-gate-title">Open this link in Safari</h1>
        <p className="sb-app-gate-body">
          This browser can't install Songbook to your home screen. Tap <strong>⋯</strong> or the
          share menu above and choose "Open in Safari" (or your regular browser), then try the
          link again.
        </p>
      </div>
    );
  }

  async function copyLink() {
    if (!joinLink) return;
    try {
      await navigator.clipboard.writeText(joinLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard permission denied or unavailable; the link stays selectable on screen isn't
      // offered here, so there is nothing further to do but leave the button as-is.
    }
  }

  return (
    <div className="sb-app-gate">
      <BookIcon size={28} className="sb-app-gate-mark" />
      <h1 className="sb-app-gate-title">Add Songbook to your Home Screen</h1>
      <p className="sb-app-gate-body">
        Songbook works best installed: it keeps your church's songs offline and opens full
        screen.
      </p>
      <ol className="sb-app-gate-steps">
        <li>
          <ShareIcon size={32} />
          <span>Tap the Share icon in Safari's toolbar</span>
        </li>
        <li>
          <AddSquareIcon size={32} />
          <span>Choose "Add to Home Screen"</span>
        </li>
        <li>
          <OpenAppIcon size={32} />
          <span>Open Songbook from your Home Screen</span>
        </li>
      </ol>
      {joinLink && (
        <>
          <button type="button" className="sb-app-btn sb-app-btn-primary" onClick={copyLink}>
            {copied ? (
              <>
                <CheckIcon size={18} /> Copied
              </>
            ) : (
              'Copy join link'
            )}
          </button>
          <p className="sb-app-gate-note">
            Once Songbook is open on your Home Screen, paste this link there to join.
          </p>
        </>
      )}
    </div>
  );
}
