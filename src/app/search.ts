import type { SongMeta } from '../core';

/**
 * Loose form for matching: no diacritics (é→e, ё→е, й→и), no apostrophes
 * ("'Twas"→"twas"), other punctuation to spaces, lowercase, single-spaced.
 */
export function normalizeForSearch(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/['’ʼ`]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

/** Lyric lines of a ChordPro song: chords, directives, comments and tab/grid blocks removed. */
export function lyricLines(chordpro: string): string[] {
  const lines: string[] = [];
  let literal = false;
  for (const raw of chordpro.split(/\r?\n/)) {
    const line = raw.trim();
    const directive = /^\{\s*([\w-]+)/.exec(line)?.[1]?.toLowerCase();
    if (directive) {
      if (/^(start_of_(tab|grid)|so[tg])$/.test(directive)) literal = true;
      if (/^(end_of_(tab|grid)|eo[tg])$/.test(directive)) literal = false;
      continue;
    }
    if (literal || !line || line.startsWith('#')) continue;
    const text = line.replace(/\[[^\]]*\]/g, '').replace(/\s+/g, ' ').trim();
    if (text) lines.push(text);
  }
  return lines;
}

export interface SearchDoc {
  song: SongMeta;
  /** Lyric lines as written, for snippets. */
  lines: string[];
}

export interface SearchHit {
  song: SongMeta;
  score: number;
  /** The lyric line that matched, when the title alone doesn't explain the hit. */
  snippet?: string;
}

// What a worship team member types, most telling first: part of the title, a CCLI
// number, a remembered line (the opening line most of all), then who wrote it.
const W_TITLE = 100;
const W_CCLI = 100;
const W_FIRST_LINE = 60;
const W_LYRIC = 40;
const W_TAG = 30;
const W_AUTHOR = 20;

interface Field {
  weight: number;
  norm: string;
  /** Original text for a lyric field; used as the snippet. */
  line?: string;
}

function fieldsOf(doc: SearchDoc): Field[] {
  const s = doc.song;
  const fields: Field[] = [{ weight: W_TITLE, norm: normalizeForSearch(s.title) }];
  if (s.ccliSong) fields.push({ weight: W_CCLI, norm: normalizeForSearch(s.ccliSong) });
  if (s.authors) fields.push({ weight: W_AUTHOR, norm: normalizeForSearch(s.authors) });
  for (const t of s.tags ?? []) fields.push({ weight: W_TAG, norm: normalizeForSearch(t) });
  const lines = doc.lines.length ? doc.lines : s.firstLine ? [s.firstLine] : [];
  lines.forEach((line, i) =>
    fields.push({ weight: i === 0 ? W_FIRST_LINE : W_LYRIC, norm: normalizeForSearch(line), line }),
  );
  return fields;
}

/** Whole-word prefix match: "grac" finds "grace", "race" doesn't. */
function hasWordPrefix(norm: string, token: string): boolean {
  return (' ' + norm).includes(' ' + token);
}

/**
 * Every query word must appear somewhere in the song (words may come from
 * different fields, e.g. "crosby assurance"). Ranked by the best field each word
 * hit, plus a bonus when the whole query appears as a phrase in one field.
 */
export function searchSongs(docs: SearchDoc[], query: string): SearchHit[] {
  const q = normalizeForSearch(query);
  if (!q) return docs.map((d) => ({ song: d.song, score: 0 }));
  const tokens = q.split(' ');
  const hits: SearchHit[] = [];

  for (const doc of docs) {
    const fields = fieldsOf(doc);
    let score = 0;
    let matched = true;
    for (const token of tokens) {
      let best = 0;
      for (const f of fields) if (f.weight > best && hasWordPrefix(f.norm, token)) best = f.weight;
      if (!best) {
        matched = false;
        break;
      }
      score += best;
    }
    if (!matched) continue;

    // Phrase bonus, and the best lyric line holding the whole phrase.
    let snippetField: Field | undefined;
    let phraseBest = 0;
    for (const f of fields) {
      if (!hasWordPrefix(f.norm, q)) continue;
      phraseBest = Math.max(phraseBest, f.weight + (f.norm.startsWith(q) ? 25 : 0));
      if (f.line && (!snippetField || f.weight > snippetField.weight)) snippetField = f;
    }
    score += phraseBest;

    const title = fields[0].norm;
    const titleExplains = tokens.every((t) => hasWordPrefix(title, t));
    if (!titleExplains && !snippetField) {
      // Words spread across lines: show the line holding the most of them.
      let bestCount = 0;
      for (const f of fields) {
        if (!f.line) continue;
        const count = tokens.filter((t) => hasWordPrefix(f.norm, t)).length;
        if (count > bestCount) [bestCount, snippetField] = [count, f];
      }
    }
    hits.push({ song: doc.song, score, snippet: titleExplains ? undefined : snippetField?.line });
  }

  return hits.sort((a, b) => b.score - a.score || a.song.title.localeCompare(b.song.title));
}
