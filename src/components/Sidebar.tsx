"use client";

import GoalWidget from "@/components/GoalWidget";

export type View = "dashboard" | "analytics" | "trends";

type Application = { applied_at: string };

export default function Sidebar({
  userEmail, view, onChange, apps,
}: { userEmail?: string; view: View; onChange: (v: View) => void; apps: Application[] }) {
  return (
    <aside className="hidden h-screen w-56 flex-col justify-between px-4 py-5 lg:flex" style={{ background: "var(--sidebar-bg)" }}>
      <div>
        <div className="flex items-center gap-2 px-2">
          <div className="font-display flex h-7 w-7 items-center justify-center rounded-md text-sm font-bold text-white" style={{ background: "var(--blue)" }}>
            J
          </div>
          <span className="font-display text-sm font-bold text-white">JobTrack</span>
        </div>

        <nav className="mt-8 space-y-6">
          <div>
            <p className="px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Overview</p>
            <div className="mt-2 space-y-0.5">
              <NavItem label="Dashboard" active={view === "dashboard"} onClick={() => onChange("dashboard")} />
            </div>
          </div>

          <div>
            <p className="px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Reports</p>
            <div className="mt-2 space-y-0.5">
              <NavItem label="Analytics" active={view === "analytics"} onClick={() => onChange("analytics")} />
              <NavItem label="Trends" active={view === "trends"} onClick={() => onChange("trends")} />
            </div>
          </div>
        </nav>
      </div>

      <div className="space-y-3">
        <GoalWidget apps={apps} />
        <div className="flex items-center gap-2 rounded-md px-2 py-2" style={{ background: "var(--sidebar-bg-active)" }}>
          <div className="font-display flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: "var(--purple)" }}>
            {(userEmail ?? "?").slice(0, 1).toUpperCase()}
          </div>
          <p className="truncate text-xs font-medium text-white">{userEmail ?? "Signed in"}</p>
        </div>
      </div>
    </aside>
  );
}

function NavItem({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full rounded-md px-2.5 py-1.5 text-left text-sm font-medium transition-colors"
      style={active ? { background: "var(--sidebar-bg-active)", color: "white" } : { color: "#9aa4bf" }}
    >
      {label}
    </button>
  );
}
