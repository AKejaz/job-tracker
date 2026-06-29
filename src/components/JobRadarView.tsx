"use client";

import { useRef, useState } from "react";
import { Star, ExternalLink, Plus, Check, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type JobType = "on_site" | "hybrid" | "remote";
type CvInputMode = "upload" | "paste";

type RadarJob = {
  id: string;
  company: string;
  title: string;
  location: string;
  isRemote: boolean;
  applyLink: string;
  whyFit: string; // "" = not yet analyzed
  starRating: number; // 0 = not yet analyzed
};

// Raw JSearch fields returned by /api/job-radar/search alongside the display-ready
// `jobs` array. The frontend has no other source for these — it just holds onto
// them in a ref and forwards them verbatim to /api/job-radar/analyze for fit
// scoring. Shape must match JSearchJob in both API route files.
type RawJob = {
  job_id: string;
  employer_name: string | null;
  job_title: string | null;
  job_apply_link: string | null;
  job_city: string | null;
  job_state: string | null;
  job_country: string | null;
  job_is_remote: boolean | null;
  job_employment_type: string | null;
  job_description: string | null;
  job_posted_at_datetime_utc: string | null;
};

type AnalysisResult = { index: number; why_fit: string; star_rating: number };

type TrackState = "idle" | "checking" | "confirming" | "tracking" | "tracked" | "error";

export default function JobRadarView() {
  const [city, setCity] = useState("");
  const [degree, setDegree] = useState("");
  const [jobType, setJobType] = useState<JobType>("on_site");
  const [country, setCountry] = useState("");

  const [inputMode, setInputMode] = useState<CvInputMode>("upload");
  const [cvText, setCvText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [jobs, setJobs] = useState<RadarJob[] | null>(null);

  // Carries the raw JSearch payload from the search response into the follow-up
  // analyze call. A ref (not state) because it's never rendered — it's just plumbing
  // between the two requests in handleSearch.
  const rawJobsRef = useRef<RawJob[]>([]);

  const showCountry = true; // Always show — city-only queries are ambiguous (e.g. "Islamabad" without "Pakistan" returns near-zero results from JSearch)
  const canSubmit = city.trim().length > 0 && degree.trim().length > 0 && !loading && !parsing;

  async function handleFileUpload(file: File) {
    setParseError(null);
    setParsing(true);
    setFileName(file.name);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/resume/parse", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setParseError(data.error ?? "Failed to read this file.");
        setCvText("");
        return;
      }
      setCvText(data.text ?? "");
    } catch {
      setParseError("Failed to read this file. Try again or paste the text instead.");
    } finally {
      setParsing(false);
    }
  }

  // Step 2 — runs in the background after search succeeds. Failures here are
  // intentionally silent: the job listings from Step 1 are already visible and
  // usable, so a Groq hiccup shouldn't surface as an error to the user. Rows just
  // keep their "" / 0 placeholders, which JobRow already renders as a loading state.
  async function analyzeFit(rawJobs: RawJob[], cv: string) {
    if (rawJobs.length === 0) return;

    try {
      const res = await fetch("/api/job-radar/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobs: rawJobs, cvText: cv }),
      });
      if (!res.ok) return;

      const data = await res.json();
      const analysis: AnalysisResult[] = data.jobs ?? [];
      if (analysis.length === 0) return;

      const byIndex = new Map(analysis.map((a) => [a.index, a]));
      setJobs((prev) => {
        if (!prev) return prev;
        return prev.map((job, i) => {
          const a = byIndex.get(i);
          if (!a) return job;
          return {
            ...job,
            whyFit: a.why_fit,
            starRating:
              a.star_rating >= 1 && a.star_rating <= 5 ? Math.round(a.star_rating) : job.starRating,
          };
        });
      });
    } catch {
      // Network error on the analyze call — leave placeholders, no error shown.
    }
  }

  async function handleSearch() {
    setSearchError(null);
    setLoading(true);
    setJobs(null);
    rawJobsRef.current = [];

    try {
      const res = await fetch("/api/job-radar/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          city,
          degree,
          jobType,
          country: showCountry ? country : "",
          cvText,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setSearchError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      const incoming: RadarJob[] = data.jobs ?? [];
      setJobs(incoming);
      rawJobsRef.current = data.rawJobs ?? [];

      if (incoming.length === 0) {
        setSearchError("No live listings found for that search — try a broader city or degree term.");
        return;
      }

      // Step 1 (search) is done — loading cube goes away and the table renders
      // immediately with placeholder fit data. Step 2 (analyze) runs in the
      // background; we deliberately don't await it before clearing `loading`.
      void analyzeFit(rawJobsRef.current, cvText);
    } catch {
      setSearchError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-xl font-bold" style={{ color: "var(--text-high)" }}>
          Job Radar
        </h1>
        <p className="text-xs" style={{ color: "var(--text-faint)" }}>
          Scan live openings across the web and see how well each one fits you.
        </p>
      </div>

      {/* Input form */}
      <div
        className="rounded-xl border p-4"
        style={{ background: "var(--surface)", borderColor: "var(--line)" }}
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="col-span-1">
            <label className="text-xs font-semibold" style={{ color: "var(--text-low)" }}>
              City <span style={{ color: "var(--red)" }}>*</span>
            </label>
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder='e.g. "Dubai"'
              className="mt-1 w-full rounded-lg border p-2.5 text-sm outline-none"
              style={{ background: "var(--app-bg)", borderColor: "var(--line)", color: "var(--text-high)" }}
            />
          </div>

          <div className="col-span-1">
            <label className="text-xs font-semibold" style={{ color: "var(--text-low)" }}>
              Degree / field <span style={{ color: "var(--red)" }}>*</span>
            </label>
            <input
              value={degree}
              onChange={(e) => setDegree(e.target.value)}
              placeholder='e.g. "Computer Science"'
              className="mt-1 w-full rounded-lg border p-2.5 text-sm outline-none"
              style={{ background: "var(--app-bg)", borderColor: "var(--line)", color: "var(--text-high)" }}
            />
          </div>

          <div className="col-span-1">
            <label className="text-xs font-semibold" style={{ color: "var(--text-low)" }}>
              Job type
            </label>
            <select
              value={jobType}
              onChange={(e) => setJobType(e.target.value as JobType)}
              className="mt-1 w-full rounded-lg border p-2.5 text-sm outline-none"
              style={{ background: "var(--app-bg)", borderColor: "var(--line)", color: "var(--text-high)" }}
            >
              <option value="on_site">On-site</option>
              <option value="hybrid">Hybrid</option>
              <option value="remote">Remote</option>
            </select>
          </div>

          {showCountry && (
            <div className="col-span-1">
              <label className="text-xs font-semibold" style={{ color: "var(--text-low)" }}>
                Country <span style={{ color: "var(--text-faint)" }}>(optional, improves results)</span>
              </label>
              <input
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder='e.g. "UAE"'
                className="mt-1 w-full rounded-lg border p-2.5 text-sm outline-none"
                style={{ background: "var(--app-bg)", borderColor: "var(--line)", color: "var(--text-high)" }}
              />
            </div>
          )}
        </div>

        {/* CV upload/paste — reuses the shared resume parse pipeline */}
        <div className="mt-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold" style={{ color: "var(--text-low)" }}>
              Your CV <span style={{ color: "var(--text-faint)" }}>(optional, improves fit accuracy)</span>
            </label>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setInputMode("upload")}
                className="rounded-md px-2.5 py-1 text-xs font-semibold transition-colors"
                style={
                  inputMode === "upload"
                    ? { background: "var(--blue-bg)", color: "var(--blue)" }
                    : { color: "var(--text-faint)" }
                }
              >
                Upload
              </button>
              <button
                onClick={() => setInputMode("paste")}
                className="rounded-md px-2.5 py-1 text-xs font-semibold transition-colors"
                style={
                  inputMode === "paste"
                    ? { background: "var(--blue-bg)", color: "var(--blue)" }
                    : { color: "var(--text-faint)" }
                }
              >
                Paste
              </button>
            </div>
          </div>

          <div className="mt-2">
            {inputMode === "upload" ? (
              <label
                className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-5 text-center transition-colors"
                style={{ borderColor: "var(--line)" }}
              >
                <input
                  type="file"
                  accept=".pdf,.docx,.txt"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                  }}
                />
                <span className="text-sm font-medium" style={{ color: "var(--text-high)" }}>
                  {parsing ? "Reading file…" : fileName ?? "Click to upload your CV (PDF, DOCX, or TXT)"}
                </span>
                {cvText && !parsing && (
                  <span className="mt-1 text-xs" style={{ color: "var(--green)" }}>
                    ✓ {cvText.length.toLocaleString()} characters extracted
                  </span>
                )}
                {parseError && (
                  <span className="mt-1 text-xs" style={{ color: "var(--red)" }}>
                    {parseError}
                  </span>
                )}
              </label>
            ) : (
              <textarea
                value={cvText}
                onChange={(e) => setCvText(e.target.value)}
                placeholder="Paste your CV text here..."
                rows={5}
                className="w-full rounded-lg border p-3 text-sm outline-none"
                style={{ background: "var(--app-bg)", borderColor: "var(--line)", color: "var(--text-high)" }}
              />
            )}
          </div>
        </div>

        {searchError && (
          <p className="mt-3 text-xs font-medium" style={{ color: "var(--red)" }}>
            {searchError}
          </p>
        )}

        <button
          onClick={handleSearch}
          disabled={!canSubmit}
          className="mt-4 w-full rounded-lg py-2.5 text-sm font-semibold text-white transition-opacity disabled:opacity-40"
          style={{ background: "var(--blue)" }}
        >
          {loading ? "Scanning…" : "Scan for Jobs"}
        </button>
      </div>

      {/* Loading state — only for Step 1 (search). Step 2 (analyze) runs after the
          table is already visible, so it never shows this full-panel loader. */}
      {loading && <LoadingState />}

      {/* Results */}
      {!loading && jobs && jobs.length > 0 && (
        <ResultsTable jobs={jobs} />
      )}
    </div>
  );
}

