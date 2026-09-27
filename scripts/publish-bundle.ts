// Builds a church's encrypted bundle from a songs repository, as the next version
// of what is already published. Used by a church repo's CI; see
// docs/CHURCH-REPO.md.
//
//   SONGBOOK_KEY=… npx tsx scripts/publish-bundle.ts <church-repo> <out-dir> <published>
//
// <published> is the live bundle's URL, or better, a fresh checkout of where it is
// hosted: CDNs cache index.json for minutes, and building on a stale version
// would publish the same version number twice.
//
// <church-repo> holds church.json, songs/*.cho, and optionally files/*.pdf and
// sets/*.json. <out-dir> receives index.json and only the NEW blobs/; copy it over
// the hosted bundle (old blobs stay valid). Writes nothing if nothing changed.
import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { buildBundle, readBundle, type Draft, type DraftFile, type DraftSong } from '../src/core/bundle';
import { sha256Hex } from '../src/core/crypto';
import type { LicenseSource, Manifest, SetList, ViewerDefaults } from '../src/core/types';
import { songInfo } from '../src/song/songInfo';

interface ChurchFile {
  name: string;
  /** Path relative to the repo: .svg, .png or .jpg. */
  logo?: string;
  ccliLicense?: string;
  licenseExpires?: string;
  website?: string;
  defaults?: Partial<ViewerDefaults>;
}

/** A set file: sets/<anything>.json */
interface SetFile {
  title: string;
  date?: string;
  items: { song: string; key?: string; note?: string }[];
}

const MIME: Record<string, string> = {
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.pdf': 'application/pdf',
};

const slug = (file: string) =>
  path
    .basename(file, path.extname(file))
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');

const listDir = async (dir: string, ext: string[]) =>
  existsSync(dir) ? (await readdir(dir)).filter((f) => ext.includes(path.extname(f).toLowerCase())).sort() : [];

/** `{meta: license onelicense}` wins; otherwise inferred from the copyright line and CCLI number. */
function licenseOf(text: string, copyright?: string, ccli?: string): LicenseSource {
  const explicit = /\{\s*meta\s*:\s*license\s+([a-z-]+)\s*\}/i.exec(text)?.[1] as LicenseSource | undefined;
  if (explicit) return explicit;
  if (copyright && /public domain/i.test(copyright)) return 'public-domain';
  if (ccli) return 'ccli';
  return 'other';
}

/** The parts of a manifest that matter to a reader, for "did anything change?". */
function essence(m: Manifest): string {
  const blob = (r?: { sha256: string }) => r?.sha256;
  return JSON.stringify({
    church: { ...m.church, logo: blob(m.church.logo) },
    defaults: m.defaults,
    songs: m.songs.map((s) => ({ ...s, content: blob(s.content), updatedAt: undefined })),
    files: m.files.map((f) => ({ ...f, content: blob(f.content), updatedAt: undefined })),
    sets: m.sets,
  });
}

