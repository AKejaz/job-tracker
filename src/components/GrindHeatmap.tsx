"use client";

import { useMemo } from "react";

type Props = {
  dates: string[]; // ISO date strings, one entry per application
};

const WEEKS = 12;
const DAY_MS = 86400000;

export default function GrindHeatmap({ dates }: Props) {
  const { cells, max } = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const d of dates) {
      const key = new Date(d).toISOString().slice(0, 10);
      counts[key] = (counts[key] ?? 0) + 1;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const totalDays = WEEKS * 7;
    const start = new Date(today.getTime() - (totalDays - 1) * DAY_MS);
    // align to start of week (Sunday)
    start.setDate(start.getDate() - start.getDay());

    const cells: { date: string; count: number }[] = [];
    let max = 1;
    for (let i = 0; i < WEEKS * 7; i++) {
      const d = new Date(start.getTime() + i * DAY_MS);
      const key = d.toISOString().slice(0, 10);
      const count = counts[key] ?? 0;
      max = Math.max(max, count);
      cells.push({ date: key, count });
    }
    return { cells, max };
  }, [dates]);

  function intensity(count: number) {
    if (count === 0) return "var(--surface)";
    const ratio = count / max;
    if (ratio > 0.75) return "var(--gold)";
    if (ratio > 0.45) return "#c98a32";
    if (ratio > 0.15) return "#8a6326";
    return "#4a3a1f";
  }

  // group into columns of 7 (weeks)
  const weeks: { date: string; count: number }[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const totalThisRange = dates.length;

  return (
    <div className="rounded-lg border p-4" style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-sm font-semibold" style={{ color: "var(--text-high)" }}>
          The grind, last {WEEKS} weeks
        </h2>
        <span className="font-data text-xs" style={{ color: "var(--text-low)" }}>
          {totalThisRange} applications logged
        </span>
      </div>
      <div className="flex gap-1 overflow-x-auto pb-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {week.map((cell) => (
              <div
                key={cell.date}
                title={`${cell.date}: ${cell.count} application${cell.count === 1 ? "" : "s"}`}
                className="h-3 w-3 rounded-sm transition-transform hover:scale-125"
                style={{ background: intensity(cell.count) }}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-1.5 text-[10px]" style={{ color: "var(--text-low)" }}>
        <span>Less</span>
        {["var(--surface-raised)", "#4a3a1f", "#8a6326", "#c98a32", "var(--gold)"].map((c, i) => (
          <span key={i} className="h-2.5 w-2.5 rounded-sm" style={{ background: c }} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
