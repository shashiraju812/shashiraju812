import { useEffect, useRef, useState, type MouseEvent } from "react";
import { Archive, CircleDot, ExternalLink, GitFork, Globe, Scale, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchReadmeHtml, GitHubError, type GHRepo } from "@/lib/github";
import { sanitizeReadme } from "@/lib/sanitize";
import { formatCompact, formatDate, languageColor, normalizeUrl, relativeTime } from "@/lib/utils";

type Readme =
  | { status: "loading" }
  | { status: "done"; html: string | null }
  | { status: "error"; error: GitHubError };

interface Props {
  repo: GHRepo | null;
  onClose: () => void;
}

export function RepoDrawer({ repo, onClose }: Props) {
  // Keep rendering the last repo while the close animation plays.
  const last = useRef<GHRepo | null>(repo);
  if (repo) last.current = repo;
  const r = repo ?? last.current;

  const [readme, setReadme] = useState<Readme>({ status: "loading" });
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!repo) return;
    const ctrl = new AbortController();
    setReadme({ status: "loading" });
    fetchReadmeHtml(repo.owner.login, repo.name, ctrl.signal)
      .then((html) => {
        if (ctrl.signal.aborted) return;
        setReadme({
          status: "done",
          html: html ? sanitizeReadme(html, repo.owner.login, repo.name, repo.default_branch) : null,
        });
      })
      .catch((e) => {
        if (ctrl.signal.aborted) return;
        setReadme({
          status: "error",
          error: e instanceof GitHubError ? e : new GitHubError("other", "Couldn't load the README."),
        });
      });
    return () => ctrl.abort();
  }, [repo]);

  // README heading links (#section) shouldn't navigate the app — scroll inside the drawer instead.
  const onReadmeClick = (e: MouseEvent<HTMLDivElement>) => {
    const a = (e.target as HTMLElement).closest("a");
    const href = a?.getAttribute("href");
    if (!a || !href?.startsWith("#") || href.length < 2) return;
    e.preventDefault();
    const id = decodeURIComponent(href.slice(1));
    const root = bodyRef.current;
    const target =
      root?.querySelector(`[id="${CSS.escape(`user-content-${id}`)}"]`) ?? root?.querySelector(`[id="${CSS.escape(id)}"]`);
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <Sheet open={!!repo} onOpenChange={(open) => !open && onClose()}>
      <SheetContent aria-describedby="repo-drawer-desc">
        {r && (
          <>
            <header className="space-y-3 border-b p-5 pr-12">
              <div className="space-y-1">
                <SheetTitle className="break-words">
                  <span className="font-normal text-muted-foreground">{r.owner.login} / </span>
                  {r.name}
                </SheetTitle>
                <SheetDescription id="repo-drawer-desc">{r.description || "No description provided."}</SheetDescription>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
                {r.language && (
                  <span className="flex items-center gap-1.5">
                    <span aria-hidden="true" className="size-2.5 rounded-full" style={{ background: languageColor(r.language) }} />
                    {r.language}
                  </span>
                )}
                <span className="tabular flex items-center gap-1">
                  <Star className="size-4" aria-hidden="true" /> {formatCompact(r.stargazers_count)}{" "}
                  <span className="sr-only">stars</span>
                </span>
                <span className="tabular flex items-center gap-1">
                  <GitFork className="size-4" aria-hidden="true" /> {formatCompact(r.forks_count)}{" "}
                  <span className="sr-only">forks</span>
                </span>
                <span className="tabular flex items-center gap-1">
                  <CircleDot className="size-4" aria-hidden="true" /> {formatCompact(r.open_issues_count)}{" "}
                  <span className="sr-only">open issues</span>
                </span>
                {r.license?.spdx_id && r.license.spdx_id !== "NOASSERTION" && (
                  <span className="flex items-center gap-1">
                    <Scale className="size-4" aria-hidden="true" /> {r.license.spdx_id}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {r.fork && <Badge variant="outline">Fork</Badge>}
                {r.archived && (
                  <Badge variant="outline" className="gap-1">
                    <Archive className="size-3" aria-hidden="true" /> Archived
                  </Badge>
                )}
                {(r.topics ?? []).slice(0, 8).map((t) => (
                  <Badge key={t} className="font-normal">
                    {t}
                  </Badge>
                ))}
              </div>

              <p className="text-xs text-muted-foreground">
                Created {formatDate(r.created_at)} · Last push {relativeTime(r.pushed_at ?? r.updated_at)}
              </p>

              <div className="flex flex-wrap gap-2">
                <Button size="sm" asChild>
                  <a href={r.html_url} target="_blank" rel="noopener noreferrer">
                    Open on GitHub <ExternalLink />
                  </a>
                </Button>
                {r.homepage?.trim() && (
                  <Button size="sm" variant="outline" asChild>
                    <a href={normalizeUrl(r.homepage)} target="_blank" rel="noopener noreferrer nofollow">
                      <Globe /> Homepage
                    </a>
                  </Button>
                )}
              </div>
            </header>

            <div ref={bodyRef} className="flex-1 overflow-y-auto p-5">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">README</h3>

              {readme.status === "loading" && (
                <div aria-hidden="true" className="space-y-3">
                  <Skeleton className="h-7 w-2/3" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-11/12" />
                  <Skeleton className="h-4 w-4/5" />
                  <Skeleton className="h-32 w-full" />
                </div>
              )}

              {readme.status === "error" && (
                <p role="alert" className="rounded-md border border-destructive/40 p-4 text-sm">
                  {readme.error.kind === "rate_limit"
                    ? `GitHub's API rate limit was reached${readme.error.resetAt ? ` (resets ${relativeTime(readme.error.resetAt)})` : ""}. Add a token from the header to keep browsing.`
                    : readme.error.message}
                </p>
              )}

              {readme.status === "done" && readme.html === null && (
                <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                  This repository doesn't have a README.
                </p>
              )}

              {readme.status === "done" && readme.html && (
                // eslint-disable-next-line react/no-danger -- sanitized with DOMPurify in sanitizeReadme()
                <div
                  className="markdown-body"
                  onClick={onReadmeClick}
                  dangerouslySetInnerHTML={{ __html: readme.html }}
                />
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
