import { afterEach, describe, expect, it } from 'vitest';
import { applyTheme, resolveThemeColor } from './theme';

function metaContents(): string[] {
  return Array.from(document.querySelectorAll('meta[name="theme-color"]')).map((el) =>
    el.getAttribute('content')
  ) as string[];
}

describe('applyTheme', () => {
  afterEach(() => {
    document.documentElement.removeAttribute('data-theme');
    document.head.querySelectorAll('meta[name="theme-color"]').forEach((el) => el.remove());
  });

  function addMeta() {
    const light = document.createElement('meta');
    light.setAttribute('name', 'theme-color');
    light.setAttribute('media', '(prefers-color-scheme: light)');
    light.setAttribute('content', '#ffffff');
    document.head.appendChild(light);

    const dark = document.createElement('meta');
    dark.setAttribute('name', 'theme-color');
    dark.setAttribute('media', '(prefers-color-scheme: dark)');
    dark.setAttribute('content', '#282a2b');
    document.head.appendChild(dark);
  }

  it('sets data-theme="dark" and updates meta theme-color for dark', () => {
    addMeta();
    applyTheme('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(metaContents()).toEqual(['#282a2b', '#282a2b']);
  });

  it('sets data-theme="light" and updates meta theme-color for light', () => {
    addMeta();
    applyTheme('light');
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(metaContents()).toEqual(['#ffffff', '#ffffff']);
  });

  it('sets data-theme="sepia" and its theme-color', () => {
    addMeta();
    applyTheme('sepia');
    expect(document.documentElement.dataset.theme).toBe('sepia');
    expect(metaContents()).toEqual(['#fffdf7', '#fffdf7']);
  });

  it('removes data-theme for "system"', () => {
    addMeta();
    document.documentElement.dataset.theme = 'dark';
    applyTheme('system');
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });

  it('resolveThemeColor never throws even without matchMedia', () => {
    expect(() => resolveThemeColor('system')).not.toThrow();
    expect(resolveThemeColor('light')).toBe('#ffffff');
    expect(resolveThemeColor('dark')).toBe('#282a2b');
  });
});
