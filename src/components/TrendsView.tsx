"use client";

import { useMemo } from "react";
import { TrendChart, DayOfWeekChart } from "@/components/Charts";

type Application = { applied_at: string; medium: string | null; status: string };

export default function TrendsView({ apps }: { apps: Application[] }) {
  const stats = useMemo(() => {
    const days = new Set(apps.map((a) => new Date(a.applied_at).toISOString().slice(0, 10)));
    const span = days.size;
    const avgPerActiveDay = span > 0 ? (apps.length / span).toFixed(1) : "0";

    const byWeekday = new Array(7).fill(0);
    for (const a of apps) byWeekday[new Date(a.applied_at).getDay()] += 1;
    const labels = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const bestDayIdx = byWeekday.indexOf(Math.max(...byWeekday));

    return { activeDays: span, avgPerActiveDay, bestDay: labels[bestDayIdx] };
  }, [apps]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-xl font-bold" style={{ color: "var(--text-high)" }}>Trends</h1>
        <p className="text-xs" style={{ color: "var(--text-faint)" }}>How your application activity moves over time</p>
      </div>

      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3">
        <StatCard label="Active days" value={stats.activeDays} />
        <StatCard label="Avg per active day" value={stats.avgPerActiveDay} />
        <StatCard label="Most active day" value={stats.bestDay} />
      </div>

      <TrendChart apps={apps} days={90} />
      <DayOfWeekChart apps={apps} />
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border p-4" style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
      <p className="text-xs font-medium" style={{ color: "var(--text-low)" }}>{label}</p>
      <p className="font-display mt-1 text-xl font-bold" style={{ color: "var(--text-high)" }}>{value}</p>
    </div>
  );
}
