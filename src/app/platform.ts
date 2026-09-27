// Pure platform-detection helpers. No DOM access here so they stay trivially
// testable; App.tsx supplies the live navigator/window values.

/** iPhone/iPad/iPod UA, or iPadOS 13+ which reports as 'Macintosh' but has touch. */
export function isIOSDevice(ua: string, maxTouchPoints: number): boolean {
  return /iPhone|iPad|iPod/.test(ua) || (ua.includes('Macintosh') && maxTouchPoints > 1);
}

/** display-mode: standalone (installed PWA) or the iOS Safari-specific navigator.standalone. */
export function isStandaloneDisplay(standaloneMedia: boolean, navigatorStandalone?: boolean): boolean {
  return standaloneMedia || navigatorStandalone === true;
}

/** Facebook/Instagram/LINE/Google app/generic Android WebView in-app browsers. */
export function isInAppBrowser(ua: string): boolean {
  return /FBAN|FBAV|Instagram|Line\//.test(ua) || ua.includes('GSA/') || ua.includes(' wv)');
}

export type InstallGateKind = 'none' | 'in-app' | 'install-with-copy' | 'install-plain';

/**
 * The install gate only ever applies on iOS outside standalone mode (Safari and
 * the home-screen app have separate storage, so joining from Safari is a dead end).
 * Order matters: an in-app browser can't even use the clipboard/install flow
 * reliably, so it wins over the "copy join link" variant.
 */
export function installGateKind(opts: {
  isIOS: boolean;
  isStandalone: boolean;
  isInApp: boolean;
  hasJoinFragment: boolean;
}): InstallGateKind {
  if (!opts.isIOS || opts.isStandalone) return 'none';
  if (opts.isInApp) return 'in-app';
  if (opts.hasJoinFragment) return 'install-with-copy';
  return 'install-plain';
}
