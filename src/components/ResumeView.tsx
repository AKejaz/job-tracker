"use client";

import CvAnalyzerWidget from "@/components/CvAnalyzerWidget";
import type { ResumeService } from "@/components/Sidebar";

const SERVICE_LABELS: Record<ResumeService, string> = {
  cv_analyzer: "CV Analyzer",
};

const SERVICE_DESCRIPTIONS: Record<ResumeService, string> = {
  cv_analyzer:
    "Upload or paste your CV for a full breakdown — strengths, issues, an overall score, and what to do next. Optionally add a target role or job description for a more precise read.",
};

export default function ResumeView({ service }: { service: ResumeService }) {
  return (
    <div>
      <div>
        <h1 className="font-display text-xl font-bold" style={{ color: "var(--text-high)" }}>
          {SERVICE_LABELS[service]}
        </h1>
        <p className="mt-0.5 text-xs" style={{ color: "var(--text-faint)" }}>
          {SERVICE_DESCRIPTIONS[service]}
        </p>
      </div>

      <div className="mt-4">
        {service === "cv_analyzer" && <CvAnalyzerWidget />}
      </div>
    </div>
  );
}
