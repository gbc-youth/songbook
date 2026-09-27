// Public types for the src/song module. Mirrors docs/ARCHITECTURE.md exactly.

export interface SongInfo {
  title?: string;
  subtitle?: string;
  key?: string;
  tempo?: number;
  time?: string;
  /** "Words: … Music: …" or a plain author list. */
  authors?: string;
  copyright?: string;
  ccli?: string;
  /** First lyric line, chords stripped. */
  firstLine?: string;
}

export interface RenderOptions {
  chords: boolean;
  transpose: number;
}
