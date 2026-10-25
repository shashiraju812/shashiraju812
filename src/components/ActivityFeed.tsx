import { useEffect, useMemo, useReducer, useState } from "react";
import {
  Activity,
  CircleDot,
  Eye,
  GitBranch,
  GitCommitHorizontal,
  GitFork,
  GitPullRequest,
  Globe,
  MessageSquare,
  Star,
  Tag,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { describeEvent, type ActivityIcon, type ActivityItem } from "@/lib/analytics";
import { fetchCommitMessage, type GHEvent } from "@/lib/github";
import { cn, formatDateTime, relativeTime } from "@/lib/utils";

const ICONS: Record<ActivityIcon, LucideIcon> = {
  push: GitCommitHorizontal,
  pr: GitPullRequest,
  issue: CircleDot,
  comment: MessageSquare,
  star: Star,
  fork: GitFork,
  branch: GitBranch,
  release: Tag,
  delete: Trash2,
  public: Globe,
  review: Eye,
  other: Activity,
};

const FILTERS: { id: string; label: string; match: (i: ActivityItem) => boolean }[] = [
  { id: "all", label: "All", match: () => true },
  { id: "push", label: "Pushes", match: (i) => i.icon === "push" },
  { id: "pr", label: "Pull requests", match: (i) => i.icon === "pr" || i.icon === "review" },
  { id: "issue", label: "Issues", match: (i) => i.icon === "issue" || i.icon === "comment" },
  { id: "star", label: "Stars", match: (i) => i.icon === "star" },
  { id: "release", label: "Releases", match: (i) => i.icon === "release" },
  { id: "branch", label: "Branches", match: (i) => i.icon === "branch" || i.icon === "delete" },
];

const PAGE = 20;
const MAX_LAZY_LOOKUPS = 8;
// head SHA -> first line of commit message (null = couldn't be fetched)
const messageCache = new Map<string, string | null>();

export function ActivityFeed({ events }: { events: GHEvent[] }) {
  const items = useMemo(() => events.map(describeEvent), [events]);
  const [filter, setFilter] = useState("all");
  const [limit, setLimit] = useState(PAGE);
  const [, rerender] = useReducer((n: number) => n + 1, 0);

  const counts = useMemo(
    () => Object.fromEntries(FILTERS.map((f) => [f.id, items.filter(f.match).length])) as Record<string, number>,
    [items],
  );
  const shown = useMemo(() => {
    const match = FILTERS.find((f) => f.id === filter)?.match ?? (() => true);
    return items.filter(match);
  }, [items, filter]);
  const visible = shown.slice(0, limit);

  // Some push events arrive without commit messages; look up the head commit for the first few shown.
  useEffect(() => {
    const ctrl = new AbortController();
    const targets = visible
      .filter((i) => i.headSha && !messageCache.has(`${i.repo}@${i.headSha}`))
      .slice(0, MAX_LAZY_LOOKUPS);
    targets.forEach(async (i) => {
      const key = `${i.repo}@${i.headSha}`;
      try {
        const msg = await fetchCommitMessage(i.repo, i.headSha!, ctrl.signal);
        if (ctrl.signal.aborted) return;
        messageCache.set(key, msg);
        rerender();
      } catch {
        /* aborted */
      }
    });
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible.map((v) => v.id).join(",")]);

  if (!events.length) {
    return (
      <p className="rounded-lg border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
        No recent public activity. GitHub only shares events from the last 90 days.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div role="group" aria-label="Filter activity" className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            disabled={counts[f.id] === 0}
            aria-pressed={filter === f.id}
            onClick={() => {
              setFilter(f.id);
              setLimit(PAGE);
            }}
            className={cn(
              "rounded-full border px-2.5 py-1 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-40",
              filter === f.id ? "border-transparent bg-primary text-primary-foreground" : "hover:bg-accent",
            )}
          >
            {f.label} <span className="tabular opacity-70">{counts[f.id]}</span>
          </button>
        ))}
      </div>

      <ol className="space-y-5">
        {visible.map((item) => {
          const Icon = ICONS[item.icon];
          const lazy = item.headSha ? messageCache.get(`${item.repo}@${item.headSha}`) : undefined;
          return (
            <li key={item.id} className="flex gap-3">
              <span
                aria-hidden="true"
                className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border bg-muted text-muted-foreground"
              >
                <Icon className="size-4" />
              </span>
              <div className="min-w-0 flex-1 text-sm">
                <p className="leading-snug">
                  {item.verb}{" "}
                  <a
                    href={`https://github.com/${item.repo}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="break-all font-medium hover:underline"
                  >
                    {item.repo}
                  </a>
                </p>

                {item.detail && (
                  <p className="mt-0.5 truncate text-muted-foreground" title={item.detail}>
                    <a href={item.href} target="_blank" rel="noopener noreferrer" className="hover:underline">
                      {item.detail}
                    </a>
                  </p>
                )}

                {item.commits && (
                  <ul className="mt-1.5 space-y-1">
                    {item.commits.map((c) => (
                      <li key={c.sha} className="flex items-baseline gap-2 text-muted-foreground">
                        <a
                          href={`https://github.com/${item.repo}/commit/${c.sha}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] hover:text-foreground"
                        >
                          {c.sha}
                        </a>
                        <span className="truncate" title={c.message}>
                          {c.message}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                {item.headSha && lazy && (
                  <ul className="mt-1.5">
                    <li className="flex items-baseline gap-2 text-muted-foreground">
                      <a
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] hover:text-foreground"
                      >
                        {item.headSha.slice(0, 7)}
                      </a>
                      <span className="truncate" title={lazy}>
                        {lazy}
                      </span>
                    </li>
                  </ul>
                )}

                <time
                  dateTime={item.created_at}
                  title={formatDateTime(item.created_at)}
                  className="mt-1 block text-xs text-muted-foreground"
                >
                  {relativeTime(item.created_at)}
                </time>
              </div>
            </li>
          );
        })}
      </ol>

      {shown.length > limit && (
        <div className="flex justify-center">
          <Button variant="outline" size="sm" onClick={() => setLimit((l) => l + PAGE)}>
            Show {Math.min(PAGE, shown.length - limit)} more
          </Button>
        </div>
      )}
    </div>
  );
}
