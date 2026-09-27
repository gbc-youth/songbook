import { describe, expect, it } from 'vitest';
import type { SongMeta } from '../core';
import { lyricLines, normalizeForSearch, searchSongs, type SearchDoc } from './search';

function song(overrides: Partial<SongMeta>): SongMeta {
  return {
    id: overrides.title ?? 's1',
    title: 'Untitled',
    license: 'public-domain',
    content: { id: 'a', sha256: 'a', size: 0, type: 'text/x-chordpro' },
    updatedAt: '2024-01-01',
    ...overrides,
  };
}

const grace: SearchDoc = {
  song: song({ title: 'Amazing Grace', authors: 'John Newton', ccliSong: '22025' }),
  lines: lyricLines(`{title: Amazing Grace}
{start_of_verse}
A[G]mazing [G7]grace! How [C]sweet the [G]sound
{end_of_verse}
{c: softly}
'Twas [G]grace that [G7]taught my [C]heart to [G]fear,
{start_of_tab}
e|--3--|
{end_of_tab}`),
};
const assurance: SearchDoc = {
  song: song({ title: 'Blessed Assurance', authors: 'Fanny J. Crosby' }),
  lines: ['Blessed assurance, Jesus is mine!', 'This is my story, this is my song,'],
};
const graceTitle: SearchDoc = { song: song({ title: 'Grace Alone' }), lines: ['Every promise we can make'] };
const russian: SearchDoc = { song: song({ title: 'Ещё одна' }), lines: ['Твой свет'] };
const docs = [grace, assurance, graceTitle, russian];
const titles = (q: string) => searchSongs(docs, q).map((h) => h.song.title);

describe('normalizeForSearch', () => {
  it('strips diacritics, apostrophes and punctuation', () => {
    expect(normalizeForSearch("José — 'Twas grace!")).toBe('jose twas grace');
  });
  it('folds ё to е', () => {
    expect(normalizeForSearch('Ещё')).toBe('еще');
  });
});

describe('lyricLines', () => {
  it('drops chords, directives, comments and tab blocks', () => {
    expect(grace.lines).toEqual(['Amazing grace! How sweet the sound', "'Twas grace that taught my heart to fear,"]);
  });
});

describe('searchSongs', () => {
  it('finds a song by a remembered lyric line and shows it', () => {
    const [hit] = searchSongs(docs, 'how sweet the sound');
    expect(hit.song.title).toBe('Amazing Grace');
    expect(hit.snippet).toBe('Amazing grace! How sweet the sound');
  });

  it('ranks titles starting with the query first, then titles containing it', () => {
    expect(titles('grace')).toEqual(['Grace Alone', 'Amazing Grace']);
  });

  it('ranks a title match above a lyric-only match', () => {
    const lyricOnly: SearchDoc = { song: song({ title: 'Other' }), lines: ['sweet sound of grace'] };
    expect(searchSongs([lyricOnly, grace], 'grace').map((h) => h.song.title)).toEqual(['Amazing Grace', 'Other']);
  });

  it('matches words across fields', () => {
    expect(titles('crosby story')).toEqual(['Blessed Assurance']);
  });

  it('matches word prefixes, not substrings', () => {
    expect(titles('assur')).toEqual(['Blessed Assurance']);
    expect(titles('race')).toEqual([]);
  });

  it('ignores apostrophes and finds by CCLI number', () => {
    expect(titles('twas')).toEqual(['Amazing Grace']);
    expect(titles('22025')).toEqual(['Amazing Grace']);
  });

  it('omits the snippet when the title explains the hit', () => {
    expect(searchSongs(docs, 'blessed')[0].snippet).toBeUndefined();
  });

  it('searches Cyrillic with ё folded', () => {
    expect(titles('еще')).toEqual(['Ещё одна']);
    expect(titles('свет')).toEqual(['Ещё одна']);
  });

  it('does not search tab blocks', () => {
    expect(titles('e 3')).toEqual([]);
  });
});
