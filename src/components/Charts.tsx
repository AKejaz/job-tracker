"use client";

import { useMemo } from "react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

type Application = { applied_at: string; medium: string | null; status: string };

const MEDIUM_LABELS: Record<string, string> = {
  linkedin: "LinkedIn",
  indeed: "Indeed",
  email: "Email",
  company_site: "Company site",
  other: "Other",
};

export function TrendChart({ apps, days }: { apps: Application[]; days: number }) {
  const data = useMemo(() => {
    const counts: Record<string, number> = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 86400000);
      counts[d.toISOString().slice(0, 10)] = 0;
    }
    for (const a of apps) {
      const key = new Date(a.applied_at).toISOString().slice(0, 10);
      if (key in counts) counts[key] += 1;
    }
    return Object.entries(counts).map(([date, count]) => ({
      date: date.slice(5), // MM-DD
      count,
    }));
  }, [apps, days]);

  return (
    <div className="rounded-lg border p-4" style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
      <h2 className="font-display mb-3 text-sm font-semibold" style={{ color: "var(--text-high)" }}>
        Applications over time
      </h2>
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="goldFade" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--blue)" stopOpacity={0.5} />
              <stop offset="100%" stopColor="var(--blue)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
          <XAxis dataKey="date" stroke="var(--text-low)" fontSize={10} tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis stroke="var(--text-low)" fontSize={10} tickLine={false} axisLine={false} width={24} allowDecimals={false} />
          <Tooltip
            contentStyle={{ background: "var(--app-bg)", border: "1px solid var(--line)", borderRadius: 6, fontSize: 12 }}
            labelStyle={{ color: "var(--text-high)" }}
          />
          <Area type="monotone" dataKey="count" stroke="var(--blue)" strokeWidth={2} fill="url(#goldFade)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MediumBreakdownChart({ apps }: { apps: Application[] }) {
  const data = useMemo(() => {
    const counts: Record<string, number> = { linkedin: 0, indeed: 0, email: 0, company_site: 0, other: 0 };
    for (const a of apps) {
      const key = (a.medium ?? "other").toLowerCase();
      counts[key in counts ? key : "other"] += 1;
    }
    return Object.entries(counts).map(([medium, count]) => ({
      medium: MEDIUM_LABELS[medium] ?? medium,
      count,
    }));
  }, [apps]);

  return (
    <div className="rounded-lg border p-4" style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
      <h2 className="font-display mb-3 text-sm font-semibold" style={{ color: "var(--text-high)" }}>
        By medium
      </h2>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} layout="vertical" margin={{ left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" horizontal={false} />
          <XAxis type="number" stroke="var(--text-low)" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
          <YAxis type="category" dataKey="medium" stroke="var(--text-low)" fontSize={11} tickLine={false} axisLine={false} width={80} />
          <Tooltip
            contentStyle={{ background: "var(--app-bg)", border: "1px solid var(--line)", borderRadius: 6, fontSize: 12 }}
            cursor={{ fill: "var(--app-bg)" }}
          />
          <Bar dataKey="count" fill="var(--blue)" radius={[0, 4, 4, 0]} barSize={14} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ConversionFunnel({ apps }: { apps: Application[] }) {
  const stages = useMemo(() => {
    const total = apps.length;
    const interview = apps.filter((a) => ["interview", "offer", "rejected"].includes(a.status) || a.status === "interview").length;
    const interviewed = apps.filter((a) => a.status === "interview" || a.status === "offer").length;
    const offered = apps.filter((a) => a.status === "offer").length;
    return [
      { label: "Applied", value: total, color: "var(--blue)" },
      { label: "Interview", value: interviewed, color: "#c98a32" },
      { label: "Offer", value: offered, color: "var(--green)" },
    ];
  }, [apps]);

  const max = Math.max(1, stages[0].value);

  return (
    <div className="rounded-lg border p-4" style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
      <h2 className="font-display mb-3 text-sm font-semibold" style={{ color: "var(--text-high)" }}>
        Funnel
      </h2>
      <div className="space-y-3">
        {stages.map((s) => (
          <div key={s.label}>
            <div className="mb-1 flex justify-between font-data text-xs" style={{ color: "var(--text-low)" }}>
              <span>{s.label}</span>
              <span style={{ color: "var(--text-high)" }}>{s.value}</span>
            </div>
            <div className="h-2 rounded-full" style={{ background: "var(--app-bg)" }}>
              <div
                className="h-2 rounded-full transition-all"
                style={{ width: `${(s.value / max) * 100}%`, background: s.color }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
