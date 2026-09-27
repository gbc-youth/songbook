// Publishes a bundle as one commit via the GitHub Git Data API.
// api.github.com works cross-origin with a token; nothing else is needed.
import type { BuiltBundle } from '../../core';
import type { GithubTarget } from '../db';

const API = 'https://api.github.com';

function base64FromBytes(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    const slice = bytes.subarray(i, i + chunk);
    binary += String.fromCharCode(...slice);
  }
  return btoa(binary);
}

async function gh(
  token: string,
  path: string,
  init: RequestInit | undefined,
  fetchFn: typeof fetch,
): Promise<any> {
  const res = await fetchFn(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`GitHub ${path} failed: ${res.status} ${res.statusText} ${body}`.trim());
  }
  return res.json();
}

function normalizedPath(path: string): string {
  return path.replace(/^\/+|\/+$/g, '');
}

export function githubSourceUrl(target: GithubTarget): string {
  const base = normalizedPath(target.path);
  return `https://raw.githubusercontent.com/${target.owner}/${target.repo}/${target.branch}/${base}/`;
}

export interface GithubPublishResult {
  sourceUrl: string;
  commitSha: string;
}

/**
 * One commit: get ref -> base tree -> create a blob for each NEW file in
 * `built.files` -> create a tree on top of the base tree -> commit -> update
 * the branch ref. Old blobs are never deleted (pruning is future work).
 */
export async function publishToGithub(
  target: GithubTarget,
  built: BuiltBundle,
  version: number,
  fetchFn: typeof fetch = fetch,
): Promise<GithubPublishResult> {
  const { owner, repo, branch, token } = target;
  const base = normalizedPath(target.path);

  const ref = await gh(token, `/repos/${owner}/${repo}/git/refs/heads/${branch}`, undefined, fetchFn);
  const baseCommitSha: string = ref.object.sha;

  const baseCommit = await gh(token, `/repos/${owner}/${repo}/git/commits/${baseCommitSha}`, undefined, fetchFn);
  const baseTreeSha: string = baseCommit.tree.sha;

  const treeEntries: Array<{ path: string; mode: '100644'; type: 'blob'; sha: string }> = [];
  for (const [relPath, bytes] of built.files) {
    const blob = await gh(
      token,
      `/repos/${owner}/${repo}/git/blobs`,
      { method: 'POST', body: JSON.stringify({ content: base64FromBytes(bytes), encoding: 'base64' }) },
      fetchFn,
    );
    treeEntries.push({ path: `${base}/${relPath}`, mode: '100644', type: 'blob', sha: blob.sha });
  }

  const tree = await gh(
    token,
    `/repos/${owner}/${repo}/git/trees`,
    { method: 'POST', body: JSON.stringify({ base_tree: baseTreeSha, tree: treeEntries }) },
    fetchFn,
  );

  const commit = await gh(
    token,
    `/repos/${owner}/${repo}/git/commits`,
    {
      method: 'POST',
      body: JSON.stringify({
        message: `Publish songbook v${version}`,
        tree: tree.sha,
        parents: [baseCommitSha],
      }),
    },
    fetchFn,
  );

  await gh(
    token,
    `/repos/${owner}/${repo}/git/refs/heads/${branch}`,
    { method: 'PATCH', body: JSON.stringify({ sha: commit.sha }) },
    fetchFn,
  );

  return { sourceUrl: githubSourceUrl(target), commitSha: commit.sha };
}
