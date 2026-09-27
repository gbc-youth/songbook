// Builds the public-domain demo songbook served from public/demo/.
// Run with: npx tsx scripts/build-demo.ts [songsDir] [outDir]
import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildBundle, type Draft, type DraftSong } from '../src/core/bundle';
import { generateKey } from '../src/core/crypto';
import { buildJoinLink } from '../src/core/link';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const APP_URL = 'https://gbc-youth.github.io/songbook/';
const DEMO_SOURCE = 'https://gbc-youth.github.io/songbook/demo/';

function slug(filename: string): string {
  return path
    .basename(filename, path.extname(filename))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

interface ParsedSong {
  title?: string;
  key?: string;
  authors?: string;
  copyright?: string;
  ccliSong?: string;
  tempo?: number;
  time?: string;
  firstLine?: string;
}

// Small local ChordPro directive parser (deliberately does not import src/song).
const DIRECTIVE_RE = /^\{\s*([a-z_]+)\s*:\s*(.*?)\s*\}$/i;

function parseChordPro(text: string): ParsedSong {
  const lines = text.split(/\r?\n/);
  const result: ParsedSong = {};
  let composer: string | undefined;
  let lyricist: string | undefined;
  let artist: string | undefined;

  for (const raw of lines) {
    const m = DIRECTIVE_RE.exec(raw.trim());
    if (!m) continue;
    const name = m[1].toLowerCase();
    const value = m[2].trim();
    switch (name) {
      case 'title':
      case 't':
        result.title = value;
        break;
      case 'key':
        result.key = value;
        break;
      case 'artist':
        artist = value;
        break;
      case 'composer':
        composer = value;
        break;
      case 'lyricist':
        lyricist = value;
        break;
      case 'copyright':
        result.copyright = value;
        break;
      case 'tempo':
        result.tempo = Number(value) || undefined;
        break;
      case 'time':
        result.time = value;
        break;
      case 'meta': {
        const ccli = value.match(/^ccli\s+(\S+)/i);
        if (ccli) result.ccliSong = ccli[1];
        break;
      }
    }
  }

  if (lyricist || composer) {
    result.authors = [lyricist && `Words: ${lyricist}`, composer && `Music: ${composer}`].filter(Boolean).join(' ');
  } else if (artist) {
    result.authors = artist;
  }

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('{') || line.startsWith('#')) continue;
    const stripped = line.replace(/\[[^\]]*\]/g, '').trim();
    if (stripped) {
      result.firstLine = stripped;
      break;
    }
  }

  return result;
}

async function clearDir(dir: string): Promise<void> {
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
}

async function main(): Promise<void> {
  const [, , songsDirArg, outDirArg] = process.argv;
  const songsDir = path.resolve(projectRoot, songsDirArg ?? 'demo/songs');
  const outDir = path.resolve(projectRoot, outDirArg ?? 'public/demo');
  const churchPath = path.join(path.dirname(songsDir), 'church.json');
  const keyPath = path.join(projectRoot, 'demo', 'key.txt');

  let key: string;
  if (existsSync(keyPath)) {
    key = (await readFile(keyPath, 'utf8')).trim();
  } else {
    key = generateKey();
    await mkdir(path.dirname(keyPath), { recursive: true });
    await writeFile(keyPath, `${key}\n`, 'utf8');
  }

  const church = JSON.parse(await readFile(churchPath, 'utf8')) as {
    name: string;
    ccliLicense?: string;
    website?: string;
  };

  const songFiles = (await readdir(songsDir)).filter((f) => f.endsWith('.cho')).sort();
  const now = new Date().toISOString();

  const songs: DraftSong[] = [];
  for (const file of songFiles) {
    const text = await readFile(path.join(songsDir, file), 'utf8');
    const parsed = parseChordPro(text);
    const id = slug(file);
    songs.push({
      id,
      title: parsed.title ?? id,
      firstLine: parsed.firstLine,
      key: parsed.key,
      tempo: parsed.tempo,
      time: parsed.time,
      authors: parsed.authors,
      copyright: parsed.copyright,
      license: 'public-domain',
      ccliSong: parsed.ccliSong,
      updatedAt: now,
      text,
    });
  }

  const draft: Draft = {
    church: { name: church.name, ccliLicense: church.ccliLicense, website: church.website },
    defaults: { theme: 'system', chords: true, fontScale: 1 },
    songs,
    files: [],
    sets: [],
  };

  // Demo always builds fresh — no previous manifest to diff against.
  const built = await buildBundle(key, draft, null);

  await clearDir(outDir);
  for (const [relPath, bytes] of built.files) {
    const dest = path.join(outDir, relPath);
    await mkdir(path.dirname(dest), { recursive: true });
    await writeFile(dest, bytes);
  }

  console.log(`Wrote ${songs.length} song(s), version ${built.manifest.version}, to ${outDir}`);
  console.log('Demo join link:');
  console.log(buildJoinLink(APP_URL, { source: DEMO_SOURCE, key }));
}

main().catch((err: unknown) => {
  console.error(err);
  process.exitCode = 1;
});
