import { describe, expect, it, vi } from 'vitest';
import { githubSourceUrl, publishToGithub } from './github';
import type { GithubTarget } from '../db';
import type { BuiltBundle } from '../../core';

function jsonResponse(data: unknown): Response {
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    json: async () => data,
    text: async () => JSON.stringify(data),
  } as Response;
}

function makeFetchMock() {
  const calls: { url: string; method: string; body?: unknown }[] = [];
  let blobCount = 0;
  const fetchMock = vi.fn(async (input: string | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? 'GET';
    const body = init?.body ? JSON.parse(init.body as string) : undefined;
    calls.push({ url, method, body });

    if (url.endsWith('/git/refs/heads/main') && method === 'GET') {
      return jsonResponse({ object: { sha: 'base-commit-sha' } });
    }
    if (url.endsWith('/git/refs/heads/main') && method === 'PATCH') {
      return jsonResponse({});
    }
    if (url.endsWith('/git/commits/base-commit-sha')) {
      return jsonResponse({ tree: { sha: 'base-tree-sha' } });
    }
    if (url.endsWith('/git/blobs')) {
      blobCount += 1;
      return jsonResponse({ sha: `blob-sha-${blobCount}` });
    }
    if (url.endsWith('/git/trees')) {
      return jsonResponse({ sha: 'new-tree-sha' });
    }
    if (url.endsWith('/git/commits')) {
      return jsonResponse({ sha: 'new-commit-sha' });
    }
    throw new Error(`unexpected fetch ${method} ${url}`);
  });
  return { fetchMock: fetchMock as unknown as typeof fetch, calls };
}

const target: GithubTarget = {
  kind: 'github',
  owner: 'gbc-youth',
  repo: 'songbook',
  branch: 'main',
  path: 'songbook',
  token: 'fine-grained-token',
};

function makeBuilt(): BuiltBundle {
  const files = new Map<string, Uint8Array>();
  files.set('index.json', new Uint8Array([1, 2, 3]));
  files.set('blobs/newblob1', new Uint8Array([4, 5, 6]));
  files.set('blobs/newblob2', new Uint8Array([7, 8, 9]));
  return {
    index: { format: 1, version: 2, manifest: 'manifestblobid' },
    manifest: {
      format: 1,
      version: 2,
      publishedAt: new Date().toISOString(),
      church: { name: 'Test Church' },
      defaults: { theme: 'system', chords: true, fontScale: 1 },
      songs: [],
      files: [],
      sets: [],
    },
    files,
    reused: ['reusedblob1'],
  };
}

describe('publishToGithub', () => {
  it('builds the right sequence of Git Data API calls', async () => {
    const { fetchMock, calls } = makeFetchMock();
    const built = makeBuilt();

    const result = await publishToGithub(target, built, built.manifest.version, fetchMock);

    const kinds = calls.map((c) => `${c.method} ${c.url.replace(/^https:\/\/api\.github\.com/, '')}`);
    expect(kinds[0]).toBe('GET /repos/gbc-youth/songbook/git/refs/heads/main');
    expect(kinds[1]).toBe('GET /repos/gbc-youth/songbook/git/commits/base-commit-sha');
    // Two blob creations for the two new files, in some order, before the tree.
    const blobCalls = kinds.filter((k) => k.endsWith('/git/blobs'));
    expect(blobCalls).toHaveLength(3); // index.json + 2 new blobs
    const treeIndex = kinds.indexOf('POST /repos/gbc-youth/songbook/git/trees');
    const commitIndex = kinds.indexOf('POST /repos/gbc-youth/songbook/git/commits');
    const patchIndex = kinds.lastIndexOf('PATCH /repos/gbc-youth/songbook/git/refs/heads/main');
    expect(treeIndex).toBeGreaterThan(0);
    expect(commitIndex).toBeGreaterThan(treeIndex);
    expect(patchIndex).toBeGreaterThan(commitIndex);

    // Tree call uses base_tree and one entry per NEW file only (not the reused one).
    const treeBody = calls[treeIndex].body as { base_tree: string; tree: { path: string }[] };
    expect(treeBody.base_tree).toBe('base-tree-sha');
    expect(treeBody.tree).toHaveLength(3);
    expect(treeBody.tree.map((e) => e.path).sort()).toEqual(
      ['songbook/blobs/newblob1', 'songbook/blobs/newblob2', 'songbook/index.json'].sort(),
    );
    expect(treeBody.tree.some((e) => e.path.includes('reusedblob1'))).toBe(false);

    const commitBody = calls[commitIndex].body as { message: string; parents: string[] };
    expect(commitBody.message).toBe('Publish songbook v2');
    expect(commitBody.parents).toEqual(['base-commit-sha']);

    const patchBody = calls[patchIndex].body as { sha: string };
    expect(patchBody.sha).toBe('new-commit-sha');

    expect(result.commitSha).toBe('new-commit-sha');
    expect(result.sourceUrl).toBe(githubSourceUrl(target));
  });

  it('only uploads new files, never the reused ones', async () => {
    const { fetchMock, calls } = makeFetchMock();
    const built = makeBuilt();
    await publishToGithub(target, built, built.manifest.version, fetchMock);
    const blobBodies = calls.filter((c) => c.url.endsWith('/git/blobs')).map((c) => c.body as { content: string });
    expect(blobBodies).toHaveLength(built.files.size);
  });
});
