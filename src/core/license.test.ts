import { describe, expect, it } from 'vitest';
import { effectiveSettings, isLicenseExpired, visibleSongs } from './license';
import type { Manifest } from './types';

function manifest(licenseExpires?: string): Manifest {
  return {
    format: 1,
    version: 1,
    publishedAt: '2024-01-01T00:00:00.000Z',
    church: { name: 'Test Church', licenseExpires },
    defaults: { theme: 'dark', chords: false, fontScale: 1.2 },
    songs: [
      {
        id: 'free',
        title: 'Free Song',
        license: 'public-domain',
        updatedAt: '2024-01-01T00:00:00.000Z',
        content: { id: 'f', sha256: 'f', size: 1, type: 'text/x-chordpro' },
      },
      {
        id: 'licensed',
        title: 'Licensed Song',
        license: 'ccli',
        updatedAt: '2024-01-01T00:00:00.000Z',
        content: { id: 'l', sha256: 'l', size: 1, type: 'text/x-chordpro' },
      },
    ],
    files: [],
    sets: [],
  };
}

describe('license', () => {
  it('is not expired with no licenseExpires', () => {
    expect(isLicenseExpired(manifest(undefined))).toBe(false);
  });

  it('shows all songs before expiry, hides licensed songs after', () => {
    const m = manifest('2024-06-01');
    expect(visibleSongs(m, new Date('2024-05-01')).map((s) => s.id)).toEqual(['free', 'licensed']);
    expect(isLicenseExpired(m, new Date('2024-07-01'))).toBe(true);
    expect(visibleSongs(m, new Date('2024-07-01')).map((s) => s.id)).toEqual(['free']);
  });

  it('effectiveSettings merges manifest defaults with viewer overrides', () => {
    const m = manifest(undefined);
    expect(effectiveSettings(m, {})).toEqual(m.defaults);
    expect(effectiveSettings(m, { chords: true })).toEqual({ theme: 'dark', chords: true, fontScale: 1.2 });
    expect(effectiveSettings(null, {})).toEqual({ theme: 'system', chords: true, fontScale: 1 });
  });
});
