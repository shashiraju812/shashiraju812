import { useMemo } from "react";
import { CircleDot, Eye, GitFork, Star, type LucideIcon } from "lucide-react";
import { LanguageDonut } from "@/components/charts/LanguageDonut";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { aggregateRepos, languageBreakdown } from "@/lib/analytics";
import type { GHRepo } from "@/lib/github";
import { formatCompact, formatNumber, languageColor, relativeTime } from "@/lib/utils";

function StatTile({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-start gap-3 p-4">
        <div className="rounded-md bg-muted p-2">
          <Icon className="size-4" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="tabular text-2xl font-semibold leading-tight" title={formatNumber(value)}>
            {formatCompact(value)}
          </p>
          {hint && <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

interface Props {
  repos: GHRepo[];
  totalPublicRepos: number;
  onOpenRepo: (r: GHRepo) => void;
}

export function StatsDashboard({ repos, totalPublicRepos, onOpenRepo }: Props) {
  const totals = useMemo(() => aggregateRepos(repos), [repos]);
  const slices = useMemo(() => languageBreakdown(repos), [repos]);
  const top = useMemo(
    () =>
      [...repos]
        .filter((r) => r.stargazers_count > 0)
        .sort((a, b) => b.stargazers_count - a.stargazers_count)
        .slice(0, 3),
    [repos],
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile icon={Star} label="Total stars" value={totals.stars} />
        <StatTile icon={GitFork} label="Total forks" value={totals.forks} />
        <StatTile icon={Eye} label="Total watchers" value={totals.watchers} hint="As reported by GitHub's repos API" />
        <StatTile icon={CircleDot} label="Open issues" value={totals.openIssues} hint="Includes open PRs" />
      </div>
      {totalPublicRepos > repos.length && (
        <p className="text-xs text-muted-foreground">
          Totals cover the {formatNumber(repos.length)} most recently pushed of {formatNumber(totalPublicRepos)} public
          repositories.
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Languages</CardTitle>
            <CardDescription>Primary language of each original (non-fork) repository</CardDescription>
          </CardHeader>
          <CardContent>
            <LanguageDonut slices={slices} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Top repositories</CardTitle>
            <CardDescription>Most starred</CardDescription>
          </CardHeader>
          <CardContent>
            {top.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No starred repositories yet.</p>
            ) : (
              <ol className="space-y-2">
                {top.map((r, i) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => onOpenRepo(r)}
                      aria-haspopup="dialog"
                      className="flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted"
                    >
                      <span
                        aria-hidden="true"
                        className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold"
                      >
                        {i + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{r.name}</span>
                        <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                          <span className="tabular flex items-center gap-1">
                            <Star className="size-3" aria-hidden="true" />
                            <span className="sr-only">Stars:</span>
                            {formatCompact(r.stargazers_count)}
                          </span>
                          <span className="tabular flex items-center gap-1">
                            <GitFork className="size-3" aria-hidden="true" />
                            <span className="sr-only">Forks:</span>
                            {formatCompact(r.forks_count)}
                          </span>
                          {r.language && (
                            <span className="flex items-center gap-1">
                              <span
                                aria-hidden="true"
                                className="size-2.5 rounded-full"
                                style={{ background: languageColor(r.language) }}
                              />
                              {r.language}
                            </span>
                          )}
                          {r.pushed_at && <span>Pushed {relativeTime(r.pushed_at)}</span>}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
