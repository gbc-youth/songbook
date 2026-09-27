import { lazy, Suspense, useEffect, useState } from 'react';
import type { JoinInfo, Manifest, SongMeta, ThemePref, ViewerDefaults, ViewerSettings } from '../core';
import {
  effectiveSettings,
  getBlobBytes,
  getBlobText,
  getJoined,
  getLastSync,
  getManifest,
  getSettings,
  isLicenseExpired,
  joinSongbook,
  leaveSongbook,
  parseJoinFragment,
  saveSettings,
  sync as coreSync,
  visibleSongs as coreVisibleSongs,
} from '../core';
import { semitonesBetween } from '../song';
import { planBoot } from './boot';
import type { InstallGateKind } from './platform';
import { applyFontScale, applyTheme } from './theme';
import { pushScreen, readScreen, replaceScreen, type Screen, type SongContext } from './router';
import { InstallGate } from './InstallGate';
import { Welcome } from './Welcome';
import { Library } from './Library';
import { SetView } from './SetView';
import { SongView } from './SongView';
import { FileView } from './FileView';
import { SettingsScreen } from './SettingsScreen';

// Most viewers never manage a songbook; keep the admin screens out of the main bundle.
const AdminPanel = lazy(() => import('../admin').then((m) => ({ default: m.AdminPanel })));
const CreateSongbook = lazy(() => import('../admin').then((m) => ({ default: m.CreateSongbook })));

const STALE_SYNC_MS = 10 * 60 * 1000;

function formatRelativeTime(atIso: string): string {
  const diffMin = Math.round((Date.now() - new Date(atIso).getTime()) / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin === 1) return '1 min ago';
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr === 1) return '1 hour ago';
  if (diffHr < 24) return `${diffHr} hours ago`;
  const diffDay = Math.round(diffHr / 24);
  return diffDay === 1 ? '1 day ago' : `${diffDay} days ago`;
}

