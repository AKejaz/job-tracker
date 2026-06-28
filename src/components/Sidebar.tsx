"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import GoalWidget from "@/components/GoalWidget";

export type View = "dashboard" | "analytics" | "trends" | "resume" | "extension";
export type ResumeService = "cv_analyzer";

export const RESUME_SERVICES: { value: ResumeService; label: string }[] = [
  { value: "cv_analyzer", label: "CV Analyzer" },
  // Add future services here — they'll appear automatically in the sidebar sub-nav.
];

type Application = { applied_at: string };

export default function Sidebar({
  userEmail,
  view,
  onChange,
  apps,
  resumeService,
  onResumeServiceChange,
}: {
  userEmail?: string;
  view: View;
  onChange: (v: View) => void;
  apps: Application[];
  resumeService: ResumeService;
  onResumeServiceChange: (s: ResumeService) => void;
}) {
  const [resumeExpanded, setResumeExpanded] = useState(view === "resume");

  function handleResumeParentClick() {
    if (resumeExpanded) {
      setResumeExpanded(false);
    } else {
      setResumeExpanded(true);
      onChange("resume");
    }
  }

  function handleResumeServiceClick(service: ResumeService) {
    onChange("resume");
    onResumeServiceChange(service);
    setResumeExpanded(true);
  }

  return (
    <aside
      className="hidden h-screen w-56 flex-col justify-between px-4 py-5 lg:flex"
      style={{ background: "var(--sidebar-bg)" }}
    >
      <div>
        {/* Logo */}
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

          <div>
            <p className="px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Tools</p>
            <div className="mt-2 space-y-0.5">

              {/* Resume — expandable parent */}
              <button
                onClick={handleResumeParentClick}
                className="flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-sm font-medium transition-colors"
                style={
                  resumeExpanded
                    ? { background: "var(--sidebar-bg-active)", color: "white" }
                    : { color: "#9aa4bf" }
                }
              >
                <span>Resume</span>
                <ChevronDown
                  className="h-3.5 w-3.5 shrink-0 transition-transform"
                  style={{ transform: resumeExpanded ? "rotate(0deg)" : "rotate(-90deg)" }}
                />
              </button>

              {/* Sub-nav — only visible when expanded */}
              {resumeExpanded && (
                <div className="ml-3 space-y-0.5 border-l pl-2.5" style={{ borderColor: "var(--sidebar-bg-active)" }}>
                  {RESUME_SERVICES.map((s) => (
                    <button
                      key={s.value}
                      onClick={() => handleResumeServiceClick(s.value)}
                      className="w-full rounded-md px-2 py-1.5 text-left text-xs font-medium transition-colors"
                      style={
                        resumeService === s.value
                          ? { color: "white", background: "rgba(255,255,255,0.08)" }
                          : { color: "#7a8499" }
                      }
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              )}

              <NavItem label="Extension" active={view === "extension"} onClick={() => onChange("extension")} />
            </div>
          </div>
        </nav>
      </div>

      <div className="space-y-3">
        <GoalWidget apps={apps} />
        <div
          className="flex items-center gap-2 rounded-md px-2 py-2"
          style={{ background: "var(--sidebar-bg-active)" }}
        >
          <div
            className="font-display flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
            style={{ background: "var(--purple)" }}
          >
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