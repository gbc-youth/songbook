import { describe, expect, it } from 'vitest';
import { songInfo } from './songInfo';

describe('songInfo', () => {
  it('reads standard directives', () => {
    const info = songInfo(`{title: Amazing Grace}
{subtitle: NEW BRITAIN}
{key: G}
{tempo: 72}
{time: 3/4}
{composer: American melody}
{lyricist: John Newton}
{copyright: Public domain}

{start_of_verse}
A[G]mazing [C]grace, how [G]sweet the sound
{end_of_verse}
`);

    expect(info.title).toBe('Amazing Grace');
    expect(info.subtitle).toBe('NEW BRITAIN');
    expect(info.key).toBe('G');
    expect(info.tempo).toBe(72);
    expect(info.time).toBe('3/4');
    expect(info.copyright).toBe('Public domain');
    expect(info.authors).toBe('Words: John Newton. Music: American melody.');
    expect(info.firstLine).toBe('Amazing grace, how sweet the sound');
  });

  it('accepts short directive aliases {t} and {st}', () => {
    const info = songInfo(`{t: Title}\n{st: Subtitle}\n`);
    expect(info.title).toBe('Title');
    expect(info.subtitle).toBe('Subtitle');
  });

  it('falls back to a plain author list from {artist} when there is no lyricist/composer', () => {
    const info = songInfo(`{title: X}\n{artist: The Choir}\n`);
    expect(info.authors).toBe('The Choir');
  });

  it('reads ccli from {ccli: N}', () => {
    const info = songInfo(`{title: X}\n{ccli: 12345}\n`);
    expect(info.ccli).toBe('12345');
  });

  it('reads ccli from {meta: ccli N}', () => {
    const info = songInfo(`{title: X}\n{meta: ccli 6789}\n`);
    expect(info.ccli).toBe('6789');
  });

  it('strips chords from the first lyric line', () => {
    const info = songInfo(`{title: X}\n[D]Line one [G]here\nLine two\n`);
    expect(info.firstLine).toBe('Line one here');
  });

  it('leaves fields undefined when directives are absent', () => {
    const info = songInfo('Just lyrics, no directives at all\n');
    expect(info.title).toBeUndefined();
    expect(info.key).toBeUndefined();
    expect(info.ccli).toBeUndefined();
    expect(info.authors).toBeUndefined();
    expect(info.firstLine).toBe('Just lyrics, no directives at all');
  });
});
