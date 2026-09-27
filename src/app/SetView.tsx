import type { SetList, SongMeta } from '../core';
import type { SongContext } from './router';
import { BackIcon } from './icons';

interface SetViewProps {
  set: SetList;
  songs: Map<string, SongMeta>;
  onBack: () => void;
  onOpenSong: (songId: string, context: SongContext) => void;
}

export function SetView({ set, songs, onBack, onOpenSong }: SetViewProps) {
  return (
    <div className="sb-app-setview">
      <header className="sb-app-topbar">
        <button type="button" className="sb-app-icon-btn" onClick={onBack} aria-label="Back">
          <BackIcon />
        </button>
        <span className="sb-app-topbar-title">{set.title}</span>
        <span className="sb-app-topbar-spacer" />
      </header>
      {set.date && <p className="sb-app-set-date-line">{set.date}</p>}
      <ol className="sb-app-set-items">
        {set.items.map((item, index) => {
          const song = songs.get(item.songId);
          return (
            <li key={`${item.songId}-${index}`}>
              <button
                type="button"
                className="sb-app-set-item-row"
                onClick={() => onOpenSong(item.songId, { setId: set.id, index })}
              >
                <span className="sb-app-set-item-title">{song?.title ?? item.songId}</span>
                {item.key && <span className="sb-app-set-item-key">{item.key}</span>}
              </button>
              {item.note && <p className="sb-app-set-item-note">{item.note}</p>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
