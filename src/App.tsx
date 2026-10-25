import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { KeyRound, Moon, Sun } from "lucide-react";
import { ProfileView } from "@/components/ProfileView";
import { SearchPanel } from "@/components/SearchPanel";
import { EmptyState, ErrorPanel, ProfileSkeleton } from "@/components/States";
import { TokenDialog } from "@/components/TokenDialog";
import { Button } from "@/components/ui/button";
import { useProfile } from "@/hooks/useProfile";
import { useRecentSearches } from "@/hooks/useRecentSearches";
import { useTheme } from "@/hooks/useTheme";
import { getRate, getToken, subscribeRate } from "@/lib/github";
import { relativeTime } from "@/lib/utils";

const readUserParam = () => new URLSearchParams(window.location.search).get("user")?.trim() || null;

export default function App() {
  const { theme, toggle } = useTheme();
  const { recent, add, remove, clear } = useRecentSearches();
  const rate = useSyncExternalStore(subscribeRate, getRate);

  const [login, setLogin] = useState<string | null>(readUserParam);
  const [refreshKey, setRefreshKey] = useState(0);
  const [tokenOpen, setTokenOpen] = useState(false);
  const [tokenVersion, setTokenVersion] = useState(0); // re-renders the header badge after token changes
  const inputRef = useRef<HTMLInputElement>(null);

  const { user, repos, events } = useProfile(login, refreshKey);
  const hasToken = !!getToken();

  /* ----- navigation: keep ?user= in sync so every profile is a shareable link ----- */
  useEffect(() => {
    const onPop = () => setLogin(readUserParam());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const search = useCallback(
    (next: string) => {
      if (login && next.toLowerCase() === login.toLowerCase()) {
        setRefreshKey((k) => k + 1); // same user -> one-click re-run
        return;
      }
      window.history.pushState(null, "", `?user=${encodeURIComponent(next)}`);
      setLogin(next);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [login],
  );

  const retry = useCallback(() => setRefreshKey((k) => k + 1), []);

  /* ----- remember successful lookups + reflect the profile in the tab title ----- */
  const loaded = user.status === "done" ? user.data : undefined;
  useEffect(() => {
    if (!loaded) {
      document.title = "GitHub Profile Explorer";
      return;
    }
    add(loaded.login);
    document.title = `${loaded.name || loaded.login} (@${loaded.login}) · GitHub Profile Explorer`;
  }, [loaded?.login]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ----- "/" focuses the search box ----- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName))) return;
      e.preventDefault();
      inputRef.current?.focus();
      inputRef.current?.select();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const loading = user.status === "loading";
  const statusMessage = !login
    ? ""
    : loading
      ? `Loading ${login}…`
      : user.status === "error"
        ? user.error?.kind === "not_found"
          ? `User ${login} not found`
          : "Couldn't load profile"
        : loaded
          ? `Loaded profile for ${loaded.login}`
          : "";

  return (
    <div className="min-h-screen">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
        <div className="container flex h-14 items-center justify-between">
          <a href={window.location.pathname} className="flex items-center gap-2 font-semibold" onClick={(e) => {
            e.preventDefault();
            window.history.pushState(null, "", window.location.pathname);
            setLogin(null);
          }}>
            <span aria-hidden="true" className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <circle cx="10.5" cy="10.5" r="6" />
                <path d="m15 15 6 6" />
              </svg>
            </span>
            <span className="hidden sm:inline">Profile Explorer</span>
          </a>

          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => setTokenOpen(true)} aria-label={hasToken ? "GitHub token: set. Manage token" : "Add GitHub token"} key={tokenVersion}>
              <KeyRound />
              <span className="hidden sm:inline">{hasToken ? "Token active" : "Add token"}</span>
              {hasToken && <span aria-hidden="true" className="size-1.5 rounded-full bg-emerald-500" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggle}
              aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
            >
              {theme === "dark" ? <Sun /> : <Moon />}
            </Button>
          </div>
        </div>
      </header>

      <main id="main" className="container space-y-10 py-8">
        <SearchPanel
          current={login}
          loading={loading}
          recent={recent}
          inputRef={inputRef}
          onSearch={search}
          onRemoveRecent={remove}
          onClearRecent={clear}
        />

        <div role="status" aria-live="polite" className="sr-only">
          {statusMessage}
        </div>

        {!login ? (
          <EmptyState />
        ) : user.status === "error" && user.error ? (
          <ErrorPanel
            login={login}
            error={user.error}
            hasToken={hasToken}
            onRetry={retry}
            onOpenToken={() => setTokenOpen(true)}
          />
        ) : user.status === "done" ? (
          <ProfileView user={user} repos={repos} events={events} onRetry={retry} onOpenToken={() => setTokenOpen(true)} />
        ) : (
          <ProfileSkeleton />
        )}
      </main>

      <footer className="border-t">
        <div className="container flex flex-col gap-1 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>Data from GitHub's public REST API, fetched directly in your browser. Not affiliated with GitHub.</p>
          {rate && (
            <p className="tabular">
              API quota: {rate.remaining}/{rate.limit} · resets {relativeTime(rate.resetAt)}
            </p>
          )}
        </div>
      </footer>

      <TokenDialog
        open={tokenOpen}
        onOpenChange={setTokenOpen}
        onChanged={() => {
          setTokenVersion((v) => v + 1);
          setRefreshKey((k) => k + 1);
        }}
      />
    </div>
  );
}
