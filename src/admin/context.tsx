import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import * as core from '../core';
import type { Draft, JoinInfo, Manifest } from '../core';
import { getState, initState, markPublished, saveDraft, saveTarget, type PublishTarget } from './db';
import { publishToGithub } from './publish/github';
import { buildZipBundle } from './publish/zip';
import { seedDraftFromManifest, seedEmptyDraft } from './seed';
import { triggerDownload } from './util';

export interface PublishOutcome {
  sourceUrl: string;
  joinInfo: JoinInfo;
  manifest: Manifest;
}

interface AdminContextValue {
  loading: boolean;
  loadError: string | null;
  draft: Draft;
  previous: Manifest | null;
  target: PublishTarget | null;
  dirty: boolean;
  joined: JoinInfo | null;
  publishing: boolean;
  publishError: string | null;
  lastPublish: PublishOutcome | null;
  updateDraft: (updater: (d: Draft) => Draft) => void;
  setTarget: (t: PublishTarget) => void;
  publish: () => Promise<PublishOutcome>;
  rotateKey: () => Promise<PublishOutcome>;
}

const AdminContext = createContext<AdminContextValue | null>(null);

function normalizedBase(url: string): string {
  return url.endsWith('/') ? url : `${url}/`;
}

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(() => seedEmptyDraft());
  const [previous, setPrevious] = useState<Manifest | null>(null);
  const [target, setTargetState] = useState<PublishTarget | null>(null);
  const [dirty, setDirty] = useState(false);
  const [joined, setJoined] = useState<JoinInfo | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [lastPublish, setLastPublish] = useState<PublishOutcome | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const info = await core.getJoined();
        if (cancelled) return;
        setJoined(info);

        const existing = await getState();
        if (existing) {
          if (cancelled) return;
          setDraft(existing.draft);
          setPrevious(existing.previous);
          setTargetState(existing.target);
          setDirty(existing.dirty);
          return;
        }

        const manifest = info ? await core.getManifest() : null;
        const seeded = manifest ? await seedDraftFromManifest(manifest) : seedEmptyDraft();
        await initState(seeded, manifest ?? null);
        if (cancelled) return;
        setDraft(seeded);
        setPrevious(manifest ?? null);
        setDirty(false);
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const updateDraft = useCallback((updater: (d: Draft) => Draft) => {
    setDraft((prev) => {
      const next = updater(prev);
      void saveDraft(next);
      return next;
    });
    setDirty(true);
  }, []);

  const setTarget = useCallback((t: PublishTarget) => {
    setTargetState(t);
    void saveTarget(t);
  }, []);

  const publish = useCallback(async (): Promise<PublishOutcome> => {
    if (!joined) throw new Error('No songbook is joined on this device yet.');
    if (!target) throw new Error('Choose and configure a publish target first.');
    setPublishing(true);
    setPublishError(null);
    try {
      let sourceUrl: string;
      let manifest: Manifest;
      if (target.kind === 'github') {
        const built = await core.buildBundle(joined.key, draft, previous);
        const result = await publishToGithub(target, built, built.manifest.version);
        sourceUrl = result.sourceUrl;
        manifest = built.manifest;
      } else {
        const zip = await buildZipBundle(joined.key, draft, previous, joined.source);
        triggerDownload(zip.bytes, `songbook-v${zip.manifest.version}.zip`, 'application/zip');
        sourceUrl = normalizedBase(target.baseUrl);
        manifest = zip.manifest;
      }
      await markPublished(manifest);
      setPrevious(manifest);
      setDirty(false);
      await core.sync();
      const outcome: PublishOutcome = { sourceUrl, joinInfo: { source: sourceUrl, key: joined.key }, manifest };
      setLastPublish(outcome);
      return outcome;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setPublishError(msg);
      throw e;
    } finally {
      setPublishing(false);
    }
  }, [joined, target, draft, previous]);

  const rotateKey = useCallback(async (): Promise<PublishOutcome> => {
    if (!target) throw new Error('Choose and configure a publish target first.');
    setPublishing(true);
    setPublishError(null);
    try {
      const newKey = core.generateKey();
      let sourceUrl: string;
      let manifest: Manifest;
      if (target.kind === 'github') {
        const built = await core.buildBundle(newKey, draft, null);
        const result = await publishToGithub(target, built, built.manifest.version);
        sourceUrl = result.sourceUrl;
        manifest = built.manifest;
      } else {
        const zip = await buildZipBundle(newKey, draft, null, null);
        triggerDownload(zip.bytes, `songbook-v${zip.manifest.version}.zip`, 'application/zip');
        sourceUrl = normalizedBase(target.baseUrl);
        manifest = zip.manifest;
      }
      const info: JoinInfo = { source: sourceUrl, key: newKey };
      // Rotating cuts off old links; this device must re-join under the new key
      // to keep reading its own songbook.
      await core.joinSongbook(info);
      await markPublished(manifest);
      setPrevious(manifest);
      setDirty(false);
      setJoined(info);
      const outcome: PublishOutcome = { sourceUrl, joinInfo: info, manifest };
      setLastPublish(outcome);
      return outcome;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setPublishError(msg);
      throw e;
    } finally {
      setPublishing(false);
    }
  }, [target, draft]);

  const value: AdminContextValue = {
    loading,
    loadError,
    draft,
    previous,
    target,
    dirty,
    joined,
    publishing,
    publishError,
    lastPublish,
    updateDraft,
    setTarget,
    publish,
    rotateKey,
  };

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdmin(): AdminContextValue {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin must be used within AdminProvider');
  return ctx;
}
