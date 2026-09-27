import type { JoinInfo } from '../core';
import { installGateKind, isInAppBrowser, isIOSDevice, isStandaloneDisplay, type InstallGateKind } from './platform';

export interface BootEnv {
  hash: string;
  ua: string;
  maxTouchPoints: number;
  standaloneMedia: boolean;
  navigatorStandalone?: boolean;
}

export interface BootPlan {
  gate: InstallGateKind;
  /** Parsed from the URL fragment, if any was present (regardless of gating). */
  joinInfo: JoinInfo | null;
  /** True only when the app should actually join: not gated, and a fragment arrived. */
  shouldJoin: boolean;
}

/**
 * Pure decision function for what boot.ts / App.tsx should do with the fragment
 * and platform state. Kept free of React/DOM/core-fetching so it's cheap to test:
 * on iOS outside standalone mode, a join fragment must NOT be consumed — it is
 * only there so the install screen can offer "Copy join link".
 */
export function planBoot(env: BootEnv, parseJoinFragment: (hash: string) => JoinInfo | null): BootPlan {
  const iOS = isIOSDevice(env.ua, env.maxTouchPoints);
  const standalone = isStandaloneDisplay(env.standaloneMedia, env.navigatorStandalone);
  const inApp = isInAppBrowser(env.ua);
  const joinInfo = env.hash ? parseJoinFragment(env.hash) : null;
  const gate = installGateKind({ isIOS: iOS, isStandalone: standalone, isInApp: inApp, hasJoinFragment: !!joinInfo });
  return { gate, joinInfo, shouldJoin: gate === 'none' && !!joinInfo };
}