async function main() {
  const [repoArg, outArg, source] = process.argv.slice(2);
  const key = process.env.SONGBOOK_KEY?.trim();
  if (!repoArg || !outArg || !source || !key) {
    console.error('usage: SONGBOOK_KEY=… publish-bundle.ts <church-repo> <out-dir> <published-url-or-dir>');
    process.exit(2);
  }
  const repo = path.resolve(repoArg);
  const out = path.resolve(outArg);

  const fetchFn: typeof fetch = /^https?:/.test(source)
    ? fetch
    : async (url) => {
        const file = path.join(source, String(url).slice(base.length));
        return existsSync(file) ? new Response(await readFile(file)) : new Response(null, { status: 404 });
      };
  const base = /^https?:/.test(source) || source.endsWith('/') ? source : source + '/';

  // Only a missing index.json means "first publish". Anything else (wrong key, a
  // missing blob) must stop us: restarting at v1 would hide every update from members.
  const head = await fetchFn(`${base}index.json`, { cache: 'no-store' });
  const previous: Manifest | null = head.status === 404 ? null : (await readBundle(base, key, fetchFn)).manifest;
  const prevSongs = new Map(previous?.songs.map((s) => [s.id, s]));
  const prevFiles = new Map(previous?.files.map((f) => [f.id, f]));
  const now = new Date().toISOString();

  const church = JSON.parse(await readFile(path.join(repo, 'church.json'), 'utf8')) as ChurchFile;

  const songs: DraftSong[] = [];
  for (const file of await listDir(path.join(repo, 'songs'), ['.cho', '.chordpro'])) {
    const text = await readFile(path.join(repo, 'songs', file), 'utf8');
    const info = songInfo(text);
    const id = slug(file);
    const sha = await sha256Hex(new TextEncoder().encode(text));
    const prev = prevSongs.get(id);
    songs.push({
      id,
      title: info.title ?? id,
      firstLine: info.firstLine,
      key: info.key,
      tempo: info.tempo,
      time: info.time,
      authors: info.authors,
      copyright: info.copyright,
      ccliSong: info.ccli,
      license: licenseOf(text, info.copyright, info.ccli),
      updatedAt: prev?.content.sha256 === sha ? prev.updatedAt : now,
      text,
    });
  }

  const songIds = new Set(songs.map((s) => s.id));
  const files: DraftFile[] = [];
  for (const file of await listDir(path.join(repo, 'files'), ['.pdf'])) {
    const bytes = new Uint8Array(await readFile(path.join(repo, 'files', file)));
    const id = slug(file);
    const sha = await sha256Hex(bytes);
    const prev = prevFiles.get(id);
    // "amazing-grace--lead-sheet.pdf" attaches to the song "amazing-grace".
    const songId = id.includes('--') ? id.split('--')[0] : undefined;
    files.push({
      id,
      title: path.basename(file, path.extname(file)).replace(/^.*--/, '').replace(/[-_]+/g, ' '),
      songId: songId && songIds.has(songId) ? songId : undefined,
      bytes,
      type: 'application/pdf',
      updatedAt: prev?.content.sha256 === sha ? prev.updatedAt : now,
    });
  }

  const sets: SetList[] = [];
  for (const file of await listDir(path.join(repo, 'sets'), ['.json'])) {
    const set = JSON.parse(await readFile(path.join(repo, 'sets', file), 'utf8')) as SetFile;
    const missing = set.items.filter((i) => !songIds.has(i.song)).map((i) => i.song);
    if (missing.length) throw new Error(`sets/${file}: no song file for ${missing.join(', ')}`);
    sets.push({
      id: slug(file),
      title: set.title,
      date: set.date,
      items: set.items.map((i) => ({ songId: i.song, key: i.key, note: i.note })),
    });
  }

  let logo: Draft['church']['logo'];
  if (church.logo) {
    const type = MIME[path.extname(church.logo).toLowerCase()];
    if (!type?.startsWith('image/')) throw new Error(`church.json: logo must be .svg, .png or .jpg`);
    logo = { bytes: new Uint8Array(await readFile(path.join(repo, church.logo))), type };
  }

  const draft: Draft = {
    church: {
      name: church.name,
      ccliLicense: church.ccliLicense,
      licenseExpires: church.licenseExpires,
      website: church.website,
      logo,
    },
    defaults: { theme: 'system', chords: true, fontScale: 1, ...church.defaults },
    songs,
    files,
    sets,
  };

  const built = await buildBundle(key, draft, previous);
  if (previous && essence(built.manifest) === essence(previous)) {
    console.log(`No changes; v${previous.version} stays published.`);
    return;
  }

  await rm(out, { recursive: true, force: true });
  for (const [rel, bytes] of built.files) {
    await mkdir(path.dirname(path.join(out, rel)), { recursive: true });
    await writeFile(path.join(out, rel), bytes);
  }
  console.log(
    `v${built.index.version}: ${songs.length} songs, ${files.length} files, ${sets.length} sets; ` +
      `${built.files.size - 1} new blobs, ${built.reused.length} reused.`,
  );
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
