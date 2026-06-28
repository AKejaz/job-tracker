"use client";

import CvAnalyzerWidget from "@/components/CvAnalyzerWidget";
import CvTailorWidget from "@/components/CvTailorWidget";
import type { ResumeService } from "@/components/Sidebar";

const SERVICE_LABELS: Record<ResumeService, string> = {
  cv_analyzer: "CV Analyzer",
  cv_tailor: "Format CV for Role",
};

const SERVICE_DESCRIPTIONS: Record<ResumeService, string> = {
  cv_analyzer:
    "Upload or paste your CV for a full breakdown — strengths, issues, an overall score, and what to do next. Optionally add a target role or job description for a more precise read.",
  cv_tailor:
    "Upload your CV, paste a job description and company name, and get bullet-by-bullet rewrite suggestions informed by the company's recent news and market context. Accept or reject each one, then copy the final tailored text back into your own document.",
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
        {service === "cv_tailor" && <CvTailorWidget />}
      </div>
    </div>
  );
}
