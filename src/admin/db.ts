// Admin's own local state: the working Draft, the last-published Manifest, the
// publish target config and a dirty flag. Separate IndexedDB from core's
// 'songbook' db — this is the admin's workbench, not the viewer's copy.
import Dexie, { type Table } from 'dexie';
import type { Draft, Manifest } from '../core';

/** A fine-grained GitHub PAT (Contents: read & write on one repo), stored locally only. */
export interface GithubTarget {
  kind: 'github';
  owner: string;
  repo: string;
  branch: string;
  /** Directory within the repo the bundle lives under, e.g. 'songbook'. No leading/trailing slash. */
  path: string;
  token: string;
}

/** A .zip download for any static host; the admin hosts it and tells us the base URL. */
export interface ZipTarget {
  kind: 'zip';
  /** Public base URL where the extracted zip contents will be hosted, ending with '/'. */
  baseUrl: string;
}

export type PublishTarget = GithubTarget | ZipTarget;

export function defaultDraft(churchName = ''): Draft {
  return {
    church: { name: churchName },
    defaults: { theme: 'system', chords: true, fontScale: 1 },
    songs: [],
    files: [],
    sets: [],
  };
}

export function defaultGithubTarget(): GithubTarget {
  return { kind: 'github', owner: '', repo: '', branch: 'main', path: 'songbook', token: '' };
}

export function defaultZipTarget(): ZipTarget {
  return { kind: 'zip', baseUrl: '' };
}

interface StateRow {
  id: 'singleton';
  draft: Draft;
  previous: Manifest | null;
  target: PublishTarget | null;
  dirty: boolean;
}

class AdminDb extends Dexie {
  state!: Table<StateRow, string>;

  constructor() {
    super('songbook-admin');
    this.version(1).stores({
      state: 'id',
    });
  }
}

export const db = new AdminDb();

async function getRow(): Promise<StateRow | undefined> {
  return db.state.get('singleton');
}

export interface AdminState {
  draft: Draft;
  previous: Manifest | null;
  target: PublishTarget | null;
  dirty: boolean;
}

export async function getState(): Promise<AdminState | null> {
  const row = await getRow();
  if (!row) return null;
  const { id: _id, ...rest } = row;
  return rest;
}

export async function initState(draft: Draft, previous: Manifest | null): Promise<void> {
  await db.state.put({ id: 'singleton', draft, previous, target: null, dirty: false });
}

/** Persists an edited draft and marks the songbook dirty (unpublished changes). */
export async function saveDraft(draft: Draft): Promise<void> {
  const row = await getRow();
  await db.state.put({
    id: 'singleton',
    draft,
    previous: row?.previous ?? null,
    target: row?.target ?? null,
    dirty: true,
  });
}

export async function saveTarget(target: PublishTarget): Promise<void> {
  const row = await getRow();
  if (!row) throw new Error('admin state not initialized');
  await db.state.put({ ...row, target });
}

/** After a successful publish: the new manifest becomes `previous` and the dirty flag clears. */
export async function markPublished(manifest: Manifest): Promise<void> {
  const row = await getRow();
  if (!row) throw new Error('admin state not initialized');
  await db.state.put({ ...row, previous: manifest, dirty: false });
}

export async function clearAll(): Promise<void> {
  await db.state.clear();
}
