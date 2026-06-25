"use client";

const NAV_OVERVIEW = [{ label: "Dashboard", active: true }];
const NAV_REPORTS = ["Analytics", "Trends"];

export default function Sidebar({ userEmail }: { userEmail?: string }) {
  return (
    <aside
      className="hidden h-screen w-56 flex-col justify-between px-4 py-5 lg:flex"
      style={{ background: "var(--sidebar-bg)" }}
    >
      <div>
        <div className="flex items-center gap-2 px-2">
          <div
            className="font-display flex h-7 w-7 items-center justify-center rounded-md text-sm font-bold text-white"
            style={{ background: "var(--blue)" }}
          >
            J
          </div>
          <span className="font-display text-sm font-bold text-white">JobTrack</span>
        </div>

        <nav className="mt-8 space-y-6">
          <div>
            <p className="px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Overview</p>
            <div className="mt-2 space-y-0.5">
              {NAV_OVERVIEW.map((item) => (
                <div
                  key={item.label}
                  className="rounded-md px-2.5 py-1.5 text-sm font-medium"
                  style={
                    item.active
                      ? { background: "var(--sidebar-bg-active)", color: "white" }
                      : { color: "#9aa4bf" }
                  }
                >
                  {item.label}
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Reports</p>
            <div className="mt-2 space-y-0.5">
              {NAV_REPORTS.map((label) => (
                <div key={label} className="rounded-md px-2.5 py-1.5 text-sm font-medium" style={{ color: "#9aa4bf" }}>
                  {label}
                </div>
              ))}
            </div>
          </div>
        </nav>
      </div>

      <div className="flex items-center gap-2 rounded-md px-2 py-2" style={{ background: "var(--sidebar-bg-active)" }}>
        <div
          className="font-display flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
          style={{ background: "var(--purple)" }}
        >
          {(userEmail ?? "?").slice(0, 1).toUpperCase()}
        </div>
        <p className="truncate text-xs font-medium text-white">{userEmail ?? "Signed in"}</p>
      </div>
    </aside>
  );
}
