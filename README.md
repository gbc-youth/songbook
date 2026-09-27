# Songbook
Ephesians 5:18-21

A free, offline songbook for church worship teams: lyrics, chord charts and PDFs,
on every device, from a source the church controls.

## The problem
A church licenses songs (CCLI, OneLicense, direct permission) but has no reliable
way to get them to its worship team. Posting them publicly gets them taken down,
and no single platform carries every song a church sings.

## How it works
- **No central server.** Each church hosts its own encrypted bundle on static
  hosting (GitHub Pages, Cloudflare R2, S3). The app never holds anyone's content.
- **Join by link.** The admin shares a link whose URL fragment carries the key.
  The app downloads the bundle, decrypts it on the device, and keeps it offline;
  it works at camps with no signal.
- **Updates on launch.** An encrypted manifest lists content-addressed files;
  the app fetches only what changed.
- **Admin publishing.** The church admin adds songs, PDFs, logo and defaults
  from the same app and publishes a new bundle version.
- **Planned: device-bound access.** Each device holds its own keypair; the admin
  approves devices and can revoke one by rotating the content key.

## Try it
Open **https://gbc-youth.github.io/songbook/** and tap **Explore public hymns**.
No account and no link needed. On a phone, add it to your home screen.

Feedback is welcome in [GitHub Issues](https://github.com/gbc-youth/songbook/issues).

## Porting your songs
Songs arrive as PDFs, Ultimate Guitar printouts, Word files and photocopied
hymnals. [Porting with Claude Code](docs/PORTING-WITH-CLAUDE.md) shows how to turn
them into ChordPro with Claude Code: a ready rulebook in [`porting/`](porting/),
a checker that reads each song the way the app does, and what a real worship
team learned doing it every week.

A church keeps its licensed songs in its own private repository, which publishes
only the encrypted bundle: see [A church's songs repository](docs/CHURCH-REPO.md).

## Scope
- Worship teams first.
- Lyrics and chords in ChordPro, with transposition and chords on/off; PDFs.
- A Progressive Web App: browser, Android, iOS and desktop from one codebase.

## Design
Minimal and quiet, in the spirit of the ESV Bible app and esv.org: the words
are the page.
- A readable serif for lyrics; a small, restrained sans for labels and UI.
- Generous margins and line height; no cards, shadows or decoration.
- Chords set apart by weight or a single muted accent, never competing with
  the lyrics.
- Section labels (Verse 1, Chorus) small and quiet, the way a Bible marks
  headings and verse numbers.
- Light mode warm off-white; dark mode a warm near-black with softened text,
  the same hue family rather than an inverted grey.
- Settings stay out of sight until asked for.

## Development
```sh
npm install
npm run dev            # http://localhost:5173/songbook/
npm test
npm run build
npm run demo           # rebuild the public hymns bundle from demo/songs
npm run check-songs -- path/to/*.cho
```
Architecture and the bundle format: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Licensing
The app is a tool; each church is responsible for holding licenses for the songs
it publishes. The app makes compliance the easy path: copyright notice and
license number on every song, a license source per song (public domain, CCLI,
OneLicense, permission), license expiry, and team-only content.

## License
The app's code is licensed under [GPL-2.0-only](LICENSE). Song content published
by churches is their own and is not covered by this license.

GPL-2.0 was chosen for one reason only: the app renders ChordPro with
[ChordSheetJS](https://github.com/martijnversluis/ChordSheetJS), which is
GPL-2.0-only. If that dependency is replaced, the license may be revisited.
