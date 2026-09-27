/**
 * In-memory screen state, persisted into history.state (never the URL hash —
 * the hash is reserved for join links and is cleared on boot). Each navigation
 * pushes one history entry so the browser/Android back button walks screens
 * naturally; popstate just reads history.state back into React state.
 */

export type LibraryTab = 'songs' | 'sets' | 'files';

export interface SongContext {
  setId: string;
  index: number;
}

export type Screen =
  | { name: 'install-gate' }
  | { name: 'welcome' }
  | { name: 'library'; tab: LibraryTab }
  | { name: 'set'; setId: string }
  | { name: 'song'; songId: string; context?: SongContext }
  | { name: 'file'; fileId: string }
  | { name: 'settings' }
  | { name: 'admin' }
  | { name: 'create-songbook' };

interface HistoryEntryState {
  sbScreen: Screen;
}

function isScreenState(state: unknown): state is HistoryEntryState {
  return !!state && typeof state === 'object' && 'sbScreen' in state;
}

export function readScreen(state: unknown): Screen | null {
  return isScreenState(state) ? state.sbScreen : null;
}

export function pushScreen(screen: Screen): void {
  const entry: HistoryEntryState = { sbScreen: screen };
  history.pushState(entry, '');
}

export function replaceScreen(screen: Screen): void {
  const entry: HistoryEntryState = { sbScreen: screen };
  history.replaceState(entry, '');
}
