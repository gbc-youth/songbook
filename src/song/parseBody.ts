// Builds a render-friendly block model from ChordPro source, using chordsheetjs only to parse
// (ChordProParser) — layout and rendering are entirely our own (see SongBody.tsx).
import { ChordLyricsPair, ChordProParser, Literal, Tag } from 'chordsheetjs';

export type SectionKind = 'verse' | 'chorus' | 'bridge' | 'tab' | 'grid' | 'custom';

export interface Piece {
  /** Raw (untransposed) chord text; '' when this piece carries no chord. */
  chord: string;
  /** A `[*...]` annotation, shown but never transposed. */
  annotation: string | null;
  lyric: string;
}

export interface LyricLine {
  kind: 'line';
  pieces: Piece[];
}

export interface LiteralLine {
  kind: 'literal';
  text: string;
}

export interface CommentCue {
  kind: 'comment';
  text: string;
  variant: 'plain' | 'italic' | 'box';
}

export type SectionContent = LyricLine | LiteralLine | CommentCue;

export interface Section {
  type: SectionKind;
  label: string | null;
  content: SectionContent[];
}

export interface ParsedBody {
  key: string | undefined;
  sections: Section[];
}

const SECTION_KIND_BY_LINE_TYPE: Record<string, SectionKind> = {
  verse: 'verse',
  chorus: 'chorus',
  bridge: 'bridge',
  tab: 'tab',
  grid: 'grid',
};

const DEFAULT_LABEL: Partial<Record<SectionKind, string>> = {
  verse: 'Verse',
  chorus: 'Chorus',
  bridge: 'Bridge',
  tab: 'Tab',
  grid: 'Grid',
};

// Numbered by default: successive unlabeled verses/bridges read "Verse 1", "Verse 2", ...
const NUMBERED_KINDS = new Set<SectionKind>(['verse', 'bridge']);

// Both the long and short directive spellings; chordsheetjs only normalizes {c}/{comment}.
const COMMENT_VARIANT_BY_TAG_NAME: Record<string, CommentCue['variant']> = {
  comment: 'plain',
  c: 'plain',
  comment_italic: 'italic',
  ci: 'italic',
  comment_box: 'box',
  cb: 'box',
};

function sectionKindFor(lineType: string): SectionKind {
  return SECTION_KIND_BY_LINE_TYPE[lineType] ?? 'custom';
}

/** Parses ChordPro source into the song's key and an ordered list of render-ready sections. */
export function parseBody(text: string): ParsedBody {
  const song = new ChordProParser().parse(text);

  const sections: Section[] = [];
  const counts: Partial<Record<SectionKind, number>> = {};
  let lastChorusContent: SectionContent[] | null = null;

  let current: Section | null = null;
  let currentIsExplicit = false;

  function labelFor(kind: SectionKind, explicitLabel: string): string | null {
    if (explicitLabel) return explicitLabel;
    const base = DEFAULT_LABEL[kind];
    if (!base) return null;
    if (NUMBERED_KINDS.has(kind)) {
      const n = (counts[kind] ?? 0) + 1;
      counts[kind] = n;
      return `${base} ${n}`;
    }
    return base;
  }

  function ensureOpenSection(): Section {
    if (!current) {
      current = { type: 'custom', label: null, content: [] };
      currentIsExplicit = false;
    }
    return current;
  }

  function closeCurrent() {
    if (current && current.content.length > 0) {
      sections.push(current);
      if (current.type === 'chorus') lastChorusContent = current.content;
    }
    current = null;
    currentIsExplicit = false;
  }

  for (const line of song.lines) {
    const onlyItem = line.items.length === 1 ? line.items[0] : null;
    const soleTag = onlyItem instanceof Tag ? onlyItem : null;

    if (soleTag?.isSectionStart()) {
      closeCurrent();
      const kind = sectionKindFor(line.type);
      current = { type: kind, label: labelFor(kind, soleTag.label), content: [] };
      currentIsExplicit = true;
      continue;
    }

    if (soleTag?.isSectionEnd()) {
      closeCurrent();
      continue;
    }

    if (soleTag && soleTag.name === 'chorus') {
      // {chorus}: recall the last chorus, or just a label reference if there isn't one yet.
      closeCurrent();
      sections.push({
        type: 'chorus',
        label: 'Chorus',
        content: lastChorusContent ? [...lastChorusContent] : [],
      });
      continue;
    }

    if (soleTag) {
      const variant = COMMENT_VARIANT_BY_TAG_NAME[soleTag.name];
      if (variant) {
        ensureOpenSection().content.push({ kind: 'comment', text: soleTag.value, variant });
      }
      // Other stray directives (capo, custom x_ tags, etc.) are ignored in the body.
      continue;
    }

    if (line.items.length === 0) {
      // A blank line ends an implicit (untagged) paragraph; inside an explicit env it's spacing.
      if (current && !currentIsExplicit) closeCurrent();
      continue;
    }

    const literalItems = line.items.filter((item): item is Literal => item instanceof Literal);
    if (literalItems.length > 0) {
      ensureOpenSection().content.push({ kind: 'literal', text: literalItems.map((l) => l.string).join('') });
      continue;
    }

    const pieces: Piece[] = line.items
      .filter((item): item is ChordLyricsPair => item instanceof ChordLyricsPair)
      .map((item) => ({ chord: item.chords ?? '', annotation: item.annotation || null, lyric: item.lyrics ?? '' }));

    if (pieces.length > 0) {
      ensureOpenSection().content.push({ kind: 'line', pieces });
    }
  }
  closeCurrent();

  return { key: song.key ?? undefined, sections };
}
