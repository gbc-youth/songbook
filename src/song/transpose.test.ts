import { describe, expect, it } from 'vitest';
import { accidentalForKey, semitonesBetween, transposeChordString, transposeKey } from './transpose';

describe('transposeKey', () => {
  it('transposes a major key up', () => {
    expect(transposeKey('C', 2)).toBe('D');
    expect(transposeKey('G', 7)).toBe('D');
  });

  it('transposes a minor key, keeping the m suffix', () => {
    expect(transposeKey('Em', 2)).toBe('F#m');
    expect(transposeKey('Am', 3)).toBe('Cm');
  });

  it('spells the flat keys (F, Bb, Eb, Ab, Db, Gb) with flats', () => {
    expect(transposeKey('C', 5)).toBe('F');
    expect(transposeKey('C', 10)).toBe('Bb');
    expect(transposeKey('C', 3)).toBe('Eb');
    expect(transposeKey('C', 8)).toBe('Ab');
    expect(transposeKey('C', 1)).toBe('Db');
    expect(transposeKey('C', 6)).toBe('Gb');
  });

  it('spells the relative minors of the flat keys with flats', () => {
    expect(transposeKey('Am', 5)).toBe('Dm');
    expect(transposeKey('Am', 10)).toBe('Gm');
    expect(transposeKey('Am', 3)).toBe('Cm');
    expect(transposeKey('Am', 8)).toBe('Fm');
    expect(transposeKey('Am', 1)).toBe('Bbm');
    expect(transposeKey('Am', 6)).toBe('Ebm');
  });

  it('leaves natural keys unaccidented', () => {
    expect(transposeKey('C', 4)).toBe('E');
    expect(transposeKey('C', 7)).toBe('G');
    expect(transposeKey('E', 1)).toBe('F');
  });

  it('never spells a major key with a sharp accidental (the six flat keys cover every case)', () => {
    expect(transposeKey('D', -1)).toBe('Db');
    expect(transposeKey('A', 1)).toBe('Bb');
  });

  it('spells the non-flat ambiguous minor keys with sharps', () => {
    expect(transposeKey('Am', 4)).toBe('C#m');
    expect(transposeKey('Am', 9)).toBe('F#m');
    expect(transposeKey('Am', 11)).toBe('G#m');
  });

  it('leaves an unparsable key unchanged', () => {
    expect(transposeKey('not a key', 2)).toBe('not a key');
  });

  it('wraps around the octave', () => {
    expect(transposeKey('Bb', 2)).toBe('C');
    expect(transposeKey('C', -1)).toBe('B');
  });
});

describe('semitonesBetween', () => {
  it('measures the upward distance between two keys', () => {
    expect(semitonesBetween('C', 'D')).toBe(2);
    expect(semitonesBetween('C', 'C')).toBe(0);
    expect(semitonesBetween('C', 'G')).toBe(7);
    expect(semitonesBetween('G', 'C')).toBe(5);
  });

  it('works across major/minor and enharmonic spellings', () => {
    expect(semitonesBetween('Em', 'G')).toBe(3);
    expect(semitonesBetween('F#', 'Gb')).toBe(0);
  });

  it('returns 0 for unparsable keys', () => {
    expect(semitonesBetween('nope', 'C')).toBe(0);
  });
});

describe('transposeChordString', () => {
  it('transposes a simple chord', () => {
    expect(transposeChordString('C', 2, '#')).toBe('D');
    expect(transposeChordString('C', 2, 'b')).toBe('D');
  });

  it('transposes slash chords, both root and bass', () => {
    expect(transposeChordString('G/B', 2, '#')).toBe('A/C#');
    expect(transposeChordString('G/B', 2, 'b')).toBe('A/Db');
  });

  it('transposes minor chords with extensions', () => {
    expect(transposeChordString('Em7', 2, '#')).toBe('F#m7');
    expect(transposeChordString('Bb', -2, '#')).toBe('G#');
    expect(transposeChordString('Bb', -2, 'b')).toBe('Ab');
  });

  it('leaves non-chord tokens (e.g. N.C.) unchanged', () => {
    expect(transposeChordString('N.C.', 2, '#')).toBe('N.C.');
    expect(transposeChordString('', 2, '#')).toBe('');
  });

  it('leaves the chord as written when delta is 0', () => {
    expect(transposeChordString('F#', 0, 'b')).toBe('F#');
  });
});

describe('chord spelling (B# regression)', () => {
  it('shows chords exactly as written at transpose 0', () => {
    expect(transposeChordString('C', 0, accidentalForKey('G', 0))).toBe('C');
    expect(transposeChordString('Bb/D', 0, accidentalForKey('G', 0))).toBe('Bb/D');
  });

  it('keeps naturals natural when transposing', () => {
    expect(transposeChordString('C', 2, accidentalForKey('G', 2))).toBe('D');
    expect(transposeChordString('B7', 1, accidentalForKey('E', 1))).toBe('C7');
    expect(transposeChordString('Em', 1, accidentalForKey('G', 1))).toBe('Fm');
  });

  it('spells black keys by the target key', () => {
    expect(transposeChordString('Bb', 2, accidentalForKey('Eb', 2))).toBe('C');
    expect(transposeChordString('Eb', 2, accidentalForKey('Eb', 2))).toBe('F');
    expect(transposeChordString('Cm', 2, accidentalForKey('Eb', 2))).toBe('Dm');
    expect(transposeChordString('F#m', 1, accidentalForKey('A', 1))).toBe('Gm');
    expect(transposeChordString('D', 1, accidentalForKey('A', 1))).toBe('Eb');
    expect(transposeChordString('D', 1, accidentalForKey('G', 1))).toBe('Eb');
    expect(transposeChordString('Bm', 2, accidentalForKey('D', 2))).toBe('C#m');
  });

  it('transposes and spells both halves of a slash chord', () => {
    expect(transposeChordString('G/B', 1, accidentalForKey('G', 1))).toBe('Ab/C');
    expect(transposeChordString('D/F#', 2, accidentalForKey('D', 2))).toBe('E/G#');
  });
});
