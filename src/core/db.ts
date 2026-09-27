import Dexie, { type Table } from 'dexie';

/** Small singleton rows: 'join' (JoinInfo), 'manifest' (Manifest), 'settings' (ViewerSettings), 'lastSync'. */
export interface KVRow {
  key: string;
  value: unknown;
}

/** Decrypted plaintext for a blob, keyed by BlobRef.id. */
export interface BlobRow {
  id: string;
  bytes: Uint8Array;
}

class SongbookDB extends Dexie {
  kv!: Table<KVRow, string>;
  blobs!: Table<BlobRow, string>;

  constructor() {
    super('songbook');
    this.version(1).stores({
      kv: 'key',
      blobs: 'id',
    });
  }
}

export const db = new SongbookDB();
