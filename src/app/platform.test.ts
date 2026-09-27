import { describe, expect, it } from 'vitest';
import { installGateKind, isInAppBrowser, isIOSDevice, isStandaloneDisplay } from './platform';

const IPHONE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const IPAD_MACISH_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';
const ANDROID_UA =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
const DESKTOP_MAC_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';

describe('isIOSDevice', () => {
  it('detects iPhone UA', () => {
    expect(isIOSDevice(IPHONE_UA, 0)).toBe(true);
  });

  it('detects iPadOS reporting as Macintosh with touch points', () => {
    expect(isIOSDevice(IPAD_MACISH_UA, 5)).toBe(true);
  });

  it('does not treat a real Mac (no touch) as iOS', () => {
    expect(isIOSDevice(DESKTOP_MAC_UA, 0)).toBe(false);
  });

  it('does not treat Android as iOS', () => {
    expect(isIOSDevice(ANDROID_UA, 5)).toBe(false);
  });
});

describe('isStandaloneDisplay', () => {
  it('true when the display-mode media query matches', () => {
    expect(isStandaloneDisplay(true, undefined)).toBe(true);
  });

  it('true when navigator.standalone is true (older iOS)', () => {
    expect(isStandaloneDisplay(false, true)).toBe(true);
  });

  it('false when neither signal is set', () => {
    expect(isStandaloneDisplay(false, undefined)).toBe(false);
    expect(isStandaloneDisplay(false, false)).toBe(false);
  });
});

describe('isInAppBrowser', () => {
  it('detects Facebook in-app browser', () => {
    expect(isInAppBrowser(`${IPHONE_UA} [FBAN/FBIOS;FBAV/400.0]`)).toBe(true);
  });

  it('detects Instagram in-app browser', () => {
    expect(isInAppBrowser(`${IPHONE_UA} Instagram 300.0`)).toBe(true);
  });

  it('detects LINE in-app browser', () => {
    expect(isInAppBrowser(`${IPHONE_UA} Line/13.0`)).toBe(true);
  });

  it('detects the Google app (GSA)', () => {
    expect(isInAppBrowser(`${IPHONE_UA} GSA/300.0`)).toBe(true);
  });

  it('detects a generic Android WebView', () => {
    expect(isInAppBrowser(`${ANDROID_UA} wv)`)).toBe(true);
  });

  it('does not flag ordinary Safari or Chrome', () => {
    expect(isInAppBrowser(IPHONE_UA)).toBe(false);
    expect(isInAppBrowser(ANDROID_UA)).toBe(false);
  });
});

describe('installGateKind', () => {
  it('none on non-iOS regardless of other flags', () => {
    expect(
      installGateKind({ isIOS: false, isStandalone: false, isInApp: false, hasJoinFragment: true })
    ).toBe('none');
  });

  it('none once installed to the home screen', () => {
    expect(
      installGateKind({ isIOS: true, isStandalone: true, isInApp: false, hasJoinFragment: true })
    ).toBe('none');
  });

  it('in-app browser wins over a join fragment', () => {
    expect(
      installGateKind({ isIOS: true, isStandalone: false, isInApp: true, hasJoinFragment: true })
    ).toBe('in-app');
  });

  it('install-with-copy when a join fragment arrived on iOS/Safari, not installed', () => {
    expect(
      installGateKind({ isIOS: true, isStandalone: false, isInApp: false, hasJoinFragment: true })
    ).toBe('install-with-copy');
  });

  it('install-plain with no fragment on iOS/Safari, not installed', () => {
    expect(
      installGateKind({ isIOS: true, isStandalone: false, isInApp: false, hasJoinFragment: false })
    ).toBe('install-plain');
  });
});
