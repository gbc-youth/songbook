// Builds a full, self-contained .zip of the bundle (index.json + every blob,
// including ones that were reused from `previous`) for any static host.
import { zipSync, type Zippable } from 'fflate';
import * as core from '../../core';
import type { Draft, Manifest } from '../../core';

export interface ZipResult {
  manifest: Manifest;
  bytes: Uint8Array;
}

/**
 * `core.buildBundle` only returns bytes for NEW files; blobs reused from
 * `previous` are assumed already hosted. For a full offline zip we need every
 * blob, so we fetch the reused ones from the currently-joined source (they're
 * ciphertext already — copied byte for byte, no decrypt/re-encrypt). When
 * there's no previous manifest (first-ever publish) `reused` is empty and no
 * network access happens at all.
 */
export async function buildZipBundle(
  key: string,
  draft: Draft,
  previous: Manifest | null,
  source: string | null,
  fetchFn: typeof fetch = fetch,
): Promise<ZipResult> {
  const built = await core.buildBundle(key, draft, previous);
  const files = new Map(built.files);

  if (built.reused.length > 0) {
    if (!source) {
      throw new Error('Cannot include reused files in the zip: no source to fetch them from.');
    }
    for (const id of built.reused) {
      const res = await fetchFn(`${source}blobs/${id}`);
      if (!res.ok) {
        throw new Error(`Could not fetch reused blob ${id} from ${source}: ${res.status}`);
      }
      files.set(`blobs/${id}`, new Uint8Array(await res.arrayBuffer()));
    }
  }

  const zippable: Zippable = {};
  for (const [path, bytes] of files) zippable[path] = bytes;
  const bytes = zipSync(zippable, { level: 6 });
  return { manifest: built.manifest, bytes };
}
