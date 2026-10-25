import { useState } from "react";
import type { LanguageSlice } from "@/lib/analytics";
import { languageColor } from "@/lib/utils";

const SIZE = 160;
const R = 56;
const STROKE = 24;
const C = 2 * Math.PI * R;

export function LanguageDonut({ slices }: { slices: LanguageSlice[] }) {
  const [active, setActive] = useState<number | null>(null);
  const total = slices.reduce((s, x) => s + x.value, 0);

  if (!total) {
    return <p className="py-10 text-center text-sm text-muted-foreground">No language data — this user has no original repos with a detected language.</p>;
  }

  const colorOf = (s: LanguageSlice) => (s.label === "Other" ? "#9ca3af" : languageColor(s.label));
  const pct = (v: number) => `${((v / total) * 100).toFixed(v / total < 0.1 ? 1 : 0)}%`;

  let acc = 0;
  const focus = active !== null ? slices[active] : null;

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="size-40 shrink-0"
        role="img"
        aria-label={`Language breakdown: ${slices.map((s) => `${s.label} ${pct(s.value)}`).join(", ")}`}
      >
        <g transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
          {slices.map((s, i) => {
            const len = (s.value / total) * C;
            const gap = slices.length > 1 ? Math.min(2, len * 0.5) : 0;
            const circle = (
              <circle
                key={s.label}
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={R}
                fill="none"
                stroke={colorOf(s)}
                strokeWidth={active === i ? STROKE + 4 : STROKE}
                strokeDasharray={`${len - gap} ${C - len + gap}`}
                strokeDashoffset={-acc}
                opacity={active === null || active === i ? 1 : 0.3}
                style={{ transition: "opacity .15s, stroke-width .15s" }}
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive(null)}
              />
            );
            acc += len;
            return circle;
          })}
        </g>
        <text x="50%" y="46%" textAnchor="middle" className="fill-foreground text-xl font-semibold">
          {focus ? pct(focus.value) : total}
        </text>
        <text x="50%" y="60%" textAnchor="middle" className="fill-muted-foreground text-[9px]">
          {focus ? focus.label : total === 1 ? "repository" : "repositories"}
        </text>
      </svg>

      <ul className="grid w-full flex-1 gap-1.5 text-sm">
        {slices.map((s, i) => (
          <li
            key={s.label}
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => setActive(null)}
            className={`flex items-center gap-2 rounded-md px-2 py-1 transition-colors ${active === i ? "bg-muted" : ""}`}
          >
            <span aria-hidden="true" className="size-3 shrink-0 rounded-full" style={{ background: colorOf(s) }} />
            <span className="flex-1 truncate">{s.label}</span>
            <span className="tabular text-muted-foreground">{s.value}</span>
            <span className="tabular w-10 text-right font-medium">{pct(s.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
