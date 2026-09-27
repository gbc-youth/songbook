import { describe, expect, it } from 'vitest';
import { buildBundle, readBundle, type Draft } from './bundle';
import { generateKey } from './crypto';

function draft(songTexts: Record<string, string>): Draft {
  return {
    church: { name: 'Test Church' },
    defaults: { theme: 'system', chords: true, fontScale: 1 },
    songs: Object.entries(songTexts).map(([id, text]) => ({
      id,
      title: id,
      license: 'public-domain' as const,
      updatedAt: '2024-01-01T00:00:00.000Z',
      text,
    })),
    files: [],
    sets: [],
  };
}

describe('buildBundle', () => {
  it('reuses unchanged blobs across publishes and bumps the version', async () => {
    const key = generateKey();
    const v1 = await buildBundle(key, draft({ a: 'song a v1', b: 'song b' }), null);
    expect(v1.manifest.version).toBe(1);
    expect(v1.reused).toEqual([]);

    const bBlobId = v1.manifest.songs.find((s) => s.id === 'b')!.content.id;

    const v2 = await buildBundle(key, draft({ a: 'song a v2', b: 'song b' }), v1.manifest);
    expect(v2.manifest.version).toBe(2);
    expect(v2.reused).toEqual([bBlobId]);

    // 'b' keeps the same BlobRef; the reused file is not re-emitted.
    const bMeta2 = v2.manifest.songs.find((s) => s.id === 'b')!.content;
    expect(bMeta2.id).toBe(bBlobId);
    expect(v2.files.has(`blobs/${bBlobId}`)).toBe(false);

    // 'a' changed, so it gets a new blob id and IS emitted.
    const aMeta1 = v1.manifest.songs.find((s) => s.id === 'a')!.content;
    const aMeta2 = v2.manifest.songs.find((s) => s.id === 'a')!.content;
    expect(aMeta2.id).not.toBe(aMeta1.id);
    expect(v2.files.has(`blobs/${aMeta2.id}`)).toBe(true);

    // index.json and the manifest blob are always freshly emitted.
    expect(v2.files.has('index.json')).toBe(true);
    expect(v2.files.has(`blobs/${v2.index.manifest}`)).toBe(true);
  });

  it('round-trips through readBundle with a fetch backed by the built files', async () => {
    const key = generateKey();
    const built = await buildBundle(key, draft({ only: 'the only song' }), null);
    const source = 'https://example.test/church/';

    const fakeFetch = (async (url: string | URL) => {
      const rel = url.toString().slice(source.length);
      const bytes = built.files.get(rel);
      if (!bytes) return { ok: false, status: 404 } as Response;
      return {
        ok: true,
        status: 200,
        json: async () => JSON.parse(new TextDecoder().decode(bytes)),
        arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
      } as unknown as Response;
    }) as typeof fetch;

    const { index, manifest } = await readBundle(source, key, fakeFetch);
    expect(index.format).toBe(1);
    expect(manifest.songs[0].title).toBe('only');
  });

  it('readBundle throws a human-readable error for the wrong key', async () => {
    const key = generateKey();
    const built = await buildBundle(key, draft({ only: 'the only song' }), null);
    const source = 'https://example.test/church/';

    const fakeFetch = (async (url: string | URL) => {
      const rel = url.toString().slice(source.length);
      const bytes = built.files.get(rel);
      if (!bytes) return { ok: false, status: 404 } as Response;
      return {
        ok: true,
        status: 200,
        json: async () => JSON.parse(new TextDecoder().decode(bytes)),
        arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
      } as unknown as Response;
    }) as typeof fetch;

    await expect(readBundle(source, generateKey(), fakeFetch)).rejects.toThrow(
      "This link's key doesn't open the songbook",
    );
  });
});
