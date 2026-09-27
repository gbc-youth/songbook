// Key and chord transposition, built on chordsheetjs's Key and Chord classes.
//
// Sharp/flat spelling rule: a key is spelled with flats when its root falls on one
// of F, Bb, Eb, Ab, Db, Gb (major) or their relative minors (Dm, Gm, Cm, Fm, Bbm, Ebm) —
// otherwise sharps. This is a fixed, pitch-class based rule (not a strict circle-of-fifths
// key-signature simulation), so unusual results at the sharp/flat border (e.g. always
// spelling the tritone key as Gb, never F#) are intentional.
import { Chord, Key } from 'chordsheetjs';

type Accidental = 'b' | '#';

const NATURAL_PITCH_CLASS: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

// Major keys conventionally spelled with flats: F, Bb, Eb, Ab, Db, Gb.
const FLAT_MAJOR_PITCH_CLASSES = new Set([5, 10, 3, 8, 1, 6]);
// Their relative minors: Dm, Gm, Cm, Fm, Bbm, Ebm.
const FLAT_MINOR_PITCH_CLASSES = new Set([2, 7, 0, 5, 10, 3]);
// Pitch classes that need an accidental at all (the black keys); natural pitch classes
// are never forced to an artificial spelling like B# or E#.
const AMBIGUOUS_PITCH_CLASSES = new Set([1, 3, 6, 8, 10]);

/** Pitch class (0-11) of a note name such as 'C', 'F#', 'Bb', regardless of spelling. */
function pitchClassOf(note: string): number {
  const base = NATURAL_PITCH_CLASS[note.charAt(0).toUpperCase()];
  if (base === undefined) return NaN;
  let pc = base;
  for (const ch of note.slice(1)) {
    if (ch === '#') pc += 1;
    else if (ch === 'b') pc -= 1;
  }
  return ((pc % 12) + 12) % 12;
}

function preferredAccidental(pitchClass: number, minor: boolean): Accidental {
  const flats = minor ? FLAT_MINOR_PITCH_CLASSES : FLAT_MAJOR_PITCH_CLASSES;
  return flats.has(pitchClass) ? 'b' : '#';
}

/** Spells a (possibly already-transposed) Key per the flat/sharp convention above. */
function spelled(key: Key): Key {
  const pc = pitchClassOf(key.note);
  if (Number.isNaN(pc) || !AMBIGUOUS_PITCH_CLASSES.has(pc)) return key;
  return key.useAccidental(preferredAccidental(pc, key.minor));
}

/**
 * Transposes a key string (e.g. 'Em', 'F#m', 'Bb') by a number of semitones, spelling the
 * result per the app's flat/sharp convention. Unparsable input is returned unchanged.
 */
export function transposeKey(key: string, semitones: number): string {
  const parsed = Key.parse(key);
  if (!parsed) return key;
  return spelled(parsed.transpose(semitones)).toString();
}

/** Semitones from one key to another (0-11, the upward distance). Unparsable input yields 0. */
export function semitonesBetween(fromKey: string, toKey: string): number {
  const a = Key.parse(fromKey);
  const b = Key.parse(toKey);
  if (!a || !b) return 0;
  return Key.distance(a, b);
}

/**
 * The flat/sharp preference implied by a song's key once transposed, used to spell every
 * chord in the song consistently. Returns undefined when there is no key to reason from.
 */
export function accidentalForKey(key: string | undefined, semitones: number): Accidental | undefined {
  if (!key) return undefined;
  const parsed = Key.parse(key);
  if (!parsed) return undefined;
  const transposed = parsed.transpose(semitones);
  const pc = pitchClassOf(transposed.note);
  if (Number.isNaN(pc)) return undefined;
  return preferredAccidental(pc, transposed.minor);
}

/** Spells one transposed note: black keys take the song's accidental, naturals stay natural. */
function spellNote(note: Chord, accidental?: Accidental): string {
  const text = note.toString();
  if (!accidental || !AMBIGUOUS_PITCH_CLASSES.has(pitchClassOf(text))) {
    // chordsheetjs may spell a natural as B#, E#, Cb or Fb; bring it home.
    const pc = pitchClassOf(text);
    const natural = Object.keys(NATURAL_PITCH_CLASS).find((n) => NATURAL_PITCH_CLASS[n] === pc);
    return natural && /^[A-G][#b]/.test(text) ? natural + text.slice(2) : text;
  }
  return note.useAccidental(accidental).toString();
}

/**
 * Transposes a single chord string, including slash chords (root and bass transpose
 * and are spelled independently). At 0 semitones the chord is returned exactly as
 * written. Strings that aren't parsable chords (e.g. 'N.C.') are returned unchanged.
 */
export function transposeChordString(chord: string, semitones: number, accidental?: Accidental): string {
  if (!chord || !semitones) return chord;
  const slash = chord.indexOf('/');
  const [main, bass] = slash > 0 ? [chord.slice(0, slash), chord.slice(slash + 1)] : [chord, ''];
  const parsedMain = Chord.parse(main);
  if (!parsedMain) return chord;
  const out = spellNote(parsedMain.transpose(semitones), accidental);
  if (!bass) return out;
  const parsedBass = Chord.parse(bass);
  return parsedBass ? `${out}/${spellNote(parsedBass.transpose(semitones), accidental)}` : chord;
}
