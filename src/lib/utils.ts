import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });
const full = new Intl.NumberFormat("en");
export const formatCompact = (n: number) => compact.format(n);
export const formatNumber = (n: number) => full.format(n);

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 31_536_000],
  ["month", 2_592_000],
  ["week", 604_800],
  ["day", 86_400],
  ["hour", 3_600],
  ["minute", 60],
];

export function relativeTime(input: string | Date, now = Date.now()): string {
  const t = typeof input === "string" ? new Date(input).getTime() : input.getTime();
  if (Number.isNaN(t)) return "";
  const diff = (t - now) / 1000;
  const abs = Math.abs(diff);
  for (const [unit, secs] of UNITS) {
    if (abs >= secs) return rtf.format(Math.round(diff / secs), unit);
  }
  return "just now";
}

export function formatDate(input: string): string {
  return new Date(input).toLocaleDateString("en", { year: "numeric", month: "short", day: "numeric" });
}

export function formatDateTime(input: string): string {
  return new Date(input).toLocaleString("en", { dateStyle: "medium", timeStyle: "short" });
}

/** Add a protocol to bare domains from the profile's "blog" field. */
export function normalizeUrl(raw: string): string {
  const v = raw.trim();
  if (!v) return "";
  return /^https?:\/\//i.test(v) ? v : `https://${v}`;
}

export function displayUrl(raw: string): string {
  return raw.replace(/^https?:\/\//i, "").replace(/\/$/, "");
}

/** GitHub usernames: alphanumerics and single hyphens, up to 39 chars. */
export function isValidUsername(v: string): boolean {
  return /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i.test(v);
}

const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
  Python: "#3572a5",
  Java: "#b07219",
  Go: "#00add8",
  Rust: "#dea584",
  C: "#8a8a8a",
  "C++": "#f34b7d",
  "C#": "#178600",
  Ruby: "#cc342d",
  PHP: "#4f5d95",
  Swift: "#f05138",
  Kotlin: "#a97bff",
  Dart: "#00b4ab",
  Shell: "#89e051",
  HTML: "#e34c26",
  CSS: "#7b5cc4",
  SCSS: "#c6538c",
  Vue: "#41b883",
  Svelte: "#ff3e00",
  Lua: "#3b4a9c",
  "Jupyter Notebook": "#da5b0b",
  Nix: "#7e7eff",
  Zig: "#ec915c",
  Elixir: "#6e4a7e",
  Haskell: "#5e5086",
  Scala: "#c22d40",
  "Objective-C": "#438eff",
  Makefile: "#427819",
  Dockerfile: "#384d54",
  Vim: "#199f4b",
  "Vim Script": "#199f4b",
  R: "#198ce7",
  TeX: "#3d6117",
  Assembly: "#6e4c13",
  Perl: "#0298c3",
  MDX: "#fcb32c",
};

export function languageColor(lang: string): string {
  if (LANGUAGE_COLORS[lang]) return LANGUAGE_COLORS[lang];
  let h = 0;
  for (let i = 0; i < lang.length; i++) h = (h * 31 + lang.charCodeAt(i)) % 360;
  return `hsl(${h} 55% 52%)`;
}

/** Local-calendar-day key (YYYY-MM-DD) so heatmap cells match the viewer's timezone. */
export function dayKey(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}
