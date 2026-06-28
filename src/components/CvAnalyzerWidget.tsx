"use client";

import { useRef, useState } from "react";
import { Upload, FileText, ChevronDown } from "lucide-react";
import type { CvReport } from "@/app/api/cv-analyzer/route";

function scoreColor(score: number) {
  if (score >= 80) return { fg: "var(--green)", bg: "var(--green-bg)" };
  if (score >= 60) return { fg: "var(--amber)", bg: "var(--amber-bg)" };
  return { fg: "var(--red)", bg: "var(--red-bg)" };
}

const PRIORITY_STYLES: Record<string, { bg: string; fg: string; label: string }> = {
  high: { bg: "var(--red-bg)", fg: "var(--red)", label: "High priority" },
  medium: { bg: "var(--amber-bg)", fg: "var(--amber)", label: "Medium priority" },
  low: { bg: "var(--blue-bg)", fg: "var(--blue)", label: "Low priority" },
};

function ScoreRing({ score }: { score: number }) {
  const { fg } = scoreColor(score);
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative flex h-28 w-28 shrink-0 items-center justify-center">
      <svg viewBox="0 0 96 96" className="h-28 w-28 -rotate-90">
        <circle cx="48" cy="48" r={radius} fill="none" stroke="var(--line)" strokeWidth="8" />
        <circle
          cx="48" cy="48" r={radius} fill="none" stroke={fg} strokeWidth="8"
          strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="font-display text-2xl font-bold" style={{ color: "var(--text-high)" }}>{score}</span>
        <span className="text-[10px]" style={{ color: "var(--text-faint)" }}>/ 100</span>
      </div>
    </div>
  );
}

function SectionScoreBar({ label, value }: { label: string; value: number }) {
  const { fg } = scoreColor(value);
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span style={{ color: "var(--text-low)" }}>{label}</span>
        <span className="font-semibold" style={{ color: "var(--text-high)" }}>{value}</span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full" style={{ background: "var(--line)" }}>
        <div className="h-full rounded-full" style={{ width: `${value}%`, background: fg, transition: "width 0.6s ease" }} />
      </div>
    </div>
  );
}

