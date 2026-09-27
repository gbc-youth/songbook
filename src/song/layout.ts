// Pure layout decisions for SongBody. The actual gap-filling is CSS (a flex-grown filler in
// song.css); this only decides whether a piece needs one at all.

/**
 * True when a piece's rendered chord text is wider than its lyric AND the lyric ends mid-word
 * (the next piece's lyric starts with a letter and this one doesn't end in a space) — e.g. the
 * 'm' in "A[G/B]m[E]azing". Width is approximated by character length: chords are short symbol
 * strings and lyrics are ordinary words, so length tracks rendered width closely enough, and it
 * keeps the decision free of any DOM measurement.
 */
export function needsHyphenFill(chordText: string, lyric: string, nextLyric: string): boolean {
  if (!chordText || lyric.length === 0) return false;
  if (chordText.length <= lyric.length) return false;
  if (/\s$/.test(lyric)) return false;
  return /^[A-Za-z]/.test(nextLyric);
}
