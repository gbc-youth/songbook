import type { JoinInfo } from './types';

/** Accepts a raw fragment ('#s=..&k=..' or 's=..&k=..') or a full URL containing one. Junk -> null. */
export function parseJoinFragment(hash: string): JoinInfo | null {
  const idx = hash.indexOf('#');
  const frag = idx >= 0 ? hash.slice(idx + 1) : hash;
  const params = new URLSearchParams(frag);
  const s = params.get('s');
  const k = params.get('k');
  if (!s || !k || !/^[A-Za-z0-9_-]{43}$/.test(k)) return null;
  // URLSearchParams has already percent-decoded the value.
  let url: URL;
  try {
    url = new URL(s);
  } catch {
    return null;
  }
  const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && local)) return null;
  const source = url.href.endsWith('/') ? url.href : url.href + '/';
  return { source, key: k };
}

export function buildJoinLink(appUrl: string, info: JoinInfo): string {
  return `${appUrl}#s=${encodeURIComponent(info.source)}&k=${info.key}`;
}
