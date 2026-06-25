"use client";

import { useMemo } from "react";
import { MediumBreakdownChart } from "@/components/Charts";

type Application = {
  id: string;
  company_name: string;
  medium: string | null;
  status: string;
  applied_at: string;
};

const MEDIUM_LABELS: Record<string, string> = {
  linkedin: "LinkedIn", indeed: "Indeed", email: "Email", company_site: "Company site", other: "Other",
};

export default function AnalyticsView({ apps }: { apps: Application[] }) {
  const channelStats = useMemo(() => {
    const mediums = ["linkedin", "indeed", "email", "company_site", "other"];
    return mediums.map((medium) => {
      const subset = apps.filter((a) => (a.medium ?? "other") === medium);
      const total = subset.length;
      const interview = subset.filter((a) => a.status === "interview" || a.status === "offer").length;
      const offer = subset.filter((a) => a.status === "offer").length;
      const rejected = subset.filter((a) => a.status === "rejected").length;
      return {
        medium,
        label: MEDIUM_LABELS[medium],
        total,
        interview,
        offer,
        rejected,
        responseRate: total > 0 ? Math.round((interview / total) * 100) : 0,
      };
    }).filter((c) => c.total > 0);
  }, [apps]);

  const topCompanies = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const a of apps) counts[a.company_name] = (counts[a.company_name] ?? 0) + 1;
    return Object.entries(counts)
      .filter(([, c]) => c > 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [apps]);

  const total = apps.length;
  const bestChannel = channelStats.slice().sort((a, b) => b.responseRate - a.responseRate)[0];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-xl font-bold" style={{ color: "var(--text-high)" }}>Analytics</h1>
        <p className="text-xs" style={{ color: "var(--text-faint)" }}>All-time performance breakdown, {total} applications logged</p>
      </div>

      {bestChannel && (
        <div className="rounded-xl border p-4" style={{ borderColor: "var(--line)", background: "var(--blue-bg)" }}>
          <p className="text-sm" style={{ color: "var(--blue)" }}>
            <strong>{bestChannel.label}</strong> is your best-converting channel at <strong>{bestChannel.responseRate}%</strong> response rate
            ({bestChannel.interview} of {bestChannel.total} applications got a response).
          </p>
        </div>
      )}

      <div className="rounded-xl border" style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
        <div className="px-5 py-4">
          <h2 className="font-display text-sm font-semibold" style={{ color: "var(--text-high)" }}>Channel performance</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase" style={{ color: "var(--text-faint)" }}>
              <tr className="border-t" style={{ borderColor: "var(--line)" }}>
                <th className="px-5 py-2.5 font-medium">Channel</th>
                <th className="px-5 py-2.5 font-medium">Applied</th>
                <th className="px-5 py-2.5 font-medium">Interviews</th>
                <th className="px-5 py-2.5 font-medium">Offers</th>
                <th className="px-5 py-2.5 font-medium">Rejected</th>
                <th className="px-5 py-2.5 font-medium">Response rate</th>
              </tr>
            </thead>
            <tbody>
              {channelStats.map((c) => (
                <tr key={c.medium} className="border-t" style={{ borderColor: "var(--line)" }}>
                  <td className="px-5 py-3 font-medium" style={{ color: "var(--text-high)" }}>{c.label}</td>
                  <td className="px-5 py-3" style={{ color: "var(--text-low)" }}>{c.total}</td>
                  <td className="px-5 py-3" style={{ color: "var(--text-low)" }}>{c.interview}</td>
                  <td className="px-5 py-3" style={{ color: "var(--text-low)" }}>{c.offer}</td>
                  <td className="px-5 py-3" style={{ color: "var(--text-low)" }}>{c.rejected}</td>
                  <td className="px-5 py-3 font-semibold" style={{ color: "var(--blue)" }}>{c.responseRate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <MediumBreakdownChart apps={apps} />
        <div className="rounded-xl border p-5" style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
          <h2 className="font-display text-sm font-semibold" style={{ color: "var(--text-high)" }}>Companies you've applied to more than once</h2>
          <div className="mt-4 space-y-2.5">
            {topCompanies.length === 0 && (
              <p className="text-xs" style={{ color: "var(--text-faint)" }}>No repeat applications yet.</p>
            )}
            {topCompanies.map(([name, count]) => (
              <div key={name} className="flex items-center justify-between text-sm">
                <span style={{ color: "var(--text-high)" }}>{name}</span>
                <span className="font-display font-semibold" style={{ color: "var(--text-low)" }}>{count}×</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
