#!/usr/bin/env bash
# Rebuild vendor/chordsheetjs/index.js: ChordSheetJS built from source with only
# the modules in scripts/chordsheetjs-entry.ts, and the chord-diagram fingerings
# (chord_definition/defaults.json) stubbed out. About 137 KB instead of 282 KB.
#
# Usage: scripts/build-chordsheetjs.sh [tag]   (default: the version in package.json)
set -euo pipefail
root=$(cd "$(dirname "$0")/.." && pwd)
tag=${1:-v$(node -p "require('$root/node_modules/chordsheetjs/package.json').version")}
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

git clone -q --depth 1 --branch "$tag" https://github.com/martijnversluis/ChordSheetJS.git "$work/csjs"
cd "$work/csjs"
npm i --no-audit --no-fund --ignore-scripts --legacy-peer-deps >/dev/null
# Generates the PEG parsers. The symbol-font step needs yarn and only matters for
# PDF output; its failure stops each run, so run until the parsers exist.
for _ in 1 2 3 4; do
  [ -f src/parser/chord_pro/peg_parser.ts ] && [ -f src/parser/chord/peg_parser.ts ] && break
  npx unibuild --release >/dev/null 2>&1 || true
done
test -f src/parser/chord_pro/peg_parser.ts || { echo "parser generation failed" >&2; exit 1; }

cp "$root/scripts/chordsheetjs-entry.ts" entry.ts
cat > build.mjs <<'JS'
import { build } from 'esbuild';
await build({
  entryPoints: ['entry.ts'], bundle: true, minify: true, format: 'esm',
  outfile: process.argv[2], legalComments: 'inline', logLevel: 'error',
  plugins: [{ name: 'no-chord-diagrams', setup(b) {
    b.onLoad({ filter: /chord_definition\/defaults\.json$/ }, () => ({ contents: '{}', loader: 'json' }));
  } }],
});
JS
node build.mjs "$root/vendor/chordsheetjs/index.js"
cp LICENSE "$root/vendor/chordsheetjs/LICENSE"
echo "$tag $(git rev-parse HEAD)" > "$root/vendor/chordsheetjs/VERSION"
wc -c "$root/vendor/chordsheetjs/index.js"
