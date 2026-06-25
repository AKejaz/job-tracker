"use client";

import { useMemo } from "react";

type Application = { status: string };

export default function PipelineFunnel({ apps }: { apps: Application[] }) {
  const stages = useMemo(() => {
    const total = apps.length;
    const interview = apps.filter((a) => a.status === "interview" || a.status === "offer").length;
    const offer = apps.filter((a) => a.status === "offer").length;
    return [
      { label: "Applied", value: total, color: "var(--blue)" },
      { label: "Interview", value: interview, color: "var(--amber)" },
      { label: "Offer", value: offer, color: "var(--green)" },
    ];
  }, [apps]);

  const total = stages[0].value || 1;

  return (
    <div className="rounded-xl border p-5" style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
      <h2 className="font-display text-sm font-semibold" style={{ color: "var(--text-high)" }}>
        Application pipeline
      </h2>
      <p className="mt-0.5 text-xs" style={{ color: "var(--text-low)" }}>
        Stage-by-stage conversion across all time
      </p>

      <div className="mt-6 grid grid-cols-3 gap-4">
        {stages.map((s) => (
          <div key={s.label}>
            <p className="font-display text-2xl font-bold" style={{ color: "var(--text-high)" }}>{s.value}</p>
            <p className="mt-1 text-xs font-medium" style={{ color: "var(--text-low)" }}>{s.label}</p>
            <p className="text-xs" style={{ color: "var(--text-faint)" }}>{Math.round((s.value / total) * 100)}%</p>
          </div>
        ))}
      </div>

      <div className="mt-5 flex h-2 overflow-hidden rounded-full" style={{ background: "#f1f2f5" }}>
        {stages.map((s) => (
          <div
            key={s.label}
            style={{ width: `${(s.value / total) * 100}%`, background: s.color }}
            className="h-full first:rounded-l-full last:rounded-r-full"
          />
        ))}
      </div>
    </div>
  );
}
