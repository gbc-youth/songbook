import { useEffect, useState } from 'react';
import type { ChurchInfo, SetList, SongMeta } from '../core';
import { SongBody, transposeKey } from '../song';
import type { SongContext } from './router';
import { BackIcon, MinusIcon, PlusIcon } from './icons';

interface SongViewProps {
  song: SongMeta;
  text: string | null;
  church: ChurchInfo;
  context?: SongContext;
  set?: SetList;
  chordsDefault: boolean;
  fontScale: number;
  transpose: number;
  onChangeTranspose: (semitones: number) => void;
  onChangeFontScale: (delta: number) => void;
  onBack: () => void;
  onNavigateSetSong: (songId: string, context: SongContext) => void;
}

/** Wake-lock is best-effort: unsupported browsers (Firefox, older Safari) just don't dim-lock. */
function useWakeLock() {
  useEffect(() => {
    let lock: { release(): Promise<void> } | null = null;
    let cancelled = false;

    async function acquire() {
      const wakeLock = (navigator as Navigator & { wakeLock?: { request(type: 'screen'): Promise<any> } })
        .wakeLock;
      if (!wakeLock) return;
      try {
        const sentinel = await wakeLock.request('screen');
        if (cancelled) {
          void sentinel.release();
          return;
        }
        lock = sentinel;
      } catch {
        // Denied or unsupported in this context; nothing to fall back to.
      }
    }

    function onVisibility() {
      if (document.visibilityState === 'visible' && !lock) void acquire();
    }

    void acquire();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      if (lock) void lock.release();
    };
  }, []);
}

export function SongView(props: SongViewProps) {
  const { song, context, set, onNavigateSetSong } = props;
  const [chords, setChords] = useState(props.chordsDefault);
  useWakeLock();

  const currentKey = song.key ? transposeKey(song.key, props.transpose) : undefined;

  function goAdjacent(direction: 1 | -1) {
    if (!context || !set) return;
    const nextIndex = context.index + direction;
    const item = set.items[nextIndex];
    if (!item) return;
    onNavigateSetSong(item.songId, { setId: set.id, index: nextIndex });
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const forward = e.key === 'ArrowRight' || e.key === 'PageDown';
      const backward = e.key === 'ArrowLeft' || e.key === 'PageUp';
      if (!forward && !backward) return;
      e.preventDefault();
      const amount = window.innerHeight * 0.85;
      const atBottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4;
      const atTop = window.scrollY <= 4;
      if (forward) {
        if (atBottom) goAdjacent(1);
        else window.scrollBy({ top: amount, behavior: 'smooth' });
      } else {
        if (atTop) goAdjacent(-1);
        else window.scrollBy({ top: -amount, behavior: 'smooth' });
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context, set]);

  const licenseLine =
    song.license === 'ccli' && song.ccliSong
      ? `CCLI Song # ${song.ccliSong}${props.church.ccliLicense ? ` · CCLI License # ${props.church.ccliLicense}` : ''}`
      : song.license === 'public-domain'
        ? 'Public domain'
        : null;

  return (
    <div className="sb-app-songview">
      <header className="sb-app-topbar">
        <button type="button" className="sb-app-icon-btn" onClick={props.onBack} aria-label="Back">
          <BackIcon />
        </button>
        <span className="sb-app-topbar-title">{song.title}</span>
        <span className="sb-app-topbar-spacer" />
      </header>

      <div className="sb-app-song-content">
        <h1 className="sb-app-song-title-large">{song.title}</h1>
        <p className="sb-app-song-meta">
          {[currentKey, song.time, song.tempo ? `${song.tempo} bpm` : undefined]
            .filter(Boolean)
            .join(' · ')}
        </p>

        {props.text != null ? (
          <SongBody text={props.text} options={{ chords, transpose: props.transpose }} />
        ) : (
          <p className="sb-app-body-copy">Loading…</p>
        )}

        <footer className="sb-app-song-footer">
          {song.authors && <p>{song.authors}</p>}
          {song.copyright && <p>{song.copyright}</p>}
          {licenseLine && <p>{licenseLine}</p>}
        </footer>
      </div>

      <div className="sb-app-toolbar">
        <button
          type="button"
          className={`sb-app-toolbar-btn sb-app-chords-toggle${chords ? ' sb-app-toolbar-btn-on' : ''}`}
          onClick={() => setChords((c) => !c)}
          aria-pressed={chords}
        >
          Chords
        </button>

        <div className="sb-app-toolbar-group" aria-label="Transpose">
          <button
            type="button"
            className="sb-app-toolbar-btn"
            onClick={() => props.onChangeTranspose(props.transpose - 1)}
            aria-label="Transpose down"
          >
            <MinusIcon />
          </button>
          <button
            type="button"
            className="sb-app-transpose-key"
            onClick={() => props.transpose !== 0 && props.onChangeTranspose(0)}
            aria-label={props.transpose !== 0 ? `Key ${currentKey ?? ''}, tap to reset` : `Key ${currentKey ?? ''}`}
          >
            {currentKey ?? '—'}
          </button>
          <button
            type="button"
            className="sb-app-toolbar-btn"
            onClick={() => props.onChangeTranspose(props.transpose + 1)}
            aria-label="Transpose up"
          >
            <PlusIcon />
          </button>
        </div>

        <div className="sb-app-toolbar-group" aria-label="Text size">
          <button
            type="button"
            className="sb-app-toolbar-btn"
            onClick={() => props.onChangeFontScale(-0.1)}
            aria-label="Smaller text"
          >
            <span className="sb-app-size-a sb-app-size-a-small">A</span>
          </button>
          <button
            type="button"
            className="sb-app-toolbar-btn"
            onClick={() => props.onChangeFontScale(0.1)}
            aria-label="Larger text"
          >
            <span className="sb-app-size-a sb-app-size-a-large">A</span>
          </button>
        </div>
      </div>
    </div>
  );
}
