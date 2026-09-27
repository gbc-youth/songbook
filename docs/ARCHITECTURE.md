# Architecture

A static PWA (Vite + React 19 + TypeScript), served from
`https://gbc-youth.github.io/songbook/` (vite `base: '/songbook/'`). No backend.
Shared types: `src/core/types.ts`. Design tokens: `src/styles/tokens.css`.

## Bundle format (format 1)

A church bundle is a directory on any static HTTPS host with CORS
(`raw.githubusercontent.com`, GitHub Pages, R2, S3):

```
<source>/index.json          plaintext BundleIndex {format:1, version, manifest:<blobId>}
<source>/blobs/<id>          encrypted files; id = sha256 hex of the file bytes
```

- **Encrypted file layout:** `0x01` (format byte) ‖ 12-byte random IV ‖ AES-256-GCM
  ciphertext+tag. No associated data.
- **Key:** 32 random bytes, base64url without padding, never sent to any server.
- **Manifest** (`Manifest` in types.ts) is JSON, UTF-8, stored as a blob with type
  `application/json`. Songs (`text/x-chordpro`, UTF-8), PDFs and the logo are blobs.
- **Publishing** reuses a `BlobRef` when the plaintext `sha256` is unchanged, so an
  update uploads only what changed. `version` increases by 1 per publish.

## Join link

```
https://gbc-youth.github.io/songbook/#s=<encodeURIComponent(source)>&k=<key>
```

Everything is in the fragment. The app reads it on load, then clears it with
`history.replaceState`. On iOS outside standalone mode, the app does not join from
Safari (Safari and the home-screen app have separate storage): it shows install
steps and a "Copy join link" button; the installed app offers "Paste join link".

## Modules and ownership

| dir | owns | exports (used by others) |
|---|---|---|
| `src/core` | crypto, link, bundle build, local DB, sync | see below |
| `src/song` | ChordPro parse, transpose, render | see below |
| `src/admin` | songbook creation, editing, publishing | `AdminPanel`, `CreateSongbook` |
| `src/app` + `src/main.tsx` | shell, screens, settings, install gate | — |
| `scripts/` | `build-demo.ts` | — |
| `demo/` | public-domain demo songs + church.json | — |

### `src/core` (index.ts re-exports all)

```ts
// link.ts
parseJoinFragment(hash: string): JoinInfo | null      // accepts '#s=..&k=..' or a full URL containing it
buildJoinLink(appUrl: string, info: JoinInfo): string

// crypto.ts — WebCrypto only (works in browsers and Node ≥ 20)
generateKey(): string
importKey(key: string): Promise<CryptoKey>
encryptBytes(key: CryptoKey, plain: Uint8Array): Promise<Uint8Array>
decryptBytes(key: CryptoKey, file: Uint8Array): Promise<Uint8Array>   // throws on wrong key / tamper
sha256Hex(data: Uint8Array): Promise<string>

// bundle.ts — pure, no DB; used by admin (browser) and scripts/build-demo.ts (Node)
interface DraftSong  extends Omit<SongMeta, 'content'> { text: string }
interface DraftFile  extends Omit<FileMeta, 'content'> { bytes: Uint8Array; type: string }
interface Draft {
  church: Omit<ChurchInfo, 'logo'> & { logo?: { bytes: Uint8Array; type: string } };
  defaults: ViewerDefaults; songs: DraftSong[]; files: DraftFile[]; sets: SetList[];
}
interface BuiltBundle {
  index: BundleIndex; manifest: Manifest;
  /** path relative to source -> bytes: 'index.json' and every NEW 'blobs/<id>' */
  files: Map<string, Uint8Array>;
  /** blob ids referenced by the manifest that were reused from `previous` (already hosted) */
  reused: string[];
}
buildBundle(key: string, draft: Draft, previous?: Manifest | null): Promise<BuiltBundle>
readBundle(source: string, key: string, fetchFn?: typeof fetch): Promise<{ index: BundleIndex; manifest: Manifest }>

// db.ts + sync.ts — IndexedDB via Dexie, database name 'songbook'
joinSongbook(info: JoinInfo, onProgress?: (done: number, total: number) => void): Promise<SyncResult>
  // validates by fetching+decrypting first; stores nothing if that fails (throws Error with a human message)
sync(onProgress?: (done: number, total: number) => void): Promise<SyncResult>
  // fetch index.json (cache: 'no-store'); if version > stored, fetch manifest, download every
  // missing blob (songs, logo, PDFs — camps are offline), then swap manifest atomically; GC unreferenced blobs.
  // Network failure -> {status:'offline'}; never throws.
getJoined(): Promise<JoinInfo | null>
getManifest(): Promise<Manifest | null>
getBlobText(ref: BlobRef): Promise<string | null>
getBlobBytes(ref: BlobRef): Promise<Uint8Array | null>
getLastSync(): Promise<{ at: string; result: SyncResult } | null>
leaveSongbook(): Promise<void>                      // wipes everything
getSettings(): Promise<ViewerSettings>
saveSettings(s: ViewerSettings): Promise<void>
effectiveSettings(m: Manifest | null, s: ViewerSettings): ViewerDefaults
isLicenseExpired(m: Manifest, now?: Date): boolean
visibleSongs(m: Manifest, now?: Date): SongMeta[]   // hides LICENSED_SOURCES songs when expired
```

### `src/song` (index.ts re-exports all)

```ts
interface SongInfo { title?: string; subtitle?: string; key?: string; tempo?: number; time?: string;
  authors?: string; copyright?: string; ccli?: string; firstLine?: string }
songInfo(text: string): SongInfo                   // metadata from directives; firstLine = first lyric line
transposeKey(key: string, semitones: number): string
semitonesBetween(fromKey: string, toKey: string): number
interface RenderOptions { chords: boolean; transpose: number }
<SongBody text={string} options={RenderOptions} />  // sections, labels, comments, chords-over-lyrics; no title header
```

`SongBody` renders only the body. The app draws the title, key and controls above it
and the copyright line below it.

## Conventions

- Style only from `tokens.css` variables. Each module ships its own CSS file
  imported by its components (`src/song/song.css`, `src/admin/admin.css`,
  `src/app/app.css`). Class names prefixed by module: `sb-song-`, `sb-admin-`, `sb-app-`.
- Minimal and quiet, in the spirit of the ESV Bible app: serif for lyrics, small sans
  for UI, no cards or shadows, hairline rules, one accent colour. Touch targets ≥ 44px.
  Must work at 360px wide and in both themes.
- `chordsheetjs` resolves (vite alias) to `vendor/chordsheetjs/index.js`, a trimmed
  build from source; see `vendor/chordsheetjs/README.md`. Import only what
  `scripts/chordsheetjs-entry.ts` exports, or add it there and rerun
  `scripts/build-chordsheetjs.sh`.
- No new runtime dependencies without need; everything must work offline once loaded.
- Tests: Vitest (`npm test`), files `*.test.ts(x)` next to the code.
