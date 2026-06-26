"use client";

import { useEffect, useMemo, useState } from "react";

const DAILY_GOAL = 20;
const MONTHLY_GOAL = 600;

type Application = { applied_at: string };

export default function GoalWidget({ apps }: { apps: Application[] }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []); // trigger ring animation after first paint

  const { today, thisMonth } = useMemo(() => {
    const now = new Date();
    const todayKey = now.toISOString().slice(0, 10);
    const monthKey = now.toISOString().slice(0, 7);
    let today = 0, thisMonth = 0;
    for (const a of apps) {
      const iso = new Date(a.applied_at).toISOString();
      if (iso.slice(0, 10) === todayKey) today += 1;
      if (iso.slice(0, 7) === monthKey) thisMonth += 1;
    }
    return { today, thisMonth };
  }, [apps]);

  const dailyPct = Math.min(1, today / DAILY_GOAL);
  const monthlyPct = Math.min(1, thisMonth / MONTHLY_GOAL);

  const color =
    dailyPct >= 1 ? "var(--green)" :
    dailyPct >= 0.5 ? "var(--blue)" :
    dailyPct >= 0.25 ? "var(--amber)" : "var(--red)";

  const message =
    today >= DAILY_GOAL ? "Goal smashed — rest easy" :
    today >= DAILY_GOAL * 0.75 ? "Almost there" :
    today >= DAILY_GOAL * 0.4 ? "Keep going" :
    today === 0 ? "Let's get started" : "Behind pace today";

  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const offset = mounted ? circumference * (1 - dailyPct) : circumference;

  return (
    <div className="rounded-lg px-3 py-3.5" style={{ background: "var(--sidebar-bg-active)" }}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Today&apos;s goal</p>

      <div className="mt-2 flex items-center gap-3">
        <div className="relative h-[72px] w-[72px] shrink-0">
          <svg width="72" height="72" viewBox="0 0 72 72">
            <circle cx="36" cy="36" r={radius} fill="none" stroke="#232b40" strokeWidth="6" />
            <circle
              cx="36" cy="36" r={radius} fill="none"
              stroke={color} strokeWidth="6" strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              transform="rotate(-90 36 36)"
              style={{ transition: "stroke-dashoffset 1.1s cubic-bezier(0.16, 1, 0.3, 1), stroke 0.4s" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-base font-bold text-white">{today}</span>
            <span className="text-[10px] text-slate-500">/ {DAILY_GOAL}</span>
          </div>
        </div>

        <div className="min-w-0">
          <p className="text-xs font-medium leading-snug" style={{ color }}>{message}</p>
          <p className="mt-1 text-[10px] text-slate-500">{Math.round(dailyPct * 100)}% of daily target</p>
        </div>
      </div>

      <div className="mt-3.5">
        <div className="flex justify-between text-[10px] text-slate-500">
          <span>This month</span>
          <span>{thisMonth} / {MONTHLY_GOAL}</span>
        </div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full" style={{ background: "#232b40" }}>
          <div
            className="h-full rounded-full"
            style={{
              width: mounted ? `${monthlyPct * 100}%` : "0%",
              background: "var(--blue)",
              transition: "width 1.1s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          />
        </div>
      </div>
    </div>
  );
}
