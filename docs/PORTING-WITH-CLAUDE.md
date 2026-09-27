# Porting your songs with Claude Code

A church's songs rarely live in one clean place. They sit in PDF charts from
publishers, Ultimate Guitar printouts, Word files typed years ago, slides, and
photocopied hymnals. Songbook reads ChordPro. Getting from one to the other is
mostly judgement, which is exactly what a language model is good at, as long as
it works inside rules and every result is checked.

This folder's approach came out of a real worship team's weekly workflow. It
rests on three ideas:

1. **Judgement to Claude, arithmetic to scripts.** Claude decides the key, where
   each chord falls, what counts as a verse. It never transposes or counts by
   hand; code does that, and code checks the result.
2. **Write decisions into the file.** Anything Claude had to decide, or couldn't,
   is written into the song as a directive or a `# ` note. The next run starts
   from the answer instead of deciding again.
3. **Nothing is done until it's verified.** Every file is parsed by the same
   code the app uses, and the lyrics are read back against the source.

## Set up

> **Keep your songs private.** This repository is public, and anything committed
> to it is published. Port your church's songs in a copy of `porting/` inside a
> **private** repository (or no repository at all). The `porting/inbox/` and
> `porting/songs/` folders here are git-ignored for that reason; only the
> public-domain hymns in `demo/songs/` belong in this repo.

You need [Claude Code](https://claude.com/claude-code) and this repo with its
dependencies installed (`npm install`).

```
porting/
  CLAUDE.md    the rulebook Claude follows (read it; adjust it to your church)
  inbox/       drop sources here: PDFs, images, .docx, .pptx, .txt
  songs/       Claude writes one .cho per song here
```

`porting/CLAUDE.md` is the harness. Claude Code loads it automatically when you
start a session in that folder, so every conversation begins with the same rules:
the output format, how to find the key, what to do with charts typed in a
proportional font, the licensing rules, and the order of work.

```sh
cd porting
claude
```

## Ask

Single song:

> Port `inbox/Be Thou My Vision.pdf`.

A batch:

> Port everything in `inbox/`. One song at a time, check each before the next,
> and give me the summary table at the end.

A source with a known problem:

> `inbox/communion-hymns.docx` has four songs. It was typed in Calibri, so the
> chord columns are off. Place the chords by the melody and mark anything
> you're unsure of.

A photo of a hymnal page:

> Port `inbox/hymnal-p212.jpg`. It's from a 1911 hymnal, so it should be public
> domain; confirm text and tune dates before you say so.

## Check

Claude runs the checker as part of its rules. Run it yourself before importing:

```sh
npm run check-songs -- porting/songs/*.cho
```

```
✓ it-is-well.cho: It Is Well with My Soul · C · 28 lines · Verse 1, Chorus, … · chords C F Am D7 G C/G G7
✗ bad.cho: Bad · C · 2 lines · chords C G Hello
    error: [Hello] is not a chord (use [*Hello] for a cue)
    warning: split syllables, join the word: "here we go fore- ver"
    warning: copyrighted song without {meta: ccli N}
```

It parses each file exactly as the app does, and flags:
- chords that aren't chords (a cue label mistaken for one)
- a missing title, key or copyright line
- a copyrighted song without its CCLI number
- syllables left split for singing
- a `{key}` the chords themselves contradict

Warnings don't fail the check, but each one deserves an answer.

Then read a few songs against their sources yourself. The checker can't tell
that a line is missing or doubled; you and Claude reading back can.

## Import

In the app, open **Settings → Manage songbook → Songs → Import**, select the
`.cho` files, review, and **Publish**. Your team gets them on their next launch.

## What we learned the hard way

- **The first chord is not the key.** Songs often start on the IV or end on the
  V. The three most frequent major chords, a fourth and fifth apart, name it.
- **Columns lie in proportional fonts.** A chart typed in Word's default font
  looks aligned on the typist's screen and nowhere else. Check the font before
  trusting a column; one document can mix both.
- **Note names hide in words.** `INTRO:`, `A`, `Be` all start with a letter A–G.
  Anything that treats every such word as a chord will corrupt the labels.
- **Line breaks are breaths, not arithmetic.** Where a line should break on a
  small screen is a judgement about the words. Write it into the file rather
  than tuning a heuristic.
- **Feedback after a service is a note, not an edit.** "That was too low" belongs
  in the song's notes for next time; the published version stays as it was sung.
- **Public domain is about the edition.** An 1873 hymn in a 1990 hymnal may carry
  a new arrangement, translation or verse. Port from the old edition, or treat it
  as copyrighted.

## Licensing

Converting a song is making a copy, and committing it to a public repository
is publishing it. Port only songs your church is licensed to
use (CCLI, OneLicense, the publisher's permission) or that are genuinely public
domain, and keep each song's copyright line and CCLI number. Songbook shows them
under every song.
