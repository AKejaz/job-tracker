"use client";

import { useMemo, useState } from "react";

type DiffItem = {
  id: string;
  section: string;
  original_bullet: string;
  suggested_bullet: string;
};

type Decision = "accepted" | "rejected" | "pending";

type CvInputMode = "upload" | "paste";

export default function CvTailorWidget() {
  const [inputMode, setInputMode] = useState<CvInputMode>("upload");
  const [cvText, setCvText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  const [jobDescription, setJobDescription] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [location, setLocation] = useState("");

  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [diffs, setDiffs] = useState<DiffItem[]>([]);
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [hadCompanyContext, setHadCompanyContext] = useState(false);
  const [copied, setCopied] = useState(false);

  const canSubmit = cvText.trim().length > 0 && jobDescription.trim().length > 0 && !loading;

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

  async function handleSubmit() {
    setSubmitError(null);
    setLoading(true);
    setDiffs([]);
    setDecisions({});
    setCopied(false);

    try {
      const res = await fetch("/api/cv-tailor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cvText,
          jobDescription,
          companyName,
          location,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setSubmitError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      const incoming: DiffItem[] = data.diffs ?? [];
      setDiffs(incoming);
      setHadCompanyContext(Boolean(data.hadCompanyContext));

      const initialDecisions: Record<string, Decision> = {};
      incoming.forEach((d) => {
        initialDecisions[d.id] = "pending";
      });
      setDecisions(initialDecisions);

      if (incoming.length === 0) {
        setSubmitError("No tailoring suggestions came back — your CV may already be well-aligned, or try a more detailed job description.");
      }
    } catch {
      setSubmitError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function setDecision(id: string, decision: Decision) {
    setDecisions((prev) => ({ ...prev, [id]: decision }));
    setCopied(false);
  }

  // Build the final tailored CV text by replacing each accepted bullet's original
  // text with its suggested replacement, leaving rejected/pending bullets untouched.
  const tailoredText = useMemo(() => {
    let text = cvText;
    for (const d of diffs) {
      const decision = decisions[d.id] ?? "pending";
      if (decision === "accepted") {
        text = text.replace(d.original_bullet, d.suggested_bullet);
      }
    }
    return text;
  }, [cvText, diffs, decisions]);

  const acceptedCount = diffs.filter((d) => decisions[d.id] === "accepted").length;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(tailoredText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setSubmitError("Couldn't copy automatically — select the text manually instead.");
    }
  }

  return (
    <div className="space-y-5">
      {/* Input form */}
      <div
        className="rounded-xl border p-4"
        style={{ background: "var(--surface)", borderColor: "var(--line)" }}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={() => setInputMode("upload")}
            className="rounded-md px-3 py-1.5 text-xs font-semibold transition-colors"
            style={
              inputMode === "upload"
                ? { background: "var(--blue-bg)", color: "var(--blue)" }
                : { color: "var(--text-faint)" }
            }
          >
            Upload CV
          </button>
          <button
            onClick={() => setInputMode("paste")}
            className="rounded-md px-3 py-1.5 text-xs font-semibold transition-colors"
            style={
              inputMode === "paste"
                ? { background: "var(--blue-bg)", color: "var(--blue)" }
                : { color: "var(--text-faint)" }
            }
          >
            Paste text
          </button>
        </div>

        <div className="mt-3">
          {inputMode === "upload" ? (
            <label
              className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors"
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
              rows={8}
              className="w-full rounded-lg border p-3 text-sm outline-none"
              style={{ background: "var(--app-bg)", borderColor: "var(--line)", color: "var(--text-high)" }}
            />
          )}
        </div>

        <div className="mt-4">
          <label className="text-xs font-semibold" style={{ color: "var(--text-low)" }}>
            Job description <span style={{ color: "var(--red)" }}>*</span>
          </label>
          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Paste the full job description here..."
            rows={6}
            className="mt-1 w-full rounded-lg border p-3 text-sm outline-none"
            style={{ background: "var(--app-bg)", borderColor: "var(--line)", color: "var(--text-high)" }}
          />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold" style={{ color: "var(--text-low)" }}>
              Company name
            </label>
            <input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder='e.g. "Acme Corp"'
              className="mt-1 w-full rounded-lg border p-2.5 text-sm outline-none"
              style={{ background: "var(--app-bg)", borderColor: "var(--line)", color: "var(--text-high)" }}
            />
          </div>
          <div>
            <label className="text-xs font-semibold" style={{ color: "var(--text-low)" }}>
              Location <span style={{ color: "var(--text-faint)" }}>(optional)</span>
            </label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder='e.g. "Dubai, UAE"'
              className="mt-1 w-full rounded-lg border p-2.5 text-sm outline-none"
              style={{ background: "var(--app-bg)", borderColor: "var(--line)", color: "var(--text-high)" }}
            />
          </div>
        </div>

        {submitError && (
          <p className="mt-3 text-xs font-medium" style={{ color: "var(--red)" }}>
            {submitError}
          </p>
        )}

        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="mt-4 w-full rounded-lg py-2.5 text-sm font-semibold text-white transition-opacity disabled:opacity-40"
          style={{ background: "var(--blue)" }}
        >
          {loading ? "Tailoring…" : "Tailor My CV"}
        </button>
      </div>

      {/* Loading state */}
      {loading && <LoadingState />}

      {/* Diff list */}
      {!loading && diffs.length > 0 && (
        <div
          className="rounded-xl border p-4"
          style={{ background: "var(--surface)", borderColor: "var(--line)" }}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold" style={{ color: "var(--text-high)" }}>
                Suggested changes
              </h3>
              <p className="mt-0.5 text-xs" style={{ color: "var(--text-faint)" }}>
                {acceptedCount} of {diffs.length} accepted
                {hadCompanyContext ? " · informed by recent company research" : ""}
              </p>
            </div>
            <button
              onClick={handleCopy}
              className="rounded-lg px-4 py-2 text-xs font-semibold text-white transition-colors"
              style={{ background: copied ? "var(--green)" : "var(--blue)" }}
            >
              {copied ? "Copied!" : "Copy Tailored CV Text"}
            </button>
          </div>

          <div className="mt-4 space-y-4">
            {diffs.map((d) => (
              <DiffCard
                key={d.id}
                item={d}
                decision={decisions[d.id] ?? "pending"}
                onDecide={(decision) => setDecision(d.id, decision)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DiffCard({
  item,
  decision,
  onDecide,
}: {
  item: DiffItem;
  decision: Decision;
  onDecide: (d: Decision) => void;
}) {
  return (
    <div className="rounded-lg border p-3" style={{ borderColor: "var(--line)" }}>
      <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-faint)" }}>
        {item.section}
      </p>

      <div
        className="mt-2 rounded-md border-l-4 p-2.5 text-sm"
        style={{
          background: "var(--red-bg)",
          borderColor: "var(--red)",
          color: "var(--text-high)",
          opacity: decision === "accepted" ? 0.5 : 1,
        }}
      >
        {item.original_bullet}
      </div>

      <div
        className="mt-2 rounded-md border-l-4 p-2.5 text-sm"
        style={{
          background: "var(--green-bg)",
          borderColor: "var(--green)",
          color: "var(--text-high)",
          opacity: decision === "rejected" ? 0.5 : 1,
        }}
      >
        {item.suggested_bullet}
      </div>

      <div className="mt-2.5 flex items-center gap-2">
        <button
          onClick={() => onDecide("accepted")}
          className="rounded-md px-3 py-1 text-xs font-semibold transition-colors"
          style={
            decision === "accepted"
              ? { background: "var(--green)", color: "white" }
              : { background: "var(--green-bg)", color: "var(--green)" }
          }
        >
          Accept
        </button>
        <button
          onClick={() => onDecide("rejected")}
          className="rounded-md px-3 py-1 text-xs font-semibold transition-colors"
          style={
            decision === "rejected"
              ? { background: "var(--red)", color: "white" }
              : { background: "var(--red-bg)", color: "var(--red)" }
          }
        >
          Reject
        </button>
        {decision === "pending" && (
          <span className="text-[11px]" style={{ color: "var(--text-faint)" }}>
            Not decided yet — original kept until you choose
          </span>
        )}
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-xl border p-10"
      style={{ background: "var(--surface)", borderColor: "var(--line)" }}
    >
      <div className="cv-tailor-3d-scene">
        <div className="cv-tailor-3d-cube">
          <div className="cv-tailor-3d-face cv-tailor-face-front" />
          <div className="cv-tailor-3d-face cv-tailor-face-back" />
          <div className="cv-tailor-3d-face cv-tailor-face-left" />
          <div className="cv-tailor-3d-face cv-tailor-face-right" />
          <div className="cv-tailor-3d-face cv-tailor-face-top" />
          <div className="cv-tailor-3d-face cv-tailor-face-bottom" />
        </div>
      </div>
      <p className="mt-6 text-sm font-semibold" style={{ color: "var(--text-high)" }}>
        Researching company and tailoring CV…
      </p>
      <p className="mt-1 text-xs" style={{ color: "var(--text-faint)" }}>
        This usually takes a few seconds
      </p>

      <style jsx>{`
        .cv-tailor-3d-scene {
          width: 70px;
          height: 70px;
          perspective: 400px;
        }
        .cv-tailor-3d-cube {
          width: 100%;
          height: 100%;
          position: relative;
          transform-style: preserve-3d;
          animation: cv-tailor-spin 2.4s infinite linear;
        }
        .cv-tailor-3d-face {
          position: absolute;
          width: 70px;
          height: 70px;
          background: var(--blue);
          opacity: 0.85;
          border: 1px solid var(--blue);
          border-radius: 6px;
        }
        .cv-tailor-face-front {
          transform: translateZ(35px);
        }
        .cv-tailor-face-back {
          transform: translateZ(-35px) rotateY(180deg);
        }
        .cv-tailor-face-left {
          transform: translateX(-35px) rotateY(-90deg);
        }
        .cv-tailor-face-right {
          transform: translateX(35px) rotateY(90deg);
        }
        .cv-tailor-face-top {
          transform: translateY(-35px) rotateX(90deg);
        }
        .cv-tailor-face-bottom {
          transform: translateY(35px) rotateX(-90deg);
        }
        @keyframes cv-tailor-spin {
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
