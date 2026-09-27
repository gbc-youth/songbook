import { useMemo, useState } from 'react';
import type { FileMeta, SetList, SongMeta } from '../core';
import type { LibraryTab, SongContext } from './router';
import { lyricLines, normalizeForSearch, searchSongs } from './search';
import { BookIcon, SearchIcon, SettingsIcon } from './icons';

interface LibraryProps {
  churchName: string;
  churchLogoUrl: string | null;
  tab: LibraryTab;
  onChangeTab: (tab: LibraryTab) => void;
  songs: SongMeta[];
  /** ChordPro text by song id, for searching lyrics. Songs missing here are searched by metadata. */
  songTexts: Map<string, string>;
  sets: SetList[];
  files: FileMeta[];
  licenseExpired: boolean;
  licenseExpiresAt?: string;
  updateNote: string | null;
  onOpenSong: (songId: string, context?: SongContext) => void;
  onOpenSet: (setId: string) => void;
  onOpenFile: (fileId: string) => void;
  onOpenSettings: () => void;
}

function sortedSets(sets: SetList[]): SetList[] {
  return [...sets].sort((a, b) => {
    if (!a.date && !b.date) return a.title.localeCompare(b.title);
    if (!a.date) return 1;
    if (!b.date) return -1;
    return b.date.localeCompare(a.date);
  });
}

export function Library(props: LibraryProps) {
  const { tab, onChangeTab, songs, sets, files, onOpenSong, onOpenSet, onOpenFile, onOpenSettings } = props;
  const [query, setQuery] = useState('');

  const searchDocs = useMemo(
    () => songs.map((song) => ({ song, lines: lyricLines(props.songTexts.get(song.id) ?? '') })),
    [songs, props.songTexts],
  );

  const visibleSongs = useMemo(() => {
    if (!query.trim()) {
      return [...songs].sort((a, b) => a.title.localeCompare(b.title)).map((song) => ({ song, snippet: undefined as string | undefined }));
    }
    return searchSongs(searchDocs, query);
  }, [songs, searchDocs, query]);

  const visibleSets = useMemo(() => {
    const q = normalizeForSearch(query.trim());
    const filtered = q ? sets.filter((s) => normalizeForSearch(s.title).includes(q)) : sets;
    return sortedSets(filtered);
  }, [sets, query]);

  const visibleFiles = useMemo(() => {
    const q = normalizeForSearch(query.trim());
    const filtered = q ? files.filter((f) => normalizeForSearch(f.title).includes(q)) : files;
    return [...filtered].sort((a, b) => a.title.localeCompare(b.title));
  }, [files, query]);

  return (
    <div className="sb-app-library">
      <header className="sb-app-library-header">
        <div className="sb-app-church">
          {props.churchLogoUrl ? (
            <img src={props.churchLogoUrl} alt="" className="sb-app-church-logo" />
          ) : (
            <BookIcon size={22} />
          )}
          <span className="sb-app-church-name">{props.churchName}</span>
        </div>
        <button
          type="button"
          className="sb-app-icon-btn"
          onClick={onOpenSettings}
          aria-label="Settings"
        >
          <SettingsIcon />
        </button>
      </header>

      {props.updateNote && <p className="sb-app-update-note">{props.updateNote}</p>}
      {props.licenseExpired && (
        <p className="sb-app-notice">
          The church's song license expired on {props.licenseExpiresAt} — licensed songs are
          hidden.
        </p>
      )}

      <div className="sb-app-search">
        <SearchIcon size={18} className="sb-app-search-icon" />
        <input
          type="search"
          className="sb-app-search-input"
          placeholder="Search titles, lyrics, authors"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search songs"
        />
      </div>

      <div className="sb-app-tabs" role="tablist">
        {(['songs', 'sets', 'files'] as const).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            className={`sb-app-tab${tab === t ? ' sb-app-tab-active' : ''}`}
            onClick={() => onChangeTab(t)}
          >
            {t === 'songs' ? 'Songs' : t === 'sets' ? 'Sets' : 'Files'}
          </button>
        ))}
      </div>

      {tab === 'songs' && (
        <ul className="sb-app-song-list">
          {visibleSongs.map(({ song, snippet }) => (
            <li key={song.id}>
              <button type="button" className="sb-app-song-row" onClick={() => onOpenSong(song.id)}>
                <span className="sb-app-song-title">{song.title}</span>
                {snippet ? (
                  <span className="sb-app-song-first-line sb-app-song-snippet">{snippet}</span>
                ) : (
                  song.firstLine && <span className="sb-app-song-first-line">{song.firstLine}</span>
                )}
              </button>
            </li>
          ))}
          {visibleSongs.length === 0 && <li className="sb-app-empty">No songs found.</li>}
        </ul>
      )}

      {tab === 'sets' && (
        <ul className="sb-app-set-list">
          {visibleSets.map((set) => (
            <li key={set.id}>
              <button type="button" className="sb-app-set-row" onClick={() => onOpenSet(set.id)}>
                <span className="sb-app-set-title">{set.title}</span>
                {set.date && <span className="sb-app-set-date">{set.date}</span>}
              </button>
            </li>
          ))}
          {visibleSets.length === 0 && <li className="sb-app-empty">No sets yet.</li>}
        </ul>
      )}

      {tab === 'files' && (
        <ul className="sb-app-file-list">
          {visibleFiles.map((file) => (
            <li key={file.id}>
              <button type="button" className="sb-app-file-row" onClick={() => onOpenFile(file.id)}>
                <span className="sb-app-file-title">{file.title}</span>
              </button>
            </li>
          ))}
          {visibleFiles.length === 0 && <li className="sb-app-empty">No files yet.</li>}
        </ul>
      )}
    </div>
  );
}