function ResultsTable({ jobs }: { jobs: RadarJob[] }) {
  return (
    <div
      className="overflow-x-auto rounded-xl border"
      style={{ background: "var(--surface)", borderColor: "var(--line)" }}
    >
      <table className="w-full text-left text-sm">
        <thead className="text-xs uppercase" style={{ color: "var(--text-faint)" }}>
          <tr className="border-b" style={{ borderColor: "var(--line)" }}>
            <th className="px-4 py-2.5 font-medium">Company</th>
            <th className="px-4 py-2.5 font-medium">Position</th>
            <th className="px-4 py-2.5 font-medium">Location</th>
            <th className="px-4 py-2.5 font-medium">Why Fit</th>
            <th className="px-4 py-2.5 font-medium">Interview Odds</th>
            <th className="px-4 py-2.5 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => (
            <JobRow key={job.id} job={job} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function JobRow({ job }: { job: RadarJob }) {
  const [trackState, setTrackState] = useState<TrackState>("idle");
  const [trackError, setTrackError] = useState<string | null>(null);

  // Fit data hasn't arrived from /api/job-radar/analyze yet.
  const isAnalyzing = job.whyFit === "" && job.starRating === 0;

  async function handleTrack() {
    setTrackError(null);
    setTrackState("checking");
    const supabase = createClient();

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        setTrackState("error");
        setTrackError("Not signed in.");
        return;
      }

      const { data: existing } = await supabase
        .from("applications")
        .select("id")
        .ilike("company_name", job.company)
        .ilike("job_title", job.title)
        .limit(1);

      if (existing && existing.length > 0) {
        const proceed = window.confirm(
          `This looks like it might already be tracked (${job.company} — ${job.title}). Add it anyway?`
        );
        if (!proceed) {
          setTrackState("idle");
          return;
        }
      }

      setTrackState("tracking");
      const { error } = await supabase.from("applications").insert({
        user_id: userData.user.id,
        company_name: job.company,
        job_title: job.title,
        job_url: job.applyLink || null,
        location: job.location,
        source: "manual",
        medium: "other",
        status: "applied",
        applied_at: new Date().toISOString(),
        needs_review: false,
      });

      if (error) {
        setTrackState("error");
        setTrackError(error.message);
        return;
      }

      setTrackState("tracked");
    } catch {
      setTrackState("error");
      setTrackError("Failed to track this application.");
    }
  }

  return (
    <tr className="border-b" style={{ borderColor: "var(--line)" }}>
      <td className="px-4 py-3 font-medium" style={{ color: "var(--text-high)" }}>
        {job.company}
      </td>
      <td className="px-4 py-3" style={{ color: "var(--text-high)" }}>
        {job.title}
      </td>
      <td className="px-4 py-3" style={{ color: "var(--text-low)" }}>
        {job.location}
      </td>
      <td className="px-4 py-3 max-w-xs" style={{ color: "var(--text-low)" }}>
        {isAnalyzing ? (
          <span
            className="inline-block h-3 w-32 animate-pulse rounded-full"
            style={{ background: "var(--line)" }}
            title="Analyzing fit…"
          />
        ) : (
          job.whyFit
        )}
      </td>
      <td className="px-4 py-3">
        {isAnalyzing ? <StarRatingLoading /> : <StarRating rating={job.starRating} />}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          {job.applyLink && (
            <a
              href={job.applyLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors"
              style={{ background: "var(--blue-bg)", color: "var(--blue)" }}
            >
              Apply <ExternalLink className="h-3 w-3" />
            </a>
          )}

          {trackState === "tracked" ? (
            <span
              className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-semibold"
              style={{ background: "var(--green-bg)", color: "var(--green)" }}
            >
              <Check className="h-3 w-3" /> Tracked
            </span>
          ) : (
            <button
              onClick={handleTrack}
              disabled={trackState === "checking" || trackState === "tracking"}
              className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-semibold text-white transition-opacity disabled:opacity-60"
              style={{ background: "var(--blue)" }}
            >
              {trackState === "checking" || trackState === "tracking" ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Plus className="h-3 w-3" />
              )}
              Track
            </button>
          )}
        </div>
        {trackState === "error" && trackError && (
          <p className="mt-1 text-[11px]" style={{ color: "var(--red)" }}>
            {trackError}
          </p>
        )}
      </td>
    </tr>
  );
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5" title={`${rating} of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className="h-3.5 w-3.5 transition-transform hover:scale-125"
          style={{
            fill: n <= rating ? "var(--amber)" : "transparent",
            color: n <= rating ? "var(--amber)" : "var(--text-faint)",
          }}
        />
      ))}
    </div>
  );
}