export function App() {
  const [booting, setBooting] = useState(true);
  const [gate, setGate] = useState<InstallGateKind>('none');
  const [gateJoinLink, setGateJoinLink] = useState<string | undefined>();
  const [bootError, setBootError] = useState<string | null>(null);

  const [joined, setJoined] = useState<JoinInfo | null>(null);
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [settings, setSettings] = useState<ViewerSettings>({});
  const [screen, setScreen] = useState<Screen>({ name: 'welcome' });

  const [churchLogoUrl, setChurchLogoUrl] = useState<string | null>(null);
  const [songText, setSongText] = useState<string | null>(null);
  const [transposeBySong, setTransposeBySong] = useState<Record<string, number>>({});

  const [lastSync, setLastSync] = useState<{ at: string; version?: number; offline?: boolean; error?: string } | null>(
    null
  );
  const [updateNote, setUpdateNote] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const effective: ViewerDefaults = effectiveSettings(manifest, settings);

  useEffect(() => {
    applyTheme(effective.theme);
  }, [effective.theme]);

  useEffect(() => {
    applyFontScale(effective.fontScale);
  }, [effective.fontScale]);

  function navigate(next: Screen) {
    pushScreen(next);
    setScreen(next);
  }

  function switchScreen(next: Screen) {
    replaceScreen(next);
    setScreen(next);
  }

  async function runJoin(info: JoinInfo, onProgress?: (done: number, total: number) => void) {
    await joinSongbook(info, onProgress);
    const m = await getManifest();
    const s = await getSettings();
    setJoined(info);
    setManifest(m);
    setSettings(s);
    const last = await getLastSync();
    if (last) setLastSync({ at: last.at, version: last.result.version });
    switchScreen({ name: 'library', tab: 'songs' });
  }

  async function backgroundSync() {
    setSyncing(true);
    try {
      const result = await coreSync();
      if (result.status === 'offline') {
        setLastSync((prev) => ({ at: prev?.at ?? new Date().toISOString(), offline: true }));
      } else if (result.status === 'error') {
        setLastSync({ at: new Date().toISOString(), error: result.error });
      } else {
        setLastSync({ at: new Date().toISOString(), version: result.version });
        if (result.status === 'updated') {
          const m = await getManifest();
          setManifest(m);
          setUpdateNote(`Updated to v${result.version}`);
          setTimeout(() => setUpdateNote(null), 6000);
        }
      }
    } finally {
      setSyncing(false);
    }
  }

  // Boot: consume the join fragment (if any), decide whether the install gate
  // applies, then load whatever is already cached so it shows instantly.
  useEffect(() => {
    (async () => {
      const hash = location.hash;
      const originalHref = location.href;
      const nav = navigator as Navigator & { standalone?: boolean };
      const plan = planBoot(
        {
          hash,
          ua: navigator.userAgent,
          maxTouchPoints: navigator.maxTouchPoints ?? 0,
          standaloneMedia: window.matchMedia?.('(display-mode: standalone)').matches ?? false,
          navigatorStandalone: nav.standalone,
        },
        parseJoinFragment
      );

      if (hash) {
        history.replaceState(history.state, '', location.pathname + location.search);
      }

      if (plan.gate !== 'none') {
        setGate(plan.gate);
        if (plan.gate === 'install-with-copy') setGateJoinLink(originalHref);
        switchScreen({ name: 'install-gate' });
        setBooting(false);
        return;
      }

      const info = await getJoined();
      const m = info ? await getManifest() : null;
      const s = await getSettings();
      setJoined(info);
      setManifest(m);
      setSettings(s);
      const last = await getLastSync();
      if (last) setLastSync({ at: last.at, version: last.result.version });

      switchScreen(info ? { name: 'library', tab: 'songs' } : { name: 'welcome' });
      setBooting(false);

      if (plan.shouldJoin && plan.joinInfo && !info) {
        try {
          await runJoin(plan.joinInfo);
        } catch (e) {
          setBootError(e instanceof Error ? e.message : 'Could not join this songbook.');
        }
      } else if (info) {
        void backgroundSync();
      }
    })();
    // Boot runs exactly once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Browser/Android back button: read the screen we stashed in history.state.
  useEffect(() => {
    function onPopState(e: PopStateEvent) {
      const s = readScreen(e.state);
      setScreen(s ?? (joined ? { name: 'library', tab: 'songs' } : { name: 'welcome' }));
    }
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [joined]);

  // Re-sync when the tab/app comes back to the foreground after a while.
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState !== 'visible' || !joined) return;
      const staleFor = lastSync ? Date.now() - new Date(lastSync.at).getTime() : Infinity;
      if (staleFor > STALE_SYNC_MS) void backgroundSync();
    }
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joined, lastSync]);

  // Church logo -> object URL.
  useEffect(() => {
    const logo = manifest?.church.logo;
    if (!logo) {
      setChurchLogoUrl(null);
      return;
    }
    let objectUrl: string | null = null;
    let cancelled = false;
    (async () => {
      const bytes = await getBlobBytes(logo);
      if (cancelled || !bytes) return;
      objectUrl = URL.createObjectURL(new Blob([Uint8Array.from(bytes)], { type: logo.type || 'image/png' }));
      setChurchLogoUrl(objectUrl);
    })();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manifest?.church.logo?.id]);

  // Current song's ChordPro source.
  useEffect(() => {
    if (screen.name !== 'song') {
      setSongText(null);
      return;
    }
    const song = manifest?.songs.find((s) => s.id === screen.songId);
    if (!song) {
      setSongText(null);
      return;
    }
    let cancelled = false;
    setSongText(null);
    getBlobText(song.content).then((t) => {
      if (!cancelled) setSongText(t);
    });
    return () => {
      cancelled = true;
    };
  }, [screen, manifest]);

  // All song texts, for lyric search. Blobs are local after sync, so this is cheap.
  const [songTexts, setSongTexts] = useState<Map<string, string>>(new Map());
  useEffect(() => {
    if (!manifest) return;
    let cancelled = false;
    Promise.all(manifest.songs.map(async (s) => [s.id, (await getBlobText(s.content)) ?? ''] as const)).then(
      (entries) => {
        if (!cancelled) setSongTexts(new Map(entries));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [manifest]);

  function openSong(songId: string, context?: SongContext) {
    if (context) {
      const set = manifest?.sets.find((s) => s.id === context.setId);
      const item = set?.items[context.index];
      const song = manifest?.songs.find((s) => s.id === songId);
      setTransposeBySong((prev) => {
        if (songId in prev) return prev;
        if (song?.key && item?.key) return { ...prev, [songId]: semitonesBetween(song.key, item.key) };
        return { ...prev, [songId]: 0 };
      });
    } else {
      setTransposeBySong((prev) => (songId in prev ? prev : { ...prev, [songId]: 0 }));
    }
    navigate({ name: 'song', songId, context });
  }

  function updateSettings(patch: Partial<ViewerSettings>) {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      void saveSettings(next);
      return next;
    });
  }

  function changeFontScale(delta: number) {
    const next = Math.round(Math.min(2, Math.max(0.7, effective.fontScale + delta)) * 100) / 100;
    updateSettings({ fontScale: next });
  }

  async function handleLeave() {
    await leaveSongbook();
    setJoined(null);
    setManifest(null);
    setSettings({});
    setTransposeBySong({});
    switchScreen({ name: 'welcome' });
  }

  function syncStatusText(): string {
    if (!lastSync) return manifest ? `v${manifest.version}` : '';
    if (lastSync.offline) return "Offline — showing what's saved";
    if (lastSync.error) return lastSync.error;
    const v = lastSync.version ?? manifest?.version;
    return `Up to date · v${v ?? '?'} · checked ${formatRelativeTime(lastSync.at)}`;
  }

  if (booting) {
    return <div className="sb-app-boot" aria-hidden="true" />;
  }

  if (screen.name === 'install-gate') {
    return <InstallGate kind={gate as Exclude<InstallGateKind, 'none'>} joinLink={gateJoinLink} />;
  }

  if (screen.name === 'create-songbook') {
    return (
      <Suspense fallback={null}>
        <CreateSongbook
          onCreated={(info) => {
            void runJoin(info);
          }}
          onCancel={() => history.back()}
        />
      </Suspense>
    );
  }

  if (!joined || !manifest) {
    return (
      <Welcome
        join={runJoin}
        onCreateSongbook={() => navigate({ name: 'create-songbook' })}
        initialError={bootError ?? undefined}
      />
    );
  }

  if (screen.name === 'admin') {
    return (
      <Suspense fallback={null}>
        <AdminPanel onClose={() => history.back()} />
      </Suspense>
    );
  }

  const visSongs = coreVisibleSongs(manifest);
  const licenseExpired = isLicenseExpired(manifest);

  switch (screen.name) {
    case 'set': {
      const set = manifest.sets.find((s) => s.id === screen.setId);
      const songsById = new Map<string, SongMeta>(manifest.songs.map((s) => [s.id, s]));
      if (!set) {
        switchScreen({ name: 'library', tab: 'sets' });
        return null;
      }
      return (
        <SetView
          set={set}
          songs={songsById}
          onBack={() => history.back()}
          onOpenSong={(songId, context) => openSong(songId, context)}
        />
      );
    }
    case 'song': {
      const song = manifest.songs.find((s) => s.id === screen.songId);
      if (!song) {
        switchScreen({ name: 'library', tab: 'songs' });
        return null;
      }
      const context = screen.context;
      const set = context ? manifest.sets.find((s) => s.id === context.setId) : undefined;
      return (
        <SongView
          song={song}
          text={songText}
          church={manifest.church}
          context={screen.context}
          set={set}
          chordsDefault={effective.chords}
          fontScale={effective.fontScale}
          transpose={transposeBySong[song.id] ?? 0}
          onChangeTranspose={(s) => setTransposeBySong((prev) => ({ ...prev, [song.id]: s }))}
          onChangeFontScale={changeFontScale}
          onBack={() => history.back()}
          onNavigateSetSong={(songId, context) => openSong(songId, context)}
        />
      );
    }
    case 'file': {
      const file = manifest.files.find((f) => f.id === screen.fileId);
      if (!file) {
        switchScreen({ name: 'library', tab: 'files' });
        return null;
      }
      return <FileView file={file} onBack={() => history.back()} />;
    }
    case 'settings':
      return (
        <SettingsScreen
          church={manifest.church}
          version={manifest.version}
          publishedAt={manifest.publishedAt}
          effective={effective}
          onThemeChange={(theme: ThemePref) => updateSettings({ theme })}
          onChordsDefaultChange={(chords: boolean) => updateSettings({ chords })}
          onFontScaleChange={changeFontScale}
          syncStatusText={syncStatusText()}
          syncing={syncing}
          onCheckUpdates={() => void backgroundSync()}
          onManageSongbook={() => navigate({ name: 'admin' })}
          onLeaveSongbook={() => void handleLeave()}
          onBack={() => history.back()}
        />
      );
    case 'library':
    default:
      return (
        <Library
          churchName={manifest.church.name}
          churchLogoUrl={churchLogoUrl}
          tab={screen.name === 'library' ? screen.tab : 'songs'}
          onChangeTab={(tab) => switchScreen({ name: 'library', tab })}
          songs={visSongs}
          songTexts={songTexts}
          sets={manifest.sets}
          files={manifest.files}
          licenseExpired={licenseExpired}
          licenseExpiresAt={manifest.church.licenseExpires}
          updateNote={updateNote}
          onOpenSong={(songId) => openSong(songId)}
          onOpenSet={(setId) => navigate({ name: 'set', setId })}
          onOpenFile={(fileId) => navigate({ name: 'file', fileId })}
          onOpenSettings={() => navigate({ name: 'settings' })}
        />
      );
  }
}
