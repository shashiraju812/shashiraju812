# GitHub Profile Explorer

Search any public GitHub user and explore their profile, repositories, stats, activity and contribution heatmap — all fetched live from GitHub's public REST API, directly in the browser (no backend).

**Shareable links:** `/?user=torvalds` loads a profile straight away.

## Features

- **Profile lookup** — avatar, name, bio, company, location, website, Twitter/X, followers/following, public repo count, join date, copy-link button.
- **Stats dashboard** — total stars, forks, watchers and open issues across the user's repos, language donut, top-repo highlights.
- **Repository browser** — keyword search (name, description, topics), sort by stars / updated / name, language filter, fork toggle, and a detail drawer that renders the repo README.
- **Activity feed** — pushes (with commit messages), pull requests, issues, stars, releases, branches and more, with relative timestamps and per-type filters.
- **Analytics** — GitHub-style contribution heatmap from public events, language donut, repos-by-stars bar chart.
- **Quick start** — suggested notable profiles, local recent-search history (one-click re-run), loading skeletons, empty state, and clear "user not found" and rate-limit states.
- **Polished UI** — shadcn/ui-style components on Tailwind, light/dark theme toggle, responsive layout, keyboard friendly (press `/` to focus search), semantic and accessible markup.
- **Optional token** — paste a GitHub personal access token (no scopes needed) to raise the limit from 60 to 5,000 requests/hour. It is stored only in your browser's `localStorage` and sent only to `api.github.com`.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build in dist/
```

## Notes on the data

- GitHub's events API only exposes the **last 90 days / 300 events**, so the heatmap covers that window rather than a full year.
- GitHub's repos API reports `watchers_count` equal to the star count; the "watchers" total mirrors that.
- If a push event doesn't include commit messages, the feed looks up the head commit for the first few visible pushes (a handful of extra API calls).
- Repos: the first 500 public repos (most recently pushed) are loaded.

## Deploying to GitHub Pages

Set `base` in `vite.config.ts` to `"/<repo-name>/"`, run `npm run build`, and publish `dist/`.
Note that `?user=` links work on Pages because the app reads the query string client-side.

## Stack

React 18 · TypeScript · Vite · Tailwind CSS · Radix UI (dialog/sheet) · lucide-react · DOMPurify
