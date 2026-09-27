import { describe, expect, it } from 'vitest';
import { buildJoinLink, parseJoinFragment } from './link';
import type { JoinInfo } from './types';

describe('link', () => {
  const info: JoinInfo = {
    source: 'https://church.example.com/songbook-data/',
    key: 'KRJjgbFLzod-s1sY7k8_UUO8Om_GKm_0aGeGhnECXvs',
  };

  it('round-trips build -> parse', () => {
    const link = buildJoinLink('https://gbc-youth.github.io/songbook/', info);
    expect(parseJoinFragment(link)).toEqual(info);
  });

  it('parses a bare fragment', () => {
    const link = buildJoinLink('https://gbc-youth.github.io/songbook/', info);
    const fragment = link.slice(link.indexOf('#'));
    expect(parseJoinFragment(fragment)).toEqual(info);
  });

  it('parses when embedded in a full URL', () => {
    const full = `https://gbc-youth.github.io/songbook/?utm=x#s=${encodeURIComponent(info.source)}&k=${info.key}`;
    expect(parseJoinFragment(full)).toEqual(info);
  });

  it('returns null for junk input', () => {
    expect(parseJoinFragment('')).toBeNull();
    expect(parseJoinFragment('not a link at all')).toBeNull();
    expect(parseJoinFragment('#k=onlykey')).toBeNull();
    expect(parseJoinFragment('#s=onlysource')).toBeNull();
    expect(parseJoinFragment('https://example.com/#nothing=here')).toBeNull();
  });
});
