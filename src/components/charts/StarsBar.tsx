import { Star } from "lucide-react";
import type { GHRepo } from "@/lib/github";
import { formatNumber, languageColor } from "@/lib/utils";

/** Horizontal bar chart of the most-starred repos. Each row is a button that opens the repo drawer. */
export function StarsBar({ repos, onOpen, limit = 8 }: { repos: GHRepo[]; onOpen: (r: GHRepo) => void; limit?: number }) {
  const top = [...repos]
    .filter((r) => r.stargazers_count > 0)
    .sort((a, b) => b.stargazers_count - a.stargazers_count)
    .slice(0, limit);

  if (!top.length) {
    return <p className="py-10 text-center text-sm text-muted-foreground">None of these repositories have been starred yet.</p>;
  }

  const max = top[0].stargazers_count;

  return (
    <ol className="space-y-1.5">
      {top.map((r) => {
        const pct = Math.max(2, (r.stargazers_count / max) * 100);
        return (
          <li key={r.id}>
            <button
              type="button"
              onClick={() => onOpen(r)}
              aria-haspopup="dialog"
              className="group grid w-full grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-3 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted sm:grid-cols-[minmax(0,12rem)_1fr_auto]"
            >
              <span className="truncate font-medium">{r.name}</span>
              <span className="h-3 rounded-full bg-muted group-hover:bg-background">
                <span
                  className="block h-full rounded-full"
                  style={{ width: `${pct}%`, background: r.language ? languageColor(r.language) : "hsl(var(--muted-foreground))" }}
                />
              </span>
              <span className="tabular flex items-center gap-1 text-muted-foreground">
                <Star className="size-3.5" aria-hidden="true" />
                <span className="sr-only">Stars:</span>
                {formatNumber(r.stargazers_count)}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
