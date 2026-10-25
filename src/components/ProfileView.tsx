import { useState, type ReactNode } from "react";
import { ActivityFeed } from "@/components/ActivityFeed";
import { ContributionHeatmap } from "@/components/charts/ContributionHeatmap";
import { StarsBar } from "@/components/charts/StarsBar";
import { ProfileCard } from "@/components/ProfileCard";
import { RepoBrowser } from "@/components/RepoBrowser";
import { RepoDrawer } from "@/components/RepoDrawer";
import {
  ActivitySkeleton,
  ChartSkeleton,
  ProfileSkeleton,
  ReposSkeleton,
  SectionError,
  StatsSkeleton,
} from "@/components/States";
import { StatsDashboard } from "@/components/StatsDashboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Load } from "@/hooks/useProfile";
import type { GHEvent, GHRepo, GHUser } from "@/lib/github";

interface Props {
  user: Load<GHUser>;
  repos: Load<GHRepo[]>;
  events: Load<GHEvent[]>;
  onRetry: () => void;
  onOpenToken: () => void;
}

function Section({ id, title, description, children }: { id: string; title: string; description?: string; children: ReactNode }) {
  return (
    <section aria-labelledby={`${id}-heading`} className="space-y-4">
      <div>
        <h2 id={`${id}-heading`} className="text-xl font-semibold tracking-tight">
          {title}
        </h2>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  );
}

export function ProfileView({ user, repos, events, onRetry, onOpenToken }: Props) {
  const [selected, setSelected] = useState<GHRepo | null>(null);

  if (user.status !== "done" || !user.data) return <ProfileSkeleton />;
  const u = user.data;
  const repoData = repos.data ?? [];

  return (
    <div className="space-y-10">
      <ProfileCard user={u} />

      <Section id="stats" title="Profile stats" description="Aggregated across the user's own public repositories.">
        {repos.status === "error" && repos.error ? (
          <SectionError what="repository stats" error={repos.error} onRetry={onRetry} onOpenToken={onOpenToken} />
        ) : repos.status === "done" ? (
          <StatsDashboard repos={repoData} totalPublicRepos={u.public_repos} onOpenRepo={setSelected} />
        ) : (
          <StatsSkeleton />
        )}
      </Section>

      <Section id="analytics" title="Visual analytics" description="Activity and popularity at a glance.">
        <div className="grid gap-4 lg:grid-cols-5">
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>Contribution heatmap</CardTitle>
              <CardDescription>Commits and other contributions per day, from public events</CardDescription>
            </CardHeader>
            <CardContent>
              {events.status === "error" && events.error ? (
                <SectionError what="activity" error={events.error} onRetry={onRetry} onOpenToken={onOpenToken} />
              ) : events.status === "done" ? (
                <ContributionHeatmap events={events.data ?? []} />
              ) : (
                <ChartSkeleton />
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Repos by stars</CardTitle>
              <CardDescription>Top 8 — click a bar to open the repo</CardDescription>
            </CardHeader>
            <CardContent>
              {repos.status === "error" && repos.error ? (
                <SectionError what="repositories" error={repos.error} onRetry={onRetry} onOpenToken={onOpenToken} />
              ) : repos.status === "done" ? (
                <StarsBar repos={repoData} onOpen={setSelected} />
              ) : (
                <ChartSkeleton />
              )}
            </CardContent>
          </Card>
        </div>
      </Section>

      <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Section id="repos" title="Repositories" description={`${u.public_repos} public ${u.public_repos === 1 ? "repository" : "repositories"}`}>
          {repos.status === "error" && repos.error ? (
            <SectionError what="repositories" error={repos.error} onRetry={onRetry} onOpenToken={onOpenToken} />
          ) : repos.status === "done" ? (
            <RepoBrowser key={u.login} repos={repoData} onOpen={setSelected} />
          ) : (
            <ReposSkeleton />
          )}
        </Section>

        <Section id="activity" title="Recent activity" description="From GitHub's public events feed">
          <Card>
            <CardContent className="p-5">
              {events.status === "error" && events.error ? (
                <SectionError what="activity" error={events.error} onRetry={onRetry} onOpenToken={onOpenToken} />
              ) : events.status === "done" ? (
                <ActivityFeed key={u.login} events={events.data ?? []} />
              ) : (
                <ActivitySkeleton />
              )}
            </CardContent>
          </Card>
        </Section>
      </div>

      <RepoDrawer repo={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
