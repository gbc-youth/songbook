# A church's songs repository

Licensed songs never go in this public repo. A church keeps them in two of its own:

| repo | visibility | holds |
|---|---|---|
| `<church>-songs` | **private** | the song sources: `church.json`, `logo.svg`, `songs/*.cho`, `files/*.pdf`, `sets/*.json`, and the porting rulebook |
| `<church>-bundle` | public | only the encrypted bundle: `index.json` and `blobs/` |

The public repo is readable by anyone and useless without the join link, whose
fragment carries the key. The app downloads it from
`https://raw.githubusercontent.com/<org>/<church>-bundle/main/`.

## How a change reaches the team

Push to the private repo's `main`. Its workflow:

1. checks out this repo (the tooling) and the bundle repo;
2. runs `check-songs` over `songs/`;
3. runs `scripts/publish-bundle.ts` with the key from the `SONGBOOK_KEY` secret,
   reading the previous version from the bundle checkout (not the CDN, which
   caches for minutes); if nothing changed, it stops here;
4. commits the new `index.json` and blobs to the bundle repo with a deploy key
   (`BUNDLE_DEPLOY_KEY` secret) and pushes.

Members get it on their next launch, within about five minutes of the push
(raw.githubusercontent.com's cache).

## Layout of the private repo

```
church.json     {"name": "…", "logo": "logo.svg", "ccliLicense": "…", "licenseExpires": "yyyy-mm-dd", "website": "…"}
logo.svg        one-colour mark; the app draws it in the theme's text colour
songs/*.cho     one ChordPro file per song; the filename is the song's id
files/*.pdf     attachments; "<song-id>--Lead sheet.pdf" attaches to that song
sets/*.json     {"title": "Sunday", "date": "2026-09-27", "items": [{"song": "<song-id>", "key": "D"}]}
CLAUDE.md       porting rulebook (see PORTING-WITH-CLAUDE.md)
inbox/          sources waiting to be ported
```

A song's license comes from its `{copyright}` and `{meta: ccli N}`, or explicitly
from `{meta: license onelicense}`.

## Keys

- **`SONGBOOK_KEY`**: 32 random bytes, base64url. Only in the private repo's
  secrets and in the join link. Changing it cuts off every old link; run the
  workflow afterwards to re-encrypt everything, and share the new link.
- **`BUNDLE_DEPLOY_KEY`**: an SSH key with write access to the bundle repo only.

Songs edited through the app's own admin screens are not written back to the
private repo. With a repo like this, the repo is the source of truth; use the
app only to read.
