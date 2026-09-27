# ChordSheetJS (trimmed)

[ChordSheetJS](https://github.com/martijnversluis/ChordSheetJS) by Martijn
Versluis, GPL-2.0-only (see `LICENSE`). Version and commit are in `VERSION`.

`index.js` is built from that source by `scripts/build-chordsheetjs.sh` with only
the exports in `scripts/chordsheetjs-entry.ts` (ChordPro parser, Chord, Key and
the line items they produce). The other parsers, all formatters and the chord
diagram fingerings are left out, which halves its size (282 KB → 137 KB
minified). No source was modified.

Rebuild after bumping `chordsheetjs` in package.json:

    scripts/build-chordsheetjs.sh
