import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildBundle, type Draft } from './bundle';
import { generateKey } from './crypto';
import { db } from './db';
import { getBlobText, getLastSync, getManifest, joinSongbook, sync } from './sync';

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

/** A fake static host: serves whatever files.Map was most recently `publish`-ed, under `source`. */
function makeServer(source: string) {
  let files = new Map<string, Uint8Array>();
  const fetchMock = vi.fn(async (url: string | URL) => {
    const rel = url.toString().slice(source.length);
    const bytes = files.get(rel);
    if (!bytes) return { ok: false, status: 404 } as Response;
    return {
      ok: true,
      status: 200,
      json: async () => JSON.parse(new TextDecoder().decode(bytes)),
      arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    } as unknown as Response;
  });
  return {
    fetch: fetchMock as unknown as typeof fetch,
    callCount: () => fetchMock.mock.calls.length,
    publish(newFiles: Map<string, Uint8Array>) {
      files = new Map(newFiles);
    },
  };
}

describe('sync', () => {
  const source = 'https://example.test/church/';

  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('joins, no-ops, updates a changed song, GCs the stale blob, and reports offline', async () => {
    const key = generateKey();
    const server = makeServer(source);
    vi.stubGlobal('fetch', server.fetch);

    const v1 = await buildBundle(key, draft({ a: 'song a v1', b: 'song b' }), null);
    server.publish(v1.files);

    const joinResult = await joinSongbook({ source, key });
    expect(joinResult.status).toBe('updated');
    expect(joinResult.version).toBe(1);
    expect(joinResult.downloaded).toBe(2);
    expect((await getManifest())?.version).toBe(1);

    const aRefV1 = v1.manifest.songs.find((s) => s.id === 'a')!.content;
    const bRefV1 = v1.manifest.songs.find((s) => s.id === 'b')!.content;
    expect(await getBlobText(aRefV1)).toBe('song a v1');

    // Second sync against an unchanged server is a no-op.
    const callsBeforeNoop = server.callCount();
    const noop = await sync();
    expect(noop.status).toBe('up-to-date');
    expect(noop.version).toBe(1);
    expect(server.callCount()).toBe(callsBeforeNoop + 1); // only index.json was checked

    // Publish v2: 'a' changes, 'b' is untouched -> its blob is reused.
    const v2 = await buildBundle(key, draft({ a: 'song a v2', b: 'song b' }), v1.manifest);
    expect(v2.reused).toEqual([bRefV1.id]);
    server.publish(v2.files);

    const updated = await sync();
    expect(updated.status).toBe('updated');
    expect(updated.version).toBe(2);
    expect(updated.downloaded).toBe(1); // exactly the one changed song blob

    const aRefV2 = v2.manifest.songs.find((s) => s.id === 'a')!.content;
    expect(aRefV2.id).not.toBe(aRefV1.id);
    expect(await getBlobText(aRefV2)).toBe('song a v2');

    // GC removed the now-unreferenced old blob for 'a', kept the reused blob for 'b'.
    expect(await db.blobs.get(aRefV1.id)).toBeUndefined();
    expect(await db.blobs.get(bRefV1.id)).toBeDefined();

    const last = await getLastSync();
    expect(last?.result.status).toBe('updated');
    expect(last?.result.version).toBe(2);

    // Network down -> offline, never throws.
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('network down');
      }),
    );
    const offline = await sync();
    expect(offline.status).toBe('offline');
  });

  it('reports progress while downloading', async () => {
    const key = generateKey();
    const server = makeServer(source);
    vi.stubGlobal('fetch', server.fetch);

    const v1 = await buildBundle(key, draft({ a: 'song a', b: 'song b', c: 'song c' }), null);
    server.publish(v1.files);

    const progress: Array<[number, number]> = [];
    await joinSongbook({ source, key }, (done, total) => progress.push([done, total]));

    expect(progress[0]).toEqual([0, 3]);
    expect(progress[progress.length - 1]).toEqual([3, 3]);
  });
});
