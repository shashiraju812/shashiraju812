import { useEffect, useState, type FormEvent, type RefObject } from "react";
import { History, Loader2, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn, isValidUsername } from "@/lib/utils";

const SUGGESTED = [
  { login: "torvalds", note: "Linux" },
  { login: "gaearon", note: "React" },
  { login: "sindresorhus", note: "Open source" },
  { login: "yyx990803", note: "Vue" },
  { login: "tj", note: "Node.js" },
  { login: "addyosmani", note: "Chrome" },
  { login: "antfu", note: "Vite ecosystem" },
  { login: "shadcn", note: "shadcn/ui" },
];

/** Accepts "torvalds", "@torvalds" or a full github.com URL. */
function extractLogin(raw: string): string {
  let v = raw.trim();
  v = v.replace(/^https?:\/\/(www\.)?github\.com\//i, "").replace(/^@/, "");
  return v.split(/[/?#\s]/)[0] ?? "";
}

interface Props {
  current: string | null;
  loading: boolean;
  recent: string[];
  inputRef: RefObject<HTMLInputElement>;
  onSearch: (login: string) => void;
  onRemoveRecent: (login: string) => void;
  onClearRecent: () => void;
}

export function SearchPanel({ current, loading, recent, inputRef, onSearch, onRemoveRecent, onClearRecent }: Props) {
  const [value, setValue] = useState(current ?? "");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setValue(current ?? "");
    setError(null);
  }, [current]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const login = extractLogin(value);
    if (!login) return setError("Enter a GitHub username.");
    if (!isValidUsername(login)) {
      return setError("Usernames can only contain letters, numbers and single hyphens (max 39 characters).");
    }
    setError(null);
    onSearch(login);
  };

  return (
    <section aria-labelledby="search-heading" className="space-y-5">
      <div className="space-y-1.5">
        <h1 id="search-heading" className="text-3xl font-semibold tracking-tight sm:text-4xl">
          GitHub Profile Explorer
        </h1>
        <p className="text-muted-foreground">Search any public GitHub user and dig into their work.</p>
      </div>

      <form role="search" onSubmit={submit} noValidate className="space-y-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <label htmlFor="user-search" className="sr-only">
              GitHub username
            </label>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              id="user-search"
              ref={inputRef}
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Search a username, e.g. torvalds"
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              aria-invalid={!!error}
              aria-describedby={error ? "search-error" : "search-hint"}
              className="h-12 pl-9 pr-10 text-base"
            />
            <kbd
              aria-hidden="true"
              className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border bg-muted px-1.5 font-mono text-xs text-muted-foreground sm:block"
            >
              /
            </kbd>
          </div>
          <Button type="submit" size="lg" disabled={loading}>
            {loading ? <Loader2 className="animate-spin" /> : <Search />}
            <span>Search</span>
          </Button>
        </div>
        {error ? (
          <p id="search-error" role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : (
          <p id="search-hint" className="text-xs text-muted-foreground">
            Press <kbd className="rounded border bg-muted px-1 font-mono">/</kbd> to focus the search box, then Enter to
            search.
          </p>
        )}
      </form>

      {recent.length > 0 && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <History className="size-4" aria-hidden="true" /> Recent searches
            </h2>
            <Button variant="link" size="sm" className="h-auto p-0 text-xs text-muted-foreground" onClick={onClearRecent}>
              Clear all
            </Button>
          </div>
          <ul className="flex flex-wrap gap-2">
            {recent.map((login) => {
              const active = current?.toLowerCase() === login.toLowerCase();
              return (
                <li
                  key={login}
                  className={cn(
                    "inline-flex items-center rounded-full border bg-card text-sm",
                    active && "border-foreground/40",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => onSearch(login)}
                    className="rounded-l-full py-1 pl-3 pr-1.5 hover:text-foreground"
                    aria-label={`Search ${login} again`}
                  >
                    {login}
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemoveRecent(login)}
                    className="rounded-r-full py-1 pl-0.5 pr-2 text-muted-foreground hover:text-foreground"
                    aria-label={`Remove ${login} from recent searches`}
                  >
                    <X className="size-3.5" aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div>
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">Try a notable profile</h2>
        <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
          {SUGGESTED.map((s) => (
            <li key={s.login} className="shrink-0">
              <button
                type="button"
                onClick={() => onSearch(s.login)}
                className="flex items-center gap-2 rounded-full border bg-card py-1 pl-1 pr-3 text-sm transition-colors hover:bg-accent"
              >
                <img
                  src={`https://avatars.githubusercontent.com/${s.login}?s=48`}
                  alt=""
                  width={24}
                  height={24}
                  loading="lazy"
                  className="size-6 rounded-full bg-muted"
                />
                <span className="font-medium">{s.login}</span>
                <span className="text-xs text-muted-foreground">{s.note}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
