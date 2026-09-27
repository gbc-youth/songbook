import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { SongBody } from './SongBody';

afterEach(cleanup);

describe('SongBody', () => {
  it('renders chords-off as plain text, with no chord row', () => {
    const text = `{start_of_verse}\nA[G]mazing [C]grace, how [G]sweet the sound\n{end_of_verse}\n`;
    const { container } = render(<SongBody text={text} options={{ chords: false, transpose: 0 }} />);

    expect(container.querySelector('.sb-song-chord')).toBeNull();
    expect(container.querySelector('.sb-song-line--plain')?.textContent).toBe(
      'Amazing grace, how sweet the sound',
    );
  });

  it('renders a chord row above the lyrics when chords are on', () => {
    const text = `{start_of_verse}\nA[G]mazing [C]grace\n{end_of_verse}\n`;
    const { container } = render(<SongBody text={text} options={{ chords: true, transpose: 0 }} />);

    const chords = Array.from(container.querySelectorAll('.sb-song-chord')).map((el) => el.textContent);
    expect(chords).toEqual(['', 'G', 'C']);
  });

  it('does not reserve a chord row for a line with no chords', () => {
    const text = `{start_of_verse}\nA[G]mazing grace\nSpoken line, no chords here\n{end_of_verse}\n`;
    const { container } = render(<SongBody text={text} options={{ chords: true, transpose: 0 }} />);

    const lines = container.querySelectorAll('.sb-song-line');
    expect(lines[0].className).toContain('sb-song-line--chords');
    expect(lines[1].className).toContain('sb-song-line--plain');
    expect(lines[1].textContent).toBe('Spoken line, no chords here');
  });

  it('shows the hyphen fill only when a wide chord splits a word', () => {
    const midWord = `{start_of_verse}\nA[G/B]m[E]azing grace\n{end_of_verse}\n`;
    const { container: withGap } = render(<SongBody text={midWord} options={{ chords: true, transpose: 0 }} />);
    expect(withGap.querySelectorAll('.sb-song-hyphen-fill').length).toBe(1);

    const wholeWord = `{start_of_verse}\nA[G]mazing grace\n{end_of_verse}\n`;
    const { container: withoutGap } = render(<SongBody text={wholeWord} options={{ chords: true, transpose: 0 }} />);
    expect(withoutGap.querySelectorAll('.sb-song-hyphen-fill').length).toBe(0);
  });

  it('shows an annotation in the chord row but never transposes it', () => {
    const text = `{key: G}\n{start_of_verse}\n[*Slower]That saved a [D]wretch like [G]me\n{end_of_verse}\n`;
    const { container } = render(<SongBody text={text} options={{ chords: true, transpose: 2 }} />);

    const chords = Array.from(container.querySelectorAll('.sb-song-chord')).map((el) => el.textContent);
    expect(chords).toContain('Slower');
    expect(chords).toContain('E'); // D, transposed +2 semitones in the (transposed) key of A
    expect(chords).not.toContain('E#'); // never respelled as if it were a real chord either
  });

  it('recalls the last chorus on {chorus}, or a bare label when there is none yet', () => {
    const withChorus = `{start_of_chorus}\nHallelu[G]jah\n{end_of_chorus}\n{chorus}\n`;
    const { container } = render(<SongBody text={withChorus} options={{ chords: true, transpose: 0 }} />);

    const labels = Array.from(container.querySelectorAll('.sb-song-label')).map((el) => el.textContent);
    expect(labels).toEqual(['Chorus', 'Chorus']);
    expect(container.querySelectorAll('.sb-song-line--chords').length).toBe(2);

    const withoutChorus = `{chorus}\n`;
    const { container: bare } = render(<SongBody text={withoutChorus} options={{ chords: true, transpose: 0 }} />);
    expect(bare.querySelector('.sb-song-label')?.textContent).toBe('Chorus');
    expect(bare.querySelectorAll('.sb-song-line--chords').length).toBe(0);
  });

  it('renders comment cues and monospaced tab blocks without reflowing them', () => {
    const text = `{start_of_tab}\ne|---0---0---|\nB|---1---1---|\n{end_of_tab}\n{comment: Bridge builds here}\n`;
    const { container } = render(<SongBody text={text} options={{ chords: true, transpose: 0 }} />);

    const literalLines = Array.from(container.querySelectorAll('.sb-song-literal')).map((el) => el.textContent);
    expect(literalLines).toEqual(['e|---0---0---|', 'B|---1---1---|']);
    expect(container.querySelector('.sb-song-comment')?.textContent).toBe('Bridge builds here');
  });

  it('numbers unlabeled verses', () => {
    const text = `{start_of_verse}\nFirst\n{end_of_verse}\n{start_of_verse}\nSecond\n{end_of_verse}\n`;
    const { container } = render(<SongBody text={text} options={{ chords: true, transpose: 0 }} />);
    const labels = Array.from(container.querySelectorAll('.sb-song-label')).map((el) => el.textContent);
    expect(labels).toEqual(['Verse 1', 'Verse 2']);
  });
});
