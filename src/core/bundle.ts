// Pure bundle building/reading — no DB. Used by admin (browser) and scripts/build-demo.ts (Node).
import type { BundleIndex, BlobRef, ChurchInfo, FileMeta, Manifest, SetList, SongMeta, ViewerDefaults } from './types';
import { decryptBytes, encryptBytes, importKey, sha256Hex } from './crypto';

export interface DraftSong extends Omit<SongMeta, 'content'> {
  text: string;
}
export interface DraftFile extends Omit<FileMeta, 'content'> {
  bytes: Uint8Array;
  type: string;
}
export interface Draft {
  church: Omit<ChurchInfo, 'logo'> & { logo?: { bytes: Uint8Array; type: string } };
  defaults: ViewerDefaults;
  songs: DraftSong[];
  files: DraftFile[];
  sets: SetList[];
}
export interface BuiltBundle {
  index: BundleIndex;
  manifest: Manifest;
  /** path relative to source -> bytes: 'index.json' and every NEW 'blobs/<id>' */
  files: Map<string, Uint8Array>;
  /** blob ids referenced by the manifest that were reused from `previous` (already hosted) */
  reused: string[];
}

const enc = new TextEncoder();
const dec = new TextDecoder();

/** Encrypts `plain` into a new blob, or reuses a previous BlobRef with the same plaintext sha256. */
async function makeBlob(
  key: CryptoKey,
  plain: Uint8Array,
  type: string,
  previousBySha: Map<string, BlobRef>,
  files: Map<string, Uint8Array>,
  reused: Set<string>,
): Promise<BlobRef> {
  const sha256 = await sha256Hex(plain);
  const prev = previousBySha.get(sha256);
  if (prev) {
    reused.add(prev.id);
    return prev;
  }
  const encrypted = await encryptBytes(key, plain);
  const id = await sha256Hex(encrypted);
  files.set(`blobs/${id}`, encrypted);
  return { id, sha256, size: plain.length, type };
}

export async function buildBundle(key: string, draft: Draft, previous?: Manifest | null): Promise<BuiltBundle> {
  const cryptoKey = await importKey(key);
  const files = new Map<string, Uint8Array>();
  const reused = new Set<string>();

  const previousBySha = new Map<string, BlobRef>();
  if (previous) {
    for (const s of previous.songs) previousBySha.set(s.content.sha256, s.content);
    for (const f of previous.files) previousBySha.set(f.content.sha256, f.content);
    if (previous.church.logo) previousBySha.set(previous.church.logo.sha256, previous.church.logo);
  }

  // Sequential (not Promise.all) so output order deterministically mirrors draft order.
  const songs: SongMeta[] = [];
  for (const { text, ...meta } of draft.songs) {
    const content = await makeBlob(cryptoKey, enc.encode(text), 'text/x-chordpro', previousBySha, files, reused);
    songs.push({ ...meta, content });
  }

  const fileMetas: FileMeta[] = [];
  for (const { bytes, type, ...meta } of draft.files) {
    const content = await makeBlob(cryptoKey, bytes, type, previousBySha, files, reused);
    fileMetas.push({ ...meta, content });
  }

  let logo: BlobRef | undefined;
  if (draft.church.logo) {
    logo = await makeBlob(cryptoKey, draft.church.logo.bytes, draft.church.logo.type, previousBySha, files, reused);
  }

  const manifest: Manifest = {
    format: 1,
    version: (previous?.version ?? 0) + 1,
    publishedAt: new Date().toISOString(),
    church: { ...draft.church, logo },
    defaults: draft.defaults,
    songs,
    files: fileMetas,
    sets: draft.sets,
  };

  const manifestEncrypted = await encryptBytes(cryptoKey, enc.encode(JSON.stringify(manifest)));
  const manifestId = await sha256Hex(manifestEncrypted);
  files.set(`blobs/${manifestId}`, manifestEncrypted);

  const index: BundleIndex = { format: 1, version: manifest.version, manifest: manifestId };
  files.set('index.json', enc.encode(`${JSON.stringify(index, null, 2)}\n`));

  return { index, manifest, files, reused: [...reused] };
}

export async function readBundle(
  source: string,
  key: string,
  fetchFn: typeof fetch = fetch,
): Promise<{ index: BundleIndex; manifest: Manifest }> {
  const cryptoKey = await importKey(key);

  const indexRes = await fetchFn(`${source}index.json`, { cache: 'no-store' });
  if (!indexRes.ok) throw new Error(`Could not reach the songbook (HTTP ${indexRes.status})`);
  const index = (await indexRes.json()) as BundleIndex;
  if (index.format !== 1) throw new Error('Unsupported bundle format');

  const blobRes = await fetchFn(`${source}blobs/${index.manifest}`);
  if (!blobRes.ok) throw new Error(`Could not reach the songbook (HTTP ${blobRes.status})`);
  const encrypted = new Uint8Array(await blobRes.arrayBuffer());
  const plain = await decryptBytes(cryptoKey, encrypted); // throws human-readable message on wrong key/tamper

  const manifest = JSON.parse(dec.decode(plain)) as Manifest;
  if (manifest.format !== 1) throw new Error('Unsupported bundle format');

  return { index, manifest };
}
