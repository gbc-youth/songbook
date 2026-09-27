import { useMemo } from 'react';
import './song.css';
import { parseBody } from './parseBody';
import type { Piece, SectionContent } from './parseBody';
import { accidentalForKey, transposeChordString } from './transpose';
import { needsHyphenFill } from './layout';
import type { RenderOptions } from './types';

export interface SongBodyProps {
  text: string;
  options: RenderOptions;
}

/**
 * Renders a ChordPro song's body: sections with quiet labels, comment cues, monospaced
 * tab/grid blocks, and chord-over-lyric (or, with chords off, plain-text) lines. Does not
 * render a title header — the app draws title, key and controls above this, and the
 * copyright line below it.
 */
export function SongBody({ text, options }: SongBodyProps) {
  const { key, sections } = useMemo(() => parseBody(text), [text]);
  const accidental = useMemo(() => accidentalForKey(key, options.transpose), [key, options.transpose]);

  return (
    <div className="sb-song-body">
      {sections.map((section, i) => (
        <section className="sb-song-section" key={i}>
          {section.label && <div className="sb-song-label">{section.label}</div>}
          {section.content.map((content, j) => (
            <SongContentBlock content={content} options={options} accidental={accidental} key={j} />
          ))}
        </section>
      ))}
    </div>
  );
}

function SongContentBlock({
  content,
  options,
  accidental,
}: {
  content: SectionContent;
  options: RenderOptions;
  accidental: 'b' | '#' | undefined;
}) {
  if (content.kind === 'comment') {
    return <p className={`sb-song-comment sb-song-comment--${content.variant}`}>{content.text}</p>;
  }
  if (content.kind === 'literal') {
    return <pre className="sb-song-literal">{content.text}</pre>;
  }
  return <SongLine pieces={content.pieces} options={options} accidental={accidental} />;
}

function SongLine({
  pieces,
  options,
  accidental,
}: {
  pieces: Piece[];
  options: RenderOptions;
  accidental: 'b' | '#' | undefined;
}) {
  const hasChordContent = pieces.some((p) => p.chord || p.annotation);

  if (!options.chords || !hasChordContent) {
    const plainText = pieces.map((p) => p.lyric).join('');
    return <p className="sb-song-line sb-song-line--plain">{plainText || ' '}</p>;
  }

  return (
    <p className="sb-song-line sb-song-line--chords">
      {pieces.map((piece, i) => {
        const next = pieces[i + 1];
        const chordText = piece.annotation
          ? piece.annotation
          : transposeChordString(piece.chord, options.transpose, accidental);
        const showHyphen = !piece.annotation && needsHyphenFill(chordText, piece.lyric, next?.lyric ?? '');

        return (
          <span className="sb-song-piece" key={i}>
            <span className={`sb-song-chord${piece.annotation ? ' sb-song-chord--annotation' : ''}`}>
              {chordText}
            </span>
            <span className="sb-song-lyric">
              {piece.lyric}
              {showHyphen && <span className="sb-song-hyphen-fill" aria-hidden="true" />}
            </span>
          </span>
        );
      })}
    </p>
  );
}
