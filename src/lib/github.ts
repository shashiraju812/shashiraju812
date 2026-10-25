/**
 * Thin client for GitHub's public REST API (called directly from the browser).
 * An optional personal access token (kept in localStorage only) raises the
 * hourly limit from 60 (anonymous) to 5,000.
 */

const API = "https://api.github.com";
const TOKEN_KEY = "gh-token";

export interface GHUser {
  login: string;
  id: number;
  avatar_url: string;
  html_url: string;
  name: string | null;
  company: string | null;
  blog: string | null;
  location: string | null;
  bio: string | null;
  twitter_username: string | null;
  public_repos: number;
  public_gists: number;
  followers: number;
  following: number;
  created_at: string;
  type: string;
}

export interface GHRepo {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  fork: boolean;
  homepage: string | null;
  stargazers_count: number;
  watchers_count: number;
  forks_count: number;
  open_issues_count: number;
  language: string | null;
  topics?: string[];
  pushed_at: string | null;
  updated_at: string;
  created_at: string;
  default_branch: string;
  archived: boolean;
  license: { spdx_id: string | null; name: string } | null;
  owner: { login: string };
}

export interface GHEvent {
  id: string;
  type: string;
  repo: { name: string };
  created_at: string;
  // Payload shapes differ per event type, so keep it loose.
  payload: Record<string, any>;
}

export type ErrorKind = "not_found" | "rate_limit" | "bad_token" | "network" | "other";

export class GitHubError extends Error {
  kind: ErrorKind;
  resetAt?: Date;
  constructor(kind: ErrorKind, message: string, resetAt?: Date) {
    super(message);
    this.name = "GitHubError";
    this.kind = kind;
    this.resetAt = resetAt;
  }
}

/* ---------- token storage ---------- */

export function getToken(): string {
  try {
    return localStorage.getItem(TOKEN_KEY) ?? "";
  } catch {
    return "";
  }
}

export function setToken(value: string) {
  try {
    if (value) localStorage.setItem(TOKEN_KEY, value);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable */
  }
}

/* ---------- rate-limit store (for useSyncExternalStore) ---------- */

export interface RateInfo {
  limit: number;
  remaining: number;
  resetAt: Date;
}

let rate: RateInfo | null = null;
const listeners = new Set<() => void>();

export const subscribeRate = (cb: () => void) => {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
};
export const getRate = () => rate;

function updateRate(res: Response) {
  const limit = Number(res.headers.get("x-ratelimit-limit"));
  const remaining = Number(res.headers.get("x-ratelimit-remaining"));
  const reset = Number(res.headers.get("x-ratelimit-reset"));
  if (!limit || Number.isNaN(remaining) || !reset) return;
  if (rate && rate.limit === limit && rate.remaining === remaining) return;
  rate = { limit, remaining, resetAt: new Date(reset * 1000) };
  listeners.forEach((l) => l());
}

/* ---------- request core ---------- */

async function request(path: string, accept: string, signal?: AbortSignal): Promise<Response> {
  const headers: Record<string, string> = { Accept: accept };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(API + path, { headers, signal });
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    throw new GitHubError("network", "Couldn't reach GitHub. Check your connection and try again.");
  }
  updateRate(res);
  if (res.ok) return res;

  if (res.status === 404) throw new GitHubError("not_found", "Not found");
  if (res.status === 401) {
    throw new GitHubError("bad_token", "GitHub rejected your access token. Remove or replace it and try again.");
  }

  if (res.status === 403 || res.status === 429) {
    const body = await res.clone().json().catch(() => null);
    const message: string = body?.message ?? "";
    const remaining = res.headers.get("x-ratelimit-remaining");
    if (remaining === "0" || res.status === 429 || /rate limit|abuse/i.test(message)) {
      const reset = Number(res.headers.get("x-ratelimit-reset"));
      const retryAfter = Number(res.headers.get("retry-after"));
      const resetAt = reset
        ? new Date(reset * 1000)
        : retryAfter
          ? new Date(Date.now() + retryAfter * 1000)
          : undefined;
      throw new GitHubError("rate_limit", "GitHub API rate limit reached.", resetAt);
    }
  }
  throw new GitHubError("other", `GitHub returned an unexpected error (HTTP ${res.status}).`);
}

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await request(path, "application/vnd.github+json", signal);
  return (await res.json()) as T;
}

/* ---------- endpoints ---------- */

export const fetchUser = (login: string, signal?: AbortSignal) =>
  getJson<GHUser>(`/users/${encodeURIComponent(login)}`, signal);

/** Up to 500 of the user's own public repos (5 pages x 100). */
export async function fetchRepos(login: string, signal?: AbortSignal): Promise<GHRepo[]> {
  const all: GHRepo[] = [];
  for (let page = 1; page <= 5; page++) {
    const chunk = await getJson<GHRepo[]>(
      `/users/${encodeURIComponent(login)}/repos?per_page=100&type=owner&sort=pushed&page=${page}`,
      signal,
    );
    all.push(...chunk);
    if (chunk.length < 100) break;
  }
  return all;
}

/** The public events feed: GitHub keeps up to 300 events from the last 90 days. */
export async function fetchEvents(login: string, signal?: AbortSignal): Promise<GHEvent[]> {
  const all: GHEvent[] = [];
  for (let page = 1; page <= 3; page++) {
    try {
      const chunk = await getJson<GHEvent[]>(
        `/users/${encodeURIComponent(login)}/events/public?per_page=100&page=${page}`,
        signal,
      );
      all.push(...chunk);
      if (chunk.length < 100) break;
    } catch (e) {
      // A later page failing shouldn't discard what we already have.
      if (page === 1 || (e as Error).name === "AbortError") throw e;
      break;
    }
  }
  return all;
}

/** README rendered to HTML by GitHub. Resolves to null when the repo has none. */
export async function fetchReadmeHtml(
  owner: string,
  repo: string,
  signal?: AbortSignal,
): Promise<string | null> {
  try {
    const res = await request(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/readme`,
      "application/vnd.github.html+json",
      signal,
    );
    return await res.text();
  } catch (e) {
    if (e instanceof GitHubError && e.kind === "not_found") return null;
    throw e;
  }
}

/** First line of a commit's message — used when push events don't carry commits inline. */
export async function fetchCommitMessage(
  fullName: string,
  sha: string,
  signal?: AbortSignal,
): Promise<string | null> {
  try {
    const c = await getJson<{ commit: { message: string } }>(`/repos/${fullName}/commits/${sha}`, signal);
    return c.commit.message.split("\n")[0];
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    return null;
  }
}
