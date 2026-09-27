import { describe, expect, it, vi } from 'vitest';
import type { JoinInfo } from '../core';
import { planBoot } from './boot';

const IPHONE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const ANDROID_UA =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';

const FAKE_JOIN_INFO: JoinInfo = { source: 'https://example.com/church/', key: 'x'.repeat(43) };

describe('planBoot', () => {
  it('does NOT join on iOS outside standalone even when a fragment arrived', () => {
    const parse = vi.fn().mockReturnValue(FAKE_JOIN_INFO);
    const plan = planBoot(
      {
        hash: '#s=https%3A%2F%2Fexample.com%2Fchurch%2F&k=' + 'x'.repeat(43),
        ua: IPHONE_UA,
        maxTouchPoints: 5,
        standaloneMedia: false,
        navigatorStandalone: false,
      },
      parse
    );

    expect(plan.shouldJoin).toBe(false);
    expect(plan.gate).toBe('install-with-copy');
    // The fragment is still parsed (so the install screen can offer "Copy join link"),
    // it just must not be consumed as a join.
    expect(plan.joinInfo).toEqual(FAKE_JOIN_INFO);
  });

  it('does join on iOS when already standalone (installed)', () => {
    const parse = vi.fn().mockReturnValue(FAKE_JOIN_INFO);
    const plan = planBoot(
      {
        hash: '#s=..&k=..',
        ua: IPHONE_UA,
        maxTouchPoints: 5,
        standaloneMedia: true,
        navigatorStandalone: undefined,
      },
      parse
    );

    expect(plan.gate).toBe('none');
    expect(plan.shouldJoin).toBe(true);
  });

  it('does join on non-iOS platforms', () => {
    const parse = vi.fn().mockReturnValue(FAKE_JOIN_INFO);
    const plan = planBoot(
      {
        hash: '#s=..&k=..',
        ua: ANDROID_UA,
        maxTouchPoints: 5,
        standaloneMedia: false,
        navigatorStandalone: undefined,
      },
      parse
    );

    expect(plan.gate).toBe('none');
    expect(plan.shouldJoin).toBe(true);
  });

  it('does not attempt to join when there is no fragment at all', () => {
    const parse = vi.fn().mockReturnValue(null);
    const plan = planBoot(
      {
        hash: '',
        ua: ANDROID_UA,
        maxTouchPoints: 5,
        standaloneMedia: false,
        navigatorStandalone: undefined,
      },
      parse
    );

    expect(parse).not.toHaveBeenCalled();
    expect(plan.joinInfo).toBeNull();
    expect(plan.shouldJoin).toBe(false);
  });
});
