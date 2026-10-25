import { useMemo } from "react";
import { buildHeatmap } from "@/lib/analytics";
import type { GHEvent } from "@/lib/github";
import { formatNumber } from "@/lib/utils";

const CELL = 12;
const GAP = 3;
const STEP = CELL + GAP;
const LEFT = 30;
const TOP = 20;
const WEEKS = 20;
const DAY_LABELS: [number, string][] = [
  [1, "Mon"],
  [3, "Wed"],
  [5, "Fri"],
];

export function ContributionHeatmap({ events }: { events: GHEvent[] }) {
  const data = useMemo(() => buildHeatmap(events, WEEKS), [events]);
  const width = LEFT + data.weeks.length * STEP - GAP;
  const height = TOP + 7 * STEP - GAP;

  const monthLabels = useMemo(() => {
    const out: { x: number; label: string }[] = [];
    let lastMonth = -1;
    let lastIdx = -10;
    data.weeks.forEach((col, i) => {
      const m = col[0].date.getMonth();
      if (m !== lastMonth && i - lastIdx >= 3) {
        out.push({ x: LEFT + i * STEP, label: col[0].date.toLocaleDateString("en", { month: "short" }) });
        lastIdx = i;
      }
      lastMonth = m;
    });
    return out;
  }, [data]);

  const summary = `${formatNumber(data.total)} contributions on ${data.activeDays} active days since ${data.windowStart.toLocaleDateString("en", { dateStyle: "medium" })}`;

  return (
    <div>
      <p className="mb-3 text-sm">
        <strong className="text-lg font-semibold tabular">{formatNumber(data.total)}</strong>{" "}
        <span className="text-muted-foreground">
          contributions across {data.activeDays} active {data.activeDays === 1 ? "day" : "days"}
        </span>
      </p>

      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full min-w-[420px] max-w-2xl text-muted-foreground"
          role="img"
          aria-label={`Contribution heatmap. ${summary}.`}
        >
          {monthLabels.map((m) => (
            <text key={m.x} x={m.x} y={10} fontSize={9} fill="currentColor">
              {m.label}
            </text>
          ))}
          {DAY_LABELS.map(([row, label]) => (
            <text key={label} x={0} y={TOP + row * STEP + CELL - 2} fontSize={9} fill="currentColor">
              {label}
            </text>
          ))}
          {data.weeks.map((col, w) =>
            col.map((cell, d) =>
              cell.inFuture ? null : (
                <rect
                  key={cell.key}
                  x={LEFT + w * STEP}
                  y={TOP + d * STEP}
                  width={CELL}
                  height={CELL}
                  rx={2.5}
                  style={{ fill: `hsl(var(--heat-${cell.level}))` }}
                >
                  <title>
                    {cell.count === 0
                      ? "No contributions"
                      : `${cell.count} contribution${cell.count === 1 ? "" : "s"}`}{" "}
                    on {cell.date.toLocaleDateString("en", { dateStyle: "medium" })}
                  </title>
                </rect>
              ),
            ),
          )}
        </svg>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <p>Built from public events (pushes, PRs, issues, reviews, new branches) — GitHub exposes at most the last 90 days.</p>
        <div className="flex items-center gap-1.5" aria-hidden="true">
          Less
          {[0, 1, 2, 3, 4].map((l) => (
            <span key={l} className="size-3 rounded-[3px]" style={{ background: `hsl(var(--heat-${l}))` }} />
          ))}
          More
        </div>
      </div>
    </div>
  );
}