// Shown in the "Interview Odds" column while a row is waiting on
// /api/job-radar/analyze — five empty outlines plus a tiny spinner, so it's clearly
// distinct from a genuine low (e.g. 0/1-star) rating.
function StarRatingLoading() {
  return (
    <div className="flex items-center gap-1.5" title="Analyzing fit…">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <Star key={n} className="h-3.5 w-3.5" style={{ color: "var(--text-faint)" }} />
        ))}
      </div>
      <Loader2 className="h-3 w-3 animate-spin" style={{ color: "var(--text-faint)" }} />
    </div>
  );
}

function LoadingState() {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-xl border p-10"
      style={{ background: "var(--surface)", borderColor: "var(--line)" }}
    >
      <div className="job-radar-3d-scene">
        <div className="job-radar-3d-cube">
          <div className="job-radar-3d-face job-radar-face-front" />
          <div className="job-radar-3d-face job-radar-face-back" />
          <div className="job-radar-3d-face job-radar-face-left" />
          <div className="job-radar-3d-face job-radar-face-right" />
          <div className="job-radar-3d-face job-radar-face-top" />
          <div className="job-radar-3d-face job-radar-face-bottom" />
        </div>
      </div>
      <p className="mt-6 text-sm font-semibold" style={{ color: "var(--text-high)" }}>
        Scanning the web for live openings…
      </p>
      <p className="mt-1 text-xs" style={{ color: "var(--text-faint)" }}>
        This usually takes a few seconds
      </p>

      <style jsx>{`
        .job-radar-3d-scene {
          width: 70px;
          height: 70px;
          perspective: 400px;
        }
        .job-radar-3d-cube {
          width: 100%;
          height: 100%;
          position: relative;
          transform-style: preserve-3d;
          animation: job-radar-spin 2.4s infinite linear;
        }
        .job-radar-3d-face {
          position: absolute;
          width: 70px;
          height: 70px;
          background: var(--blue);
          opacity: 0.85;
          border: 1px solid var(--blue);
          border-radius: 6px;
        }
        .job-radar-face-front {
          transform: translateZ(35px);
        }
        .job-radar-face-back {
          transform: translateZ(-35px) rotateY(180deg);
        }
        .job-radar-face-left {
          transform: translateX(-35px) rotateY(-90deg);
        }
        .job-radar-face-right {
          transform: translateX(35px) rotateY(90deg);
        }
        .job-radar-face-top {
          transform: translateY(-35px) rotateX(90deg);
        }
        .job-radar-face-bottom {
          transform: translateY(35px) rotateX(-90deg);
        }
        @keyframes job-radar-spin {
          from {
            transform: rotateX(0deg) rotateY(0deg);
          }
          to {
            transform: rotateX(360deg) rotateY(360deg);
          }
        }
      `}</style>
    </div>
  );
}
