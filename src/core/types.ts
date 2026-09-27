// Shared contract between core, song, admin and app. Change only by agreement.

/** Where a church's bundle lives and the key that opens it. Travels in the join link's fragment. */
export interface JoinInfo {
  /** Absolute base URL of the bundle, ending with '/'. index.json and blobs/ live under it. */
  source: string;
  /** 32 random bytes, base64url without padding. */
  key: string;
}

/** Plaintext pointer published at `<source>index.json`. Reveals only a counter. */
export interface BundleIndex {
  format: 1;
  version: number;
  /** Blob id of the encrypted Manifest. */
  manifest: string;
}

/** An encrypted file at `<source>blobs/<id>`. */
export interface BlobRef {
  /** sha256 hex of the ciphertext file; also its filename. */
  id: string;
  /** sha256 hex of the plaintext; lets the publisher reuse unchanged blobs. */
  sha256: string;
  /** Plaintext size in bytes. */
  size: number;
  /** MIME type of the plaintext, e.g. 'text/x-chordpro', 'application/pdf', 'image/png'. */
  type: string;
}

export type LicenseSource =
  | 'public-domain'
  | 'ccli'
  | 'onelicense'
  | 'permission'
  | 'original'
  | 'other';

export interface SongMeta {
  id: string;
  title: string;
  firstLine?: string;
  key?: string;
  tempo?: number;
  time?: string;
  /** "Words: … Music: …" or a plain author list. */
  authors?: string;
  /** e.g. "© 1998 Thankyou Music". */
  copyright?: string;
  license: LicenseSource;
  /** CCLI song number, shown as "CCLI Song # …". */
  ccliSong?: string;
  tags?: string[];
  /** ChordPro source. */
  content: BlobRef;
  updatedAt: string;
}

/** A PDF or other attachment (lead sheet, chart). */
export interface FileMeta {
  id: string;
  title: string;
  songId?: string;
  content: BlobRef;
  updatedAt: string;
}

export interface SetItem {
  songId: string;
  /** Key to play it in for this set; the song is transposed from its own key. */
  key?: string;
  note?: string;
}

export interface SetList {
  id: string;
  title: string;
  /** ISO date, yyyy-mm-dd. */
  date?: string;
  items: SetItem[];
}

export interface ChurchInfo {
  name: string;
  logo?: BlobRef;
  /** CCLI Church Copyright License number. */
  ccliLicense?: string;
  /** ISO date; licensed (non-free) songs are hidden after it. */
  licenseExpires?: string;
  website?: string;
}

export type ThemePref = 'system' | 'light' | 'sepia' | 'dark';

export interface ViewerDefaults {
  theme: ThemePref;
  chords: boolean;
  /** 1 = default size. */
  fontScale: number;
}

export interface Manifest {
  format: 1;
  version: number;
  publishedAt: string;
  church: ChurchInfo;
  defaults: ViewerDefaults;
  songs: SongMeta[];
  files: FileMeta[];
  sets: SetList[];
}

/** A viewer's own overrides, stored per device. Missing fields fall back to Manifest.defaults. */
export type ViewerSettings = Partial<ViewerDefaults>;

export interface SyncResult {
  status: 'up-to-date' | 'updated' | 'offline' | 'error';
  version?: number;
  /** Number of blobs downloaded this run. */
  downloaded?: number;
  error?: string;
}

/** License sources that need a current church license to show. */
export const LICENSED_SOURCES: LicenseSource[] = ['ccli', 'onelicense', 'other'];
