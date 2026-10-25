import { useState } from "react";
import { AtSign, Building2, CalendarDays, Check, ExternalLink, Link2, MapPin, Share2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { GHUser } from "@/lib/github";
import { displayUrl, formatCompact, formatDate, formatNumber, normalizeUrl } from "@/lib/utils";

export function ProfileCard({ user }: { user: GHUser }) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const url = `${location.origin}${location.pathname}?user=${encodeURIComponent(user.login)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt("Copy this shareable link", url);
    }
  };

  const meta: { icon: typeof MapPin; label: string; content: React.ReactNode }[] = [];
  if (user.company) meta.push({ icon: Building2, label: "Company", content: user.company });
  if (user.location) meta.push({ icon: MapPin, label: "Location", content: user.location });
  if (user.blog?.trim()) {
    const href = normalizeUrl(user.blog);
    meta.push({
      icon: Link2,
      label: "Website",
      content: (
        <a href={href} target="_blank" rel="noopener noreferrer nofollow" className="hover:underline">
          {displayUrl(user.blog.trim())}
        </a>
      ),
    });
  }
  if (user.twitter_username) {
    meta.push({
      icon: AtSign,
      label: "Twitter / X",
      content: (
        <a
          href={`https://x.com/${encodeURIComponent(user.twitter_username)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline"
        >
          @{user.twitter_username}
        </a>
      ),
    });
  }
  meta.push({
    icon: CalendarDays,
    label: "Joined",
    content: <time dateTime={user.created_at}>Joined {formatDate(user.created_at)}</time>,
  });

  const counts = [
    { label: "Followers", value: user.followers },
    { label: "Following", value: user.following },
    { label: "Public repos", value: user.public_repos },
    { label: "Public gists", value: user.public_gists },
  ];

  return (
    <Card>
      <CardContent className="flex flex-col gap-6 p-6 sm:flex-row">
        <img
          src={user.avatar_url}
          alt={`${user.login}'s avatar`}
          width={112}
          height={112}
          className="size-28 shrink-0 rounded-full border bg-muted"
        />

        <div className="min-w-0 flex-1 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="flex flex-wrap items-center gap-2 text-2xl font-semibold leading-tight">
                <span className="break-words">{user.name || user.login}</span>
                {user.type !== "User" && <Badge variant="outline">{user.type}</Badge>}
              </h2>
              <a
                href={user.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:underline"
              >
                @{user.login}
              </a>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={share}>
                {copied ? <Check /> : <Share2 />}
                {copied ? "Link copied" : "Share link"}
              </Button>
              <Button size="sm" asChild>
                <a href={user.html_url} target="_blank" rel="noopener noreferrer">
                  GitHub <ExternalLink />
                </a>
              </Button>
            </div>
          </div>

          {user.bio && <p className="max-w-2xl whitespace-pre-line text-sm leading-relaxed">{user.bio}</p>}

          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
            {meta.map(({ icon: Icon, label, content }) => (
              <li key={label} className="flex items-center gap-1.5">
                <Icon className="size-4 shrink-0" aria-label={label} role="img" />
                <span>{content}</span>
              </li>
            ))}
          </ul>

          <dl className="grid grid-cols-2 gap-3 border-t pt-4 sm:grid-cols-4">
            {counts.map((c) => (
              <div key={c.label}>
                <dd className="text-xl font-semibold tabular" title={formatNumber(c.value)}>
                  {formatCompact(c.value)}
                </dd>
                <dt className="text-xs text-muted-foreground">{c.label}</dt>
              </div>
            ))}
          </dl>
        </div>
      </CardContent>
    </Card>
  );
}
