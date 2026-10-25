import type { GHEvent, GHRepo } from "./github";
import { dayKey } from "./utils";

export interface RepoTotals {
  stars: number;
  forks: number;
  watchers: number;
  openIssues: number;
}

export function aggregateRepos(repos: GHRepo[]): RepoTotals {
  return repos.reduce<RepoTotals>(
    (t, r) => ({
      stars: t.stars + r.stargazers_count,
      forks: t.forks + r.forks_count,
      watchers: t.watchers + r.watchers_count,
      openIssues: t.openIssues + r.open_issues_count,
    }),
    { stars: 0, forks: 0, watchers: 0, openIssues: 0 },
  );
}

export interface LanguageSlice {
  label: string;
  value: number;
}

/** Languages by primary-language repo count. Forks are excluded so the chart reflects the user's own code. */
export function languageBreakdown(repos: GHRepo[], maxSlices = 7): LanguageSlice[] {
  const counts = new Map<string, number>();
  for (const r of repos) {
    if (r.fork || !r.language) continue;
    counts.set(r.language, (counts.get(r.language) ?? 0) + 1);
  }
  const sorted = [...counts.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  if (sorted.length <= maxSlices) return sorted;
  const head = sorted.slice(0, maxSlices - 1);
  const rest = sorted.slice(maxSlices - 1).reduce((s, x) => s + x.value, 0);
  return [...head, { label: "Other", value: rest }];
}

export function languageList(repos: GHRepo[]): string[] {
  const set = new Set<string>();
  repos.forEach((r) => r.language && set.add(r.language));
  return [...set].sort((a, b) => a.localeCompare(b));
}

/** How many commits a push event represents (falls back to 1 if GitHub omits the counts). */
export function pushCommitCount(e: GHEvent): number {
  const p = e.payload ?? {};
  if (typeof p.size === "number") return p.size;
  if (Array.isArray(p.commits)) return p.commits.length;
  return 1;
}

/** Contribution weight of an event for the heatmap. */
function eventWeight(e: GHEvent): number {
  switch (e.type) {
    case "PushEvent":
      return pushCommitCount(e);
    case "PullRequestEvent":
    case "IssuesEvent":
    case "PullRequestReviewEvent":
    case "CreateEvent":
      return 1;
    default:
      return 0;
  }
}

export interface HeatCell {
  date: Date;
  key: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
  inFuture: boolean;
}

export interface HeatmapData {
  weeks: HeatCell[][]; // columns of 7 (Sun..Sat)
  total: number;
  activeDays: number;
  max: number;
  windowStart: Date;
}

export function buildHeatmap(events: GHEvent[], weekCount = 18, now = new Date()): HeatmapData {
  const perDay = new Map<string, number>();
  for (const e of events) {
    const w = eventWeight(e);
    if (!w) continue;
    const k = dayKey(new Date(e.created_at));
    perDay.set(k, (perDay.get(k) ?? 0) + w);
  }

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start = new Date(today);
  start.setDate(start.getDate() - today.getDay() - (weekCount - 1) * 7); // Sunday of first column

  const max = Math.max(0, ...perDay.values());
  const level = (n: number): HeatCell["level"] => {
    if (n <= 0 || max <= 0) return 0;
    const r = n / max;
    if (r > 0.75) return 4;
    if (r > 0.5) return 3;
    if (r > 0.25) return 2;
    return 1;
  };

  const weeks: HeatCell[][] = [];
  let total = 0;
  let activeDays = 0;
  for (let w = 0; w < weekCount; w++) {
    const col: HeatCell[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(start);
      date.setDate(start.getDate() + w * 7 + d);
      const key = dayKey(date);
      const inFuture = date > today;
      const count = inFuture ? 0 : (perDay.get(key) ?? 0);
      if (count > 0) {
        total += count;
        activeDays++;
      }
      col.push({ date, key, count, level: level(count), inFuture });
    }
    weeks.push(col);
  }
  return { weeks, total, activeDays, max, windowStart: start };
}

/* ---------- activity feed descriptions ---------- */

export type ActivityIcon =
  | "push"
  | "pr"
  | "issue"
  | "comment"
  | "star"
  | "fork"
  | "branch"
  | "release"
  | "delete"
  | "public"
  | "review"
  | "other";

export interface ActivityItem {
  id: string;
  icon: ActivityIcon;
  verb: string; // "Pushed 3 commits to"
  repo: string; // owner/name
  href: string;
  detail?: string; // PR / issue title, branch name, etc.
  commits?: { sha: string; message: string }[];
  /** Head SHA for pushes that didn't include commit messages inline. */
  headSha?: string;
  created_at: string;
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const branchOf = (ref?: string | null) => (ref ? ref.replace(/^refs\/(heads|tags)\//, "") : "");

export function describeEvent(e: GHEvent): ActivityItem {
  const p = e.payload ?? {};
  const repo = e.repo.name;
  const base = { id: e.id, repo, created_at: e.created_at, href: `https://github.com/${repo}` };

  switch (e.type) {
    case "PushEvent": {
      const count = pushCommitCount(e);
      const branch = branchOf(p.ref);
      const commits = Array.isArray(p.commits)
        ? p.commits
            .slice(-3)
            .reverse()
            .map((c: any) => ({ sha: String(c.sha).slice(0, 7), message: String(c.message).split("\n")[0] }))
        : undefined;
      return {
        ...base,
        icon: "push",
        verb: `Pushed ${plural(count, "commit")} to`,
        detail: branch ? `on ${branch}` : undefined,
        commits: commits && commits.length ? commits : undefined,
        headSha: !commits?.length && p.head ? String(p.head) : undefined,
        href: p.head ? `https://github.com/${repo}/commit/${p.head}` : base.href,
      };
    }
    case "PullRequestEvent": {
      const pr = p.pull_request ?? {};
      const action = pr.merged ? "merged" : (p.action ?? "updated");
      return {
        ...base,
        icon: "pr",
        verb: `${cap(action)} pull request in`,
        detail: pr.title ? `#${p.number ?? pr.number} ${pr.title}` : undefined,
        href: pr.html_url ?? base.href,
      };
    }
    case "PullRequestReviewEvent":
      return {
        ...base,
        icon: "review",
        verb: "Reviewed a pull request in",
        detail: p.pull_request?.title ? `#${p.pull_request.number} ${p.pull_request.title}` : undefined,
        href: p.review?.html_url ?? p.pull_request?.html_url ?? base.href,
      };
    case "IssuesEvent":
      return {
        ...base,
        icon: "issue",
        verb: `${cap(p.action ?? "updated")} an issue in`,
        detail: p.issue?.title ? `#${p.issue.number} ${p.issue.title}` : undefined,
        href: p.issue?.html_url ?? base.href,
      };
    case "IssueCommentEvent":
    case "CommitCommentEvent":
    case "PullRequestReviewCommentEvent":
      return {
        ...base,
        icon: "comment",
        verb: "Commented in",
        detail: p.issue?.title ?? p.pull_request?.title,
        href: p.comment?.html_url ?? base.href,
      };
    case "WatchEvent":
      return { ...base, icon: "star", verb: "Starred" };
    case "ForkEvent":
      return {
        ...base,
        icon: "fork",
        verb: "Forked",
        detail: p.forkee?.full_name ? `to ${p.forkee.full_name}` : undefined,
        href: p.forkee?.html_url ?? base.href,
      };
    case "CreateEvent": {
      const type = p.ref_type as string | undefined;
      if (type === "branch" || type === "tag") {
        return { ...base, icon: "branch", verb: `Created ${type} in`, detail: p.ref ?? undefined };
      }
      return { ...base, icon: "branch", verb: "Created repository", detail: undefined };
    }
    case "DeleteEvent":
      return {
        ...base,
        icon: "delete",
        verb: `Deleted ${p.ref_type ?? "ref"} in`,
        detail: p.ref ?? undefined,
      };
    case "ReleaseEvent":
      return {
        ...base,
        icon: "release",
        verb: `${cap(p.action ?? "published")} release in`,
        detail: p.release?.name || p.release?.tag_name,
        href: p.release?.html_url ?? base.href,
      };
    case "PublicEvent":
      return { ...base, icon: "public", verb: "Made public" };
    case "MemberEvent":
      return { ...base, icon: "other", verb: `${cap(p.action ?? "added")} a collaborator in` };
    default:
      return { ...base, icon: "other", verb: e.type.replace(/Event$/, "").replace(/([a-z])([A-Z])/g, "$1 $2") + " in" };
  }
}
