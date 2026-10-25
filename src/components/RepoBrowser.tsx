import { useEffect, useMemo, useState } from "react";
import { Archive, GitFork, Search, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { languageList } from "@/lib/analytics";
import type { GHRepo } from "@/lib/github";
import { formatCompact, languageColor, relativeTime } from "@/lib/utils";

type Sort = "stars" | "updated" | "name";
const PAGE = 12;

function RepoCard({ repo, onOpen }: { repo: GHRepo; onOpen: (r: GHRepo) => void }) {
  const topics = repo.topics ?? [];
  const pushed = repo.pushed_at ?? repo.updated_at;
  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(repo)}
        aria-haspopup="dialog"
        className="flex h-full w-full flex-col rounded-lg border bg-card p-4 text-left transition-colors hover:border-foreground/30 hover:bg-accent/40"
      >
        <span className="flex items-start justify-between gap-2">
          <span className="min-w-0 break-words text-sm font-semibold">{repo.name}</span>
          <span className="flex shrink-0 gap-1">
            {repo.fork && (
              <Badge variant="outline" className="px-2 py-0 text-[10px]">
                Fork
              </Badge>
            )}
            {repo.archived && (
              <Badge variant="outline" className="gap-1 px-2 py-0 text-[10px]">
                <Archive className="size-3" aria-hidden="true" /> Archived
              </Badge>
            )}
          </span>
        </span>

        <span className="mt-1.5 line-clamp-2 min-h-10 text-sm text-muted-foreground">
          {repo.description || "No description provided."}
        </span>

        {topics.length > 0 && (
          <span className="mt-2 flex flex-wrap gap-1">
            {topics.slice(0, 4).map((t) => (
              <Badge key={t} className="px-2 py-0 text-[11px] font-normal">
                {t}
              </Badge>
            ))}
            {topics.length > 4 && <span className="self-center text-[11px] text-muted-foreground">+{topics.length - 4}</span>}
          </span>
        )}

        <span className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-3 text-xs text-muted-foreground">
          {repo.language && (
            <span className="flex items-center gap-1.5">
              <span aria-hidden="true" className="size-2.5 rounded-full" style={{ background: languageColor(repo.language) }} />
              {repo.language}
            </span>
          )}
          <span className="tabular flex items-center gap-1">
            <Star className="size-3.5" aria-hidden="true" />
            <span className="sr-only">Stars:</span>
            {formatCompact(repo.stargazers_count)}
          </span>
          <span className="tabular flex items-center gap-1">
            <GitFork className="size-3.5" aria-hidden="true" />
            <span className="sr-only">Forks:</span>
            {formatCompact(repo.forks_count)}
          </span>
          <span>Pushed {relativeTime(pushed)}</span>
        </span>
      </button>
    </li>
  );
}

export function RepoBrowser({ repos, onOpen }: { repos: GHRepo[]; onOpen: (r: GHRepo) => void }) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Sort>("stars");
  const [lang, setLang] = useState("all");
  const [showForks, setShowForks] = useState(true);
  const [limit, setLimit] = useState(PAGE);

  const languages = useMemo(() => languageList(repos), [repos]);
  const hasForks = useMemo(() => repos.some((r) => r.fork), [repos]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = repos.filter((r) => {
      if (!showForks && r.fork) return false;
      if (lang !== "all" && r.language !== lang) return false;
      if (!needle) return true;
      return (
        r.name.toLowerCase().includes(needle) ||
        (r.description ?? "").toLowerCase().includes(needle) ||
        (r.topics ?? []).some((t) => t.toLowerCase().includes(needle))
      );
    });
    const time = (r: GHRepo) => new Date(r.pushed_at ?? r.updated_at).getTime();
    list.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name, "en", { sensitivity: "base" });
      if (sort === "updated") return time(b) - time(a);
      return b.stargazers_count - a.stargazers_count || a.name.localeCompare(b.name);
    });
    return list;
  }, [repos, q, sort, lang, showForks]);

  useEffect(() => setLimit(PAGE), [q, sort, lang, showForks]);

  const filtersActive = q !== "" || lang !== "all" || !showForks;
  const reset = () => {
    setQ("");
    setLang("all");
    setShowForks(true);
  };

  if (!repos.length) {
    return (
      <Card className="border-dashed">
        <CardContent className="px-6 py-12 text-center text-sm text-muted-foreground">
          This user has no public repositories.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div role="group" aria-label="Repository filters" className="flex flex-wrap items-end gap-3">
        <div className="relative min-w-48 flex-1">
          <label htmlFor="repo-search" className="sr-only">
            Search repositories
          </label>
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="repo-search"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, description or topic"
            className="pl-9"
          />
        </div>

        <div className="w-full sm:w-40">
          <label htmlFor="repo-sort" className="mb-1 block text-xs text-muted-foreground">
            Sort by
          </label>
          <NativeSelect id="repo-sort" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            <option value="stars">Most stars</option>
            <option value="updated">Recently updated</option>
            <option value="name">Name (A–Z)</option>
          </NativeSelect>
        </div>

        <div className="w-full sm:w-44">
          <label htmlFor="repo-lang" className="mb-1 block text-xs text-muted-foreground">
            Language
          </label>
          <NativeSelect id="repo-lang" value={lang} onChange={(e) => setLang(e.target.value)}>
            <option value="all">All languages</option>
            {languages.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </NativeSelect>
        </div>

        {hasForks && (
          <label className="flex h-10 items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showForks}
              onChange={(e) => setShowForks(e.target.checked)}
              className="size-4 rounded border-input accent-foreground"
            />
            Include forks
          </label>
        )}
      </div>

      <p aria-live="polite" className="text-sm text-muted-foreground">
        Showing {Math.min(limit, filtered.length)} of {filtered.length} {filtered.length === 1 ? "repository" : "repositories"}
        {filtersActive && repos.length !== filtered.length ? ` (filtered from ${repos.length})` : ""}
      </p>

      {filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 px-6 py-10 text-center">
            <p className="text-sm text-muted-foreground">No repositories match these filters.</p>
            <Button variant="outline" size="sm" onClick={reset}>
              Clear filters
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <ul className="grid gap-3 sm:grid-cols-2">
            {filtered.slice(0, limit).map((r) => (
              <RepoCard key={r.id} repo={r} onOpen={onOpen} />
            ))}
          </ul>
          {filtered.length > limit && (
            <div className="flex justify-center">
              <Button variant="outline" onClick={() => setLimit((l) => l + PAGE)}>
                Show {Math.min(PAGE, filtered.length - limit)} more
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
