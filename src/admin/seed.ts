// Turns a published Manifest (+ the local decrypted blobs behind it) back into
// an editable Draft, for the first time AdminPanel opens with no draft yet.
import * as core from '../core';
import type { Draft, DraftFile, DraftSong, Manifest } from '../core';
import { defaultDraft } from './db';

export async function seedDraftFromManifest(manifest: Manifest): Promise<Draft> {
  const songs: DraftSong[] = [];
  for (const song of manifest.songs) {
    const { content, ...meta } = song;
    const text = (await core.getBlobText(content)) ?? '';
    songs.push({ ...meta, text });
  }

  const files: DraftFile[] = [];
  for (const file of manifest.files) {
    const { content, ...meta } = file;
    const bytes = (await core.getBlobBytes(content)) ?? new Uint8Array();
    files.push({ ...meta, bytes, type: content.type });
  }

  const { logo, ...churchRest } = manifest.church;
  let draftLogo: { bytes: Uint8Array; type: string } | undefined;
  if (logo) {
    const bytes = (await core.getBlobBytes(logo)) ?? new Uint8Array();
    draftLogo = { bytes, type: logo.type };
  }

  return {
    church: draftLogo ? { ...churchRest, logo: draftLogo } : { ...churchRest },
    defaults: { ...manifest.defaults },
    songs,
    files,
    sets: manifest.sets.map((set) => ({ ...set, items: set.items.map((item) => ({ ...item })) })),
  };
}

/** No songbook joined yet (or nothing published): start from an empty draft. */
export function seedEmptyDraft(churchName = ''): Draft {
  return defaultDraft(churchName);
}
