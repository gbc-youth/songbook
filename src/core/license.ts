import { LICENSED_SOURCES, type Manifest, type SongMeta, type ViewerDefaults, type ViewerSettings } from './types';

const BUILTIN_DEFAULTS: ViewerDefaults = { theme: 'system', chords: true, fontScale: 1 };

/** `licenseExpires` is a yyyy-mm-dd date; the church's license is valid through the end of that day. */
export function isLicenseExpired(m: Manifest, now: Date = new Date()): boolean {
  const exp = m.church.licenseExpires;
  if (!exp) return false;
  const end = new Date(`${exp}T23:59:59.999Z`).getTime();
  return now.getTime() > end;
}

/** Hides LICENSED_SOURCES songs once the church's license has expired. */
export function visibleSongs(m: Manifest, now: Date = new Date()): SongMeta[] {
  if (!isLicenseExpired(m, now)) return m.songs;
  return m.songs.filter((s) => !LICENSED_SOURCES.includes(s.license));
}

export function effectiveSettings(m: Manifest | null, s: ViewerSettings): ViewerDefaults {
  return { ...(m?.defaults ?? BUILTIN_DEFAULTS), ...s };
}
