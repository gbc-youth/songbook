// Metadata extraction from ChordPro directives.
import { ChordLyricsPair, ChordProParser, Tag } from 'chordsheetjs';
import type { SongInfo } from './types';

type MetaValue = string | string[] | null;

function firstOf(value: MetaValue): string | undefined {
  if (!value) return undefined;
  const v = Array.isArray(value) ? value[0] : value;
  return v || undefined;
}

function joinAll(value: MetaValue): string | undefined {
  if (!value) return undefined;
  const joined = Array.isArray(value) ? value.join(', ') : value;
  return joined || undefined;
}

function composeAuthors(artist: MetaValue, composer: MetaValue, lyricist: MetaValue): string | undefined {
  const words = joinAll(lyricist);
  const music = joinAll(composer);
  if (words || music) {
    const parts: string[] = [];
    if (words) parts.push(`Words: ${words}`);
    if (music) parts.push(`Music: ${music}`);
    return `${parts.join('. ')}.`;
  }
  return joinAll(artist);
}

/** Finds a `{ccli: N}` directive; `{meta: ccli N}` is already surfaced via song metadata. */
function findCcliDirective(lines: { items: unknown[] }[]): string | undefined {
  for (const line of lines) {
    for (const item of line.items) {
      if (item instanceof Tag && item.name === 'ccli' && item.hasValue()) {
        return item.value;
      }
    }
  }
  return undefined;
}

/**
 * Extracts song metadata from ChordPro directives: {title|t}, {subtitle|st}, {key}, {tempo},
 * {time}, {artist}, {composer}, {lyricist}, {copyright}, {meta: ccli N} or {ccli: N}.
 * `firstLine` is the first lyric line with chords stripped.
 */
export function songInfo(text: string): SongInfo {
  const song = new ChordProParser().parse(text);

  const tempoRaw = song.tempo;
  const tempo = tempoRaw ? Number(tempoRaw) : undefined;

  const ccli = firstOf(song.getMetadataValue('ccli')) ?? findCcliDirective(song.lines);

  let firstLine: string | undefined;
  for (const line of song.bodyLines) {
    const text = line.items
      .filter((item): item is ChordLyricsPair => item instanceof ChordLyricsPair)
      .map((item) => item.lyrics ?? '')
      .join('');
    if (text.trim()) {
      firstLine = text.trim();
      break;
    }
  }

  return {
    title: song.title ?? undefined,
    subtitle: song.subtitle ?? undefined,
    key: song.key ?? undefined,
    tempo: tempo !== undefined && !Number.isNaN(tempo) ? tempo : undefined,
    time: firstOf(song.time),
    authors: composeAuthors(song.artist, song.composer, song.lyricist),
    copyright: song.copyright ?? undefined,
    ccli,
    firstLine,
  };
}
