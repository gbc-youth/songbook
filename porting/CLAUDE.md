# Porting songs into Songbook

You turn song sources in `inbox/` (PDF chord charts, Ultimate Guitar printouts,
Word or PowerPoint files, photos of a hymnal page, plain text) into ChordPro files
in `songs/`, one song per file, that the Songbook app imports as they are.

Judgement is yours: the key, where each chord falls, what a section is, where a
line breaks. Arithmetic is not: never transpose by hand, and let the checker
(below) judge the file. Write every decision into the file, so the next run
doesn't have to make it again.

## Output format

`songs/<slug>.cho`, UTF-8, slug from the title (`it-is-well.cho`).

```chordpro
{title: It Is Well with My Soul}
{lyricist: Horatio G. Spafford, 1873}
{composer: VILLE DU HAVRE, Philip P. Bliss, 1876}
{copyright: Public domain}
{key: C}
{time: 4/4}
{tempo: 76}

{start_of_verse}
When [C]peace, like a [F]river, at[C]tendeth my way,
{end_of_verse}

{start_of_chorus}
[G]It is well (it is [C]well) with my [G]soul
{end_of_chorus}

{chorus}
```

- **Metadata first**: `title` always. Then `lyricist`/`composer` (or `artist`),
  `copyright`, `key`, `time`, `tempo` when the source gives them.
- **Chords inline**, `[X]` placed immediately before the syllable where the chord
  changes, not the start of the word unless the change is there.
- **Sections** in `{start_of_verse}…{end_of_verse}`, `chorus`, `bridge`. Verses
  number themselves; label only unusual ones: `{start_of_verse: Tag}`.
- **A repeated chorus** is written once, then recalled with `{chorus}`.
- **Cues for the band**: `{comment: Keys only}` on its own line, or `[*N.C.]`
  inline. Anything in `[*…]` is shown but never transposed.
- **Your own notes** go in `# ` comment lines at the end: the source, what you
  were unsure of. The app ignores them.

## Judgement calls

- **The key.** Take the three chords that recur most among the *major* chords.
  If they sit a fourth and a fifth apart (I, IV, V), the lowest-rooted of that
  shape is the key. Never infer it from the first or last chord. For a minor
  song, name the minor key (`{key: Em}`). Write the key the chart is *written*
  in, not the one it's played in.
- **Chord placement from a column chart.** In a chord-over-lyrics chart, a
  chord belongs to the syllable under its first letter, *if the chart was typed
  in a monospace font*. If it was typed in a proportional font (Word's Calibri,
  Times, most PowerPoint), the columns lie: place each chord by the melody's
  natural stress and the source's intent, and say so in a `# ` note.
- **Words are the source's words.** Keep its spelling, punctuation, archaic
  forms ("thee", "'Twas") and verse order. Don't modernise, correct theology, or
  merge verses. Only join syllables a chart split for singing (`fore - ver` →
  `forever`).
- **What you can't read, you don't guess.** Leave the line out or mark the chord
  `[*?]`, and write `# CHECK: verse 2 line 3, chord illegible` at the end.

## Licensing

- Copy the source's copyright line verbatim into `{copyright}`, and its CCLI
  song number into `{meta: ccli 1234567}`.
- Write `{copyright: Public domain}` only when both text and tune were published
  in 1930 or earlier (US rule) and the wording is that original, not a modern
  hymnal's revision or translation. If you can't confirm it, leave `{copyright}`
  out and say so. A modern arrangement of an old hymn is not public domain.
- Licensed songs never go into a public repository. If this folder is inside
  a public repo (check with `gh repo view --json visibility`), stop and say so
  before writing any copyrighted song.
- You are converting songs the church is licensed to use; you are not the judge
  of that license. Don't refuse, and don't add songs that weren't in `inbox/`.

## Don'ts

- Don't transpose. Record the key as written; the app transposes on screen.
- Don't treat a word that happens to be a note name as a chord (`INTRO:`,
  `A`, `Be`). Chords are only what the chart puts in the chord row.
- Don't write a second file for a second key.
- Don't edit `inbox/`. It is the record of what you were given.

## Every song, in order

1. Read the source completely. For PDFs and images, read the page, not just
   extracted text: extraction loses the chord columns.
2. Write `songs/<slug>.cho`.
3. Run `npx tsx ../scripts/check-songs.ts songs/<slug>.cho` (from the songbook
   repo, `npm run check-songs -- porting/songs/<slug>.cho`). Fix every error.
   Read each warning and either fix it or answer it in a `# ` note.
4. Read your lyrics back against the source, line by line, counting lines per
   section. Missing and doubled lines are the most common fault.
5. Report one line per song: title, key, sections, and anything marked CHECK.