export default function CvAnalyzerWidget() {
  const [text, setText] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [showJobDescription, setShowJobDescription] = useState(false);
  const [report, setReport] = useState<CvReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setParsing(true);
    setParseError(null);
    setFileName(file.name);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/resume/parse", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to parse file");
      setText(data.text);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "Failed to parse file");
      setFileName(null);
    }
    setParsing(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setReport(null);
    try {
      const res = await fetch("/api/cv-analyzer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume_text: text,
          target_role: targetRole || undefined,
          job_description: jobDescription || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to analyze CV");
      setReport(data as CvReport);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to analyze CV");
    }
    setLoading(false);
  }

  return (
    <div className="rounded-xl border p-5" style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
      <h2 className="font-display text-sm font-semibold" style={{ color: "var(--text-high)" }}>
        CV Analyzer
      </h2>
      <p className="mt-1 text-xs" style={{ color: "var(--text-low)" }}>
        Upload or paste your CV for a full breakdown — strengths, issues, an overall score, and
        what to do next. Optionally add a target role or job description for a more precise read.
      </p>

      <form onSubmit={handleSubmit} className="mt-3 space-y-3">
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files?.[0];
            if (file) handleFile(file);
          }}
          className="flex cursor-pointer items-center justify-center gap-2 rounded-md border-2 border-dashed px-4 py-5 text-center"
          style={{ borderColor: "var(--line)", background: "var(--app-bg)" }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.txt"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
          {parsing ? (
            <p className="text-sm" style={{ color: "var(--text-low)" }}>Parsing {fileName}…</p>
          ) : fileName ? (
            <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-high)" }}>
              <FileText className="h-4 w-4" style={{ color: "var(--green)" }} />
              {fileName} parsed — review below, then submit
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-low)" }}>
              <Upload className="h-4 w-4" />
              Drop your CV here, or click to upload (PDF, DOCX, or TXT)
            </div>
          )}
        </div>
        {parseError && (
          <p className="rounded px-2 py-1.5 text-xs" style={{ background: "var(--red-bg)", color: "var(--red)" }}>
            {parseError}
          </p>
        )}

        <textarea
          required
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          placeholder="…or paste your CV text here"
          className="w-full rounded-md border px-3 py-2 text-sm"
          style={{ borderColor: "var(--line)", background: "var(--app-bg)", color: "var(--text-high)" }}
        />

        <input
          value={targetRole}
          onChange={(e) => setTargetRole(e.target.value)}
          placeholder='Target role (optional, e.g. "Senior Backend Engineer")'
          className="w-full rounded-md border px-3 py-2 text-sm"
          style={{ borderColor: "var(--line)", background: "var(--app-bg)", color: "var(--text-high)" }}
        />

        <button
          type="button"
          onClick={() => setShowJobDescription((v) => !v)}
          className="flex items-center gap-1 text-xs font-medium"
          style={{ color: "var(--blue)" }}
        >
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showJobDescription ? "rotate-180" : ""}`} />
          {showJobDescription ? "Hide job description field" : "+ Add a specific job description (optional)"}
        </button>
        {showJobDescription && (
          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            rows={5}
            placeholder="Paste the job description to score relevance against this specific posting"
            className="w-full rounded-md border px-3 py-2 text-sm"
            style={{ borderColor: "var(--line)", background: "var(--app-bg)", color: "var(--text-high)" }}
          />
        )}

        {error && (
          <p className="rounded px-2 py-1.5 text-xs" style={{ background: "var(--red-bg)", color: "var(--red)" }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || !text.trim()}
          className="font-display rounded-md px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
          style={{ background: "var(--blue)" }}
        >
          {loading ? "Analyzing…" : "Analyze my CV"}
        </button>
      </form>

      {report && (
        <div className="mt-6 space-y-6 border-t pt-5" style={{ borderColor: "var(--line)" }}>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            <ScoreRing score={report.overall_score} />
            <div className="flex-1">
              <p className="text-xs font-semibold uppercase" style={{ color: "var(--text-faint)" }}>
                Overall assessment
              </p>
              <p className="mt-1 text-sm" style={{ color: "var(--text-high)" }}>{report.summary}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <SectionScoreBar label="Formatting & clarity" value={report.section_scores.formatting_clarity} />
            <SectionScoreBar label="Content relevance" value={report.section_scores.content_relevance} />
            <SectionScoreBar label="Impact & metrics" value={report.section_scores.impact_quantification} />
            <SectionScoreBar label="ATS compatibility" value={report.section_scores.ats_compatibility} />
          </div>

          {report.strengths.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase" style={{ color: "var(--text-faint)" }}>Strengths</p>
              <ul className="mt-2 space-y-2">
                {report.strengths.map((s, i) => (
                  <li key={i} className="rounded-md border p-3" style={{ borderColor: "var(--line)" }}>
                    <p className="text-sm font-medium" style={{ color: "var(--text-high)" }}>{s.title}</p>
                    <p className="mt-0.5 text-xs" style={{ color: "var(--text-low)" }}>{s.detail}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <p className="text-xs font-semibold uppercase" style={{ color: "var(--text-faint)" }}>
              Areas to improve
            </p>
            {report.improvements.length > 0 ? (
              <ul className="mt-2 space-y-2">
                {report.improvements.map((imp, i) => {
                  const ps = PRIORITY_STYLES[imp.priority] ?? PRIORITY_STYLES.medium;
                  return (
                    <li key={i} className="rounded-md border p-3" style={{ borderColor: "var(--line)" }}>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium" style={{ color: "var(--text-high)" }}>{imp.title}</p>
                        <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: ps.bg, color: ps.fg }}>
                          {ps.label}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs" style={{ color: "var(--text-low)" }}>{imp.detail}</p>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-2 rounded-md border p-3 text-xs" style={{ borderColor: "var(--line)", color: "var(--green)", background: "var(--green-bg)" }}>
                No significant issues found — your CV holds up well across the board. See the
                strategies below for ways to push it even further.
              </p>
            )}
          </div>

          {report.future_strategies.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase" style={{ color: "var(--text-faint)" }}>
                Future strategies
              </p>
              <ul className="mt-2 space-y-2">
                {report.future_strategies.map((s, i) => (
                  <li key={i} className="rounded-md border p-3" style={{ borderColor: "var(--line)", background: "var(--blue-bg)" }}>
                    <p className="text-sm font-medium" style={{ color: "var(--blue)" }}>{s.title}</p>
                    <p className="mt-0.5 text-xs" style={{ color: "var(--text-low)" }}>{s.detail}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
