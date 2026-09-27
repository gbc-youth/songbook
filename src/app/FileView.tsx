import { useEffect, useState } from 'react';
import type { FileMeta } from '../core';
import { getBlobBytes } from '../core';
import { BackIcon, DownloadIcon } from './icons';

interface FileViewProps {
  file: FileMeta;
  onBack: () => void;
}

export function FileView({ file, onBack }: FileViewProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    (async () => {
      const bytes = await getBlobBytes(file.content);
      if (cancelled) return;
      if (!bytes) {
        setError(true);
        return;
      }
      const blob = new Blob([Uint8Array.from(bytes)], { type: file.content.type || 'application/pdf' });
      objectUrl = URL.createObjectURL(blob);
      setUrl(objectUrl);
    })();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  return (
    <div className="sb-app-fileview">
      <header className="sb-app-topbar">
        <button type="button" className="sb-app-icon-btn" onClick={onBack} aria-label="Back">
          <BackIcon />
        </button>
        <span className="sb-app-topbar-title">{file.title}</span>
        {url && (
          <a className="sb-app-icon-btn" href={url} download={`${file.title}.pdf`} aria-label="Download">
            <DownloadIcon />
          </a>
        )}
      </header>
      {error && <p className="sb-app-error">This file isn't available offline yet.</p>}
      {url && (
        <object data={url} type="application/pdf" className="sb-app-file-frame">
          <p className="sb-app-body-copy">
            Your browser can't preview this PDF. <a href={url}>Download it</a> instead.
          </p>
        </object>
      )}
    </div>
  );
}
