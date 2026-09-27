import { unzipSync } from 'fflate';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { BuiltBundle, Draft, Manifest } from '../../core';

const buildBundleMock = vi.fn<(key: string, draft: Draft, previous: Manifest | null) => Promise<BuiltBundle>>();

vi.mock('../../core', () => ({
  buildBundle: (...args: [string, Draft, Manifest | null]) => buildBundleMock(...args),
}));

import { buildZipBundle } from './zip';

function baseManifest(version: number): Manifest {
  return {
    format: 1,
    version,
    publishedAt: '2026-01-01T00:00:00.000Z',
    church: { name: 'Test Church' },
    defaults: { theme: 'system', chords: true, fontScale: 1 },
    songs: [],
    files: [],
    sets: [],
  };
}

describe('buildZipBundle', () => {
  beforeEach(() => {
    buildBundleMock.mockReset();
  });

  it('zips index.json and all blobs, fetching reused ones from the current source', async () => {
    const files = new Map<string, Uint8Array>();
    files.set('index.json', new Uint8Array([1]));
    files.set('blobs/new1', new Uint8Array([2, 2]));
    buildBundleMock.mockResolvedValue({
      index: { format: 1, version: 3, manifest: 'manifestid' },
      manifest: baseManifest(3),
      files,
      reused: ['reused1'],
    });

    const fetchMock = vi.fn(async (url: string) => {
      expect(url).toBe('https://example.com/songbook/blobs/reused1');
      return {
        ok: true,
        arrayBuffer: async () => new Uint8Array([9, 9, 9]).buffer,
      } as unknown as Response;
    });

    const result = await buildZipBundle(
      'the-key',
      {} as Draft,
      baseManifest(2),
      'https://example.com/songbook/',
      fetchMock as unknown as typeof fetch,
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const unzipped = unzipSync(result.bytes);
    expect(Object.keys(unzipped).sort()).toEqual(['blobs/new1', 'blobs/reused1', 'index.json'].sort());
    expect(unzipped['index.json']).toEqual(new Uint8Array([1]));
    expect(unzipped['blobs/new1']).toEqual(new Uint8Array([2, 2]));
    expect(unzipped['blobs/reused1']).toEqual(new Uint8Array([9, 9, 9]));
    expect(result.manifest.version).toBe(3);
  });

  it('makes no network calls for a first-ever publish (nothing to reuse)', async () => {
    const files = new Map<string, Uint8Array>();
    files.set('index.json', new Uint8Array([7]));
    files.set('blobs/new1', new Uint8Array([8]));
    buildBundleMock.mockResolvedValue({
      index: { format: 1, version: 1, manifest: 'manifestid' },
      manifest: baseManifest(1),
      files,
      reused: [],
    });

    const fetchMock = vi.fn();
    const result = await buildZipBundle('the-key', {} as Draft, null, null, fetchMock as unknown as typeof fetch);

    expect(fetchMock).not.toHaveBeenCalled();
    const unzipped = unzipSync(result.bytes);
    expect(Object.keys(unzipped).sort()).toEqual(['blobs/new1', 'index.json']);
  });

  it('throws a clear error if a reused blob is needed but there is no source to fetch it from', async () => {
    const files = new Map<string, Uint8Array>();
    files.set('index.json', new Uint8Array([1]));
    buildBundleMock.mockResolvedValue({
      index: { format: 1, version: 2, manifest: 'manifestid' },
      manifest: baseManifest(2),
      files,
      reused: ['reused1'],
    });

    await expect(buildZipBundle('the-key', {} as Draft, baseManifest(1), null)).rejects.toThrow(/no source/i);
  });
});
