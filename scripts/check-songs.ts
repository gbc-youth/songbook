// Checks ChordPro files the way the app will read them, so a converted song can be
// verified before it's imported. Prints a one-line summary per song, then problems.
//
//   npx tsx scripts/check-songs.ts songs/*.cho
//
// Exit code 1 if any file has errors. Warnings don't fail.
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { parseBody } from '../src/song/parseBody';
import { songInfo } from '../src/song/songInfo';

// Strict on purpose: chordsheetjs will parse almost anything, so "[Hello]" would pass.
const CHORD = /^[A-G][#b]?(m|maj|min|dim|aug|sus|add|M|[0-9]|[#b+\-()°ø])*(\/[A-G][#b]?)?$/;

const NOTE: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const pitch = (root: string) =>
  (NOTE[root[0]] + (root[1] === '#' ? 1 : root[1] === 'b' ? -1 : 0) + 12) % 12;

/**
 * The key a chart's chords imply: take the three most frequent major chords; if they
 * sit a fourth and a fifth apart (I, IV, V), the lowest-rooted one of that shape is
 * the key. The first or last chord is not evidence.
 */
function impliedKey(chords: string[]): string | undefined {
  const counts = new Map<string, number>();
  for (const c of chords) {
    const m = /^([A-G][#b]?)(maj7|7|sus[24]?|add9|2)?(\/.*)?$/.exec(c);
    if (m) counts.set(m[1], (counts.get(m[1]) ?? 0) + 1);
  }
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([r]) => r);
  if (top.length < 3) return undefined;
  for (const root of top) {
    const p = pitch(root);
    const others = new Set(top.filter((r) => r !== root).map(pitch));
    if (others.has((p + 5) % 12) && others.has((p + 7) % 12)) return root;
  }
  return undefined;
}

let failed = false;
for (const file of process.argv.slice(2)) {
  const text = readFileSync(file, 'utf8');
  const errors: string[] = [];
  const warnings: string[] = [];

  let body;
  try {
    body = parseBody(text);
  } catch (e) {
    console.log(`✗ ${basename(file)}: does not parse: ${(e as Error).message.split('\n')[0]}`);
    failed = true;
    continue;
  }
  const info = songInfo(text);

  const chords: string[] = [];
  let lyricLines = 0;
  for (const section of body.sections) {
    for (const item of section.content) {
      if (item.kind !== 'line') continue;
      if (item.pieces.some((p) => p.lyric.trim())) lyricLines++;
      for (const p of item.pieces) {
        if (!p.chord) continue;
        chords.push(p.chord);
        if (!CHORD.test(p.chord)) errors.push(`[${p.chord}] is not a chord (use [*${p.chord}] for a cue)`);
      }
      const lyric = item.pieces.map((p) => p.lyric).join('');
      if (/\w- +\w|\w -\w/.test(lyric)) warnings.push(`split syllables, join the word: "${lyric.trim()}"`);
    }
  }

  if (!info.title) errors.push('missing {title}');
  if (!lyricLines) errors.push('no lyric lines');
  if (!info.key) warnings.push('missing {key}');
  if (!info.copyright) warnings.push('missing {copyright} (use "Public domain" when it is)');
  if (info.copyright && !/public domain/i.test(info.copyright) && !info.ccli)
    warnings.push('copyrighted song without {meta: ccli N}');
  const implied = impliedKey(chords);
  if (info.key && implied && pitch(implied) !== pitch(info.key.replace(/m$/, '')) && !/m$/.test(info.key))
    warnings.push(`{key: ${info.key}} but the chords point to ${implied}`);

  const sections = body.sections.map((s) => s.label ?? s.type).filter((s) => s !== 'custom').join(', ');
  console.log(
    `${errors.length ? '✗' : '✓'} ${basename(file)}: ${info.title ?? '(untitled)'} · ${info.key ?? '?'} · ` +
      `${lyricLines} lines · ${sections} · chords ${[...new Set(chords)].join(' ')}`,
  );
  for (const e of [...new Set(errors)]) console.log(`    error: ${e}`);
  for (const w of [...new Set(warnings)]) console.log(`    warning: ${w}`);
  if (errors.length) failed = true;
}
process.exit(failed ? 1 : 0);
