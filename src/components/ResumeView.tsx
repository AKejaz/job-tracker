"use client";

import { useState } from "react";
import CvAnalyzerWidget from "@/components/CvAnalyzerWidget";

type ResumeService = "cv_analyzer";

const SERVICES: { value: ResumeService; label: string }[] = [
  { value: "cv_analyzer", label: "CV Analyzer" },
  // Future services (CV tailoring, etc.) get added here — no structural changes needed elsewhere.
];

export default function ResumeView() {
  const [service, setService] = useState<ResumeService>("cv_analyzer");

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold" style={{ color: "var(--text-high)" }}>Resume</h1>
          <p className="text-xs" style={{ color: "var(--text-faint)" }}>
            AI-powered tools for your CV and job applications.
          </p>
        </div>
        <select
          value={service}
          onChange={(e) => setService(e.target.value as ResumeService)}
          className="rounded-md border px-2.5 py-1.5 text-sm"
          style={{ borderColor: "var(--line)", background: "var(--surface)", color: "var(--text-high)" }}
        >
          {SERVICES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      <div className="mt-4">
        {service === "cv_analyzer" && <CvAnalyzerWidget />}
      </div>
    </div>
  );
}
