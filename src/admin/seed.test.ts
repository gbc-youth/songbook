import { describe, expect, it, vi } from 'vitest';
import type { BlobRef, Manifest } from '../core';

const getBlobTextMock = vi.fn<(ref: BlobRef) => Promise<string | null>>();
const getBlobBytesMock = vi.fn<(ref: BlobRef) => Promise<Uint8Array | null>>();

vi.mock('../core', () => ({
  getBlobText: (ref: BlobRef) => getBlobTextMock(ref),
  getBlobBytes: (ref: BlobRef) => getBlobBytesMock(ref),
}));

import { seedDraftFromManifest, seedEmptyDraft } from './seed';

function manifest(): Manifest {
  return {
    format: 1,
    version: 4,
    publishedAt: '2026-01-01T00:00:00.000Z',
    church: {
      name: 'Grace Church',
      ccliLicense: '12345',
      logo: { id: 'logoid', sha256: 'logosha', size: 10, type: 'image/png' },
    },
    defaults: { theme: 'dark', chords: false, fontScale: 1.1 },
    songs: [
      {
        id: 's1',
        title: 'Amazing Grace',
        license: 'public-domain',
        content: { id: 'songblob1', sha256: 'sha1', size: 100, type: 'text/x-chordpro' },
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ],
    files: [
      {
        id: 'f1',
        title: 'Lead sheet',
        songId: 's1',
        content: { id: 'fileblob1', sha256: 'sha2', size: 200, type: 'application/pdf' },
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ],
    sets: [{ id: 'set1', title: 'Sunday', items: [{ songId: 's1', key: 'D' }] }],
  };
}

describe('seedDraftFromManifest', () => {
  it('turns a manifest and its blobs back into an editable Draft', async () => {
    getBlobTextMock.mockImplementation(async (ref) => `text-for-${ref.id}`);
    getBlobBytesMock.mockImplementation(async (ref) => new Uint8Array([ref.id.length]));

    const m = manifest();
    const draft = await seedDraftFromManifest(m);

    expect(getBlobTextMock).toHaveBeenCalledWith(m.songs[0].content);
    expect(getBlobBytesMock).toHaveBeenCalledWith(m.files[0].content);
    expect(getBlobBytesMock).toHaveBeenCalledWith(m.church.logo);

    expect(draft.church.name).toBe('Grace Church');
    expect(draft.church.ccliLicense).toBe('12345');
    expect(draft.church.logo?.type).toBe('image/png');
    expect(draft.defaults).toEqual({ theme: 'dark', chords: false, fontScale: 1.1 });

    expect(draft.songs).toHaveLength(1);
    expect(draft.songs[0]).toMatchObject({ id: 's1', title: 'Amazing Grace', text: 'text-for-songblob1' });
    expect('content' in draft.songs[0]).toBe(false);

    expect(draft.files).toHaveLength(1);
    expect(draft.files[0]).toMatchObject({ id: 'f1', title: 'Lead sheet', songId: 's1', type: 'application/pdf' });
    expect('content' in draft.files[0]).toBe(false);

    expect(draft.sets).toEqual(m.sets);
    expect(draft.sets).not.toBe(m.sets);
    expect(draft.sets[0].items).not.toBe(m.sets[0].items);
  });

  it('starts from an empty draft when nothing has been published yet', () => {
    const draft = seedEmptyDraft('New Church');
    expect(draft.church).toEqual({ name: 'New Church' });
    expect(draft.songs).toEqual([]);
    expect(draft.files).toEqual([]);
    expect(draft.sets).toEqual([]);
  });
});
