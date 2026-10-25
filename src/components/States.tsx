import { AlertTriangle, Clock, KeyRound, RefreshCw, Search, UserX, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { GitHubError } from "@/lib/github";
import { relativeTime } from "@/lib/utils";

/* ---------- empty / idle ---------- */

export function EmptyState() {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center gap-3 px-6 py-14 text-center">
        <div className="rounded-full bg-muted p-4">
          <Search className="size-6 text-muted-foreground" aria-hidden="true" />
        </div>
        <h2 className="text-xl font-semibold">Look up any GitHub profile</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          Type a username above, or pick one of the suggestions, to see their repositories, stats, languages, recent
          activity and a contribution heatmap — all pulled live from GitHub's public API.
        </p>
      </CardContent>
    </Card>
  );
}

/* ---------- full-page errors (profile couldn't load) ---------- */

interface ErrorPanelProps {
  login: string;
  error: GitHubError;
  hasToken: boolean;
  onRetry: () => void;
  onOpenToken: () => void;
}

export function ErrorPanel({ login, error, hasToken, onRetry, onOpenToken }: ErrorPanelProps) {
  if (error.kind === "not_found") {
    return (
      <StateCard
        icon={<UserX className="size-6" aria-hidden="true" />}
        title={`User “${login}” not found`}
        body="Check the spelling — GitHub usernames only contain letters, numbers and hyphens. The account may also have been renamed or deleted."
      />
    );
  }

  if (error.kind === "rate_limit") {
    return (
      <StateCard
        icon={<Clock className="size-6" aria-hidden="true" />}
        title="GitHub API rate limit reached"
        body={
          <>
            {hasToken
              ? "Your token's hourly quota is used up."
              : "Anonymous requests are limited to 60 per hour. Add a personal access token to raise that to 5,000."}{" "}
            {error.resetAt && (
              <>
                The limit resets at{" "}
                <strong className="font-medium text-foreground">
                  {error.resetAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                </strong>{" "}
                ({relativeTime(error.resetAt)}).
              </>
            )}
          </>
        }
      >
        <Button onClick={onOpenToken}>
          <KeyRound /> {hasToken ? "Manage token" : "Add a token"}
        </Button>
        <Button variant="outline" onClick={onRetry}>
          <RefreshCw /> Try again
        </Button>
      </StateCard>
    );
  }

  if (error.kind === "bad_token") {
    return (
      <StateCard
        icon={<KeyRound className="size-6" aria-hidden="true" />}
        title="Token rejected"
        body={error.message}
      >
        <Button onClick={onOpenToken}>
          <KeyRound /> Manage token
        </Button>
      </StateCard>
    );
  }

  return (
    <StateCard
      icon={error.kind === "network" ? <WifiOff className="size-6" aria-hidden="true" /> : <AlertTriangle className="size-6" aria-hidden="true" />}
      title="Couldn't load this profile"
      body={error.message}
    >
      <Button variant="outline" onClick={onRetry}>
        <RefreshCw /> Try again
      </Button>
    </StateCard>
  );
}

function StateCard({
  icon,
  title,
  body,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  body: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <Card role="alert">
      <CardContent className="flex flex-col items-center gap-3 px-6 py-12 text-center">
        <div className="rounded-full bg-muted p-4 text-muted-foreground">{icon}</div>
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="max-w-lg text-sm text-muted-foreground">{body}</p>
        {children && <div className="mt-2 flex flex-wrap justify-center gap-2">{children}</div>}
      </CardContent>
    </Card>
  );
}

/* ---------- inline errors (one section failed) ---------- */

export function SectionError({
  what,
  error,
  onRetry,
  onOpenToken,
}: {
  what: string;
  error: GitHubError;
  onRetry: () => void;
  onOpenToken: () => void;
}) {
  const rate = error.kind === "rate_limit";
  return (
    <Card role="alert" className="border-destructive/40">
      <CardContent className="flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center">
        <AlertTriangle className="size-5 shrink-0 text-destructive" aria-hidden="true" />
        <div className="flex-1 text-sm">
          <p className="font-medium">
            {rate ? `Rate limit reached while loading ${what}` : `Couldn't load ${what}`}
          </p>
          <p className="text-muted-foreground">
            {rate && error.resetAt
              ? `Resets ${relativeTime(error.resetAt)}. A personal access token raises the limit.`
              : error.message}
          </p>
        </div>
        <div className="flex gap-2">
          {rate && (
            <Button size="sm" onClick={onOpenToken}>
              <KeyRound /> Add token
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={onRetry}>
            <RefreshCw /> Retry
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ---------- loading skeletons ---------- */

export function ProfileSkeleton() {
  return (
    <Card aria-hidden="true">
      <CardContent className="flex flex-col gap-6 p-6 sm:flex-row">
        <Skeleton className="size-28 shrink-0 rounded-full" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-full max-w-lg" />
          <Skeleton className="h-4 w-2/3 max-w-md" />
          <div className="flex flex-wrap gap-4 pt-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function StatsSkeleton() {
  return (
    <div aria-hidden="true" className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-5">
        <Skeleton className="h-64 lg:col-span-2" />
        <Skeleton className="h-64 lg:col-span-3" />
      </div>
    </div>
  );
}

export function ChartSkeleton({ className = "h-56" }: { className?: string }) {
  return <Skeleton className={className} />;
}

export function ReposSkeleton() {
  return (
    <div aria-hidden="true" className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Skeleton className="h-10 min-w-48 flex-1" />
        <Skeleton className="h-10 w-36" />
        <Skeleton className="h-10 w-36" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    </div>
  );
}

export function ActivitySkeleton() {
  return (
    <div aria-hidden="true" className="space-y-5">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex gap-3">
          <Skeleton className="size-8 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
