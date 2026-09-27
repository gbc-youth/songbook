import type { ThemePref } from '../core';

const LIGHT = '#ffffff';
const SEPIA = '#fffdf7';
const DARK = '#282a2b';

/** Matches --bg in tokens.css for each theme. Kept here since we can't reach into CSS at boot. */
export function resolveThemeColor(theme: ThemePref): string {
  if (theme === 'dark') return DARK;
  if (theme === 'sepia') return SEPIA;
  if (theme === 'light') return LIGHT;
  let prefersDark = false;
  try {
    prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  } catch {
    // matchMedia unavailable (older WebViews, some test environments): fall back to light.
  }
  return prefersDark ? DARK : LIGHT;
}

/**
 * Applies a theme preference to the document: 'system' removes the override so
 * the prefers-color-scheme media query in tokens.css takes over; 'light'/'sepia'/'dark'
 * pin it via data-theme. Also updates every <meta name="theme-color"> so the
 * browser chrome (status bar / task switcher) matches immediately.
 */
export function applyTheme(theme: ThemePref): void {
  const root = document.documentElement;
  if (theme === 'system') {
    root.removeAttribute('data-theme');
  } else {
    root.dataset.theme = theme;
  }
  const color = resolveThemeColor(theme);
  document.querySelectorAll('meta[name="theme-color"]').forEach((el) => {
    el.setAttribute('content', color);
  });
}

/** Applies the viewer's font-scale setting as the --font-scale custom property. */
export function applyFontScale(scale: number): void {
  document.documentElement.style.setProperty('--font-scale', String(scale));
}
