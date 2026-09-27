import type { BlobRef, BundleIndex, JoinInfo, Manifest, SyncResult, ViewerSettings } from './types';
import { db } from './db';
import { decryptBytes, importKey, sha256Hex } from './crypto';
import { readBundle } from './bundle';

const dec = new TextDecoder();
const CONCURRENCY = 6;

async function mapLimit<T>(items: T[], limit: number, fn: (item: T) => Promise<void>): Promise<void> {
  let i = 0;
  async function worker(): Promise<void> {
    while (i < items.length) {
      const item = items[i++];
      await fn(item);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}

function collectBlobRefs(m: Manifest): BlobRef[] {
  const refs = [...m.songs.map((s) => s.content), ...m.files.map((f) => f.content)];
  if (m.church.logo) refs.push(m.church.logo);
  return refs;
}

async function recordSync(result: SyncResult): Promise<SyncResult> {
  await db.kv.put({ key: 'lastSync', value: { at: new Date().toISOString(), result } });
  return result;
}

/** Validates by fetching+decrypting first; stores nothing if that fails (throws a human-readable Error). */
export async function joinSongbook(
  info: JoinInfo,
  onProgress?: (done: number, total: number) => void,
): Promise<SyncResult> {
  await readBundle(info.source, info.key);
  await db.kv.put({ key: 'join', value: info });
  return sync(onProgress);
}

export async function sync(onProgress?: (done: number, total: number) => void): Promise<SyncResult> {
  const joinRow = await db.kv.get('join');
  const info = joinRow?.value as JoinInfo | undefined;
  if (!info) return recordSync({ status: 'error', error: 'Not joined to a songbook' });

  let index: BundleIndex;
  try {
    const res = await fetch(`${info.source}index.json`, { cache: 'no-store' });
    if (!res.ok) return recordSync({ status: 'offline' });
    index = (await res.json()) as BundleIndex;
  } catch (e) {
    if (e instanceof TypeError) return recordSync({ status: 'offline' });
    return recordSync({ status: 'error', error: e instanceof Error ? e.message : String(e) });
  }
  if (index.format !== 1) return recordSync({ status: 'error', error: 'Unsupported bundle format' });

  const storedManifestRow = await db.kv.get('manifest');
  const storedManifest = storedManifestRow?.value as Manifest | undefined;
  if (storedManifest && index.version <= storedManifest.version) {
    return recordSync({ status: 'up-to-date', version: storedManifest.version });
  }

  try {
    const cryptoKey = await importKey(info.key);

    const manifestRes = await fetch(`${info.source}blobs/${index.manifest}`);
    if (!manifestRes.ok) return recordSync({ status: 'offline' });
    const manifestEncrypted = new Uint8Array(await manifestRes.arrayBuffer());
    const manifestPlain = await decryptBytes(cryptoKey, manifestEncrypted);
    const manifest = JSON.parse(dec.decode(manifestPlain)) as Manifest;
    if (manifest.format !== 1) throw new Error('Unsupported bundle format');

    const refs = collectBlobRefs(manifest);
    const missing: BlobRef[] = [];
    for (const ref of refs) {
      if (!(await db.blobs.get(ref.id))) missing.push(ref);
    }

    let done = 0;
    const total = missing.length;
    onProgress?.(done, total);

    await mapLimit(missing, CONCURRENCY, async (ref) => {
      const blobRes = await fetch(`${info.source}blobs/${ref.id}`);
      if (!blobRes.ok) throw new Error(`Could not download blob ${ref.id}`);
      const encrypted = new Uint8Array(await blobRes.arrayBuffer());
      const plain = await decryptBytes(cryptoKey, encrypted);
      const sha = await sha256Hex(plain);
      if (sha !== ref.sha256) throw new Error('Downloaded content failed verification');
      await db.blobs.put({ id: ref.id, bytes: plain });
      done++;
      onProgress?.(done, total);
    });

    // Atomic swap: the manifest is stored only once every referenced blob is present.
    await db.kv.put({ key: 'manifest', value: manifest });

    // GC blobs no longer referenced by the new manifest.
    const keep = new Set(refs.map((r) => r.id));
    const allBlobs = await db.blobs.toArray();
    const stale = allBlobs.filter((b) => !keep.has(b.id)).map((b) => b.id);
    if (stale.length) await db.blobs.bulkDelete(stale);

    return recordSync({ status: 'updated', version: manifest.version, downloaded: total });
  } catch (e) {
    if (e instanceof TypeError) return recordSync({ status: 'offline' });
    return recordSync({ status: 'error', error: e instanceof Error ? e.message : String(e) });
  }
}

export async function getJoined(): Promise<JoinInfo | null> {
  const row = await db.kv.get('join');
  return (row?.value as JoinInfo | undefined) ?? null;
}

export async function getManifest(): Promise<Manifest | null> {
  const row = await db.kv.get('manifest');
  return (row?.value as Manifest | undefined) ?? null;
}

/** If a blob is missing locally (shouldn't happen after sync) try fetch+decrypt+store; null if offline. */
export async function getBlobBytes(ref: BlobRef): Promise<Uint8Array | null> {
  const row = await db.blobs.get(ref.id);
  if (row) return row.bytes;

  const info = await getJoined();
  if (!info) return null;
  try {
    const cryptoKey = await importKey(info.key);
    const res = await fetch(`${info.source}blobs/${ref.id}`);
    if (!res.ok) return null;
    const encrypted = new Uint8Array(await res.arrayBuffer());
    const plain = await decryptBytes(cryptoKey, encrypted);
    if ((await sha256Hex(plain)) !== ref.sha256) return null;
    await db.blobs.put({ id: ref.id, bytes: plain });
    return plain;
  } catch {
    return null;
  }
}

export async function getBlobText(ref: BlobRef): Promise<string | null> {
  const bytes = await getBlobBytes(ref);
  return bytes ? dec.decode(bytes) : null;
}

export async function getLastSync(): Promise<{ at: string; result: SyncResult } | null> {
  const row = await db.kv.get('lastSync');
  return (row?.value as { at: string; result: SyncResult } | undefined) ?? null;
}

export async function leaveSongbook(): Promise<void> {
  await db.delete();
  await db.open();
}

export async function getSettings(): Promise<ViewerSettings> {
  const row = await db.kv.get('settings');
  return (row?.value as ViewerSettings | undefined) ?? {};
}

export async function saveSettings(s: ViewerSettings): Promise<void> {
  await db.kv.put({ key: 'settings', value: s });
}
