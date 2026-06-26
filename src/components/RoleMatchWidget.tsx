"use client";

import { useState } from "react";

type RoleMatch = { title: string; reasoning: string };
type CompanyMatch = { name: string; why: string };

const COUNTRIES = [
  "Pakistan", "United Arab Emirates", "Saudi Arabia", "Qatar", "Kuwait", "Bahrain", "Oman",
  "United States", "United Kingdom", "Canada", "Germany", "Netherlands", "Ireland",
  "Singapore", "Australia", "India", "Malaysia", "Turkey", "Egypt", "South Africa",
];

export default function RoleMatchWidget() {
  const [text, setText] = useState("");
  const [location, setLocation] = useState("Pakistan");
  const [city, setCity] = useState("Islamabad");
  const [matches, setMatches] = useState<RoleMatch[] | null>(null);
  const [companies, setCompanies] = useState<CompanyMatch[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const fullLocation = city ? `${city}, ${location}` : location;
    const res = await fetch("/api/resume", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resume_text: text, location: fullLocation }),
    });
    const data = await res.json();
    setMatches(data.matches ?? []);
    setCompanies(data.companies ?? []);
    setLoading(false);
  }

  return (
    <div className="mt-8 rounded-xl border p-5" style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
      <h2 className="font-display text-sm font-semibold" style={{ color: "var(--text-high)" }}>
        CV → role &amp; company matches
      </h2>
      <p className="mt-1 text-xs" style={{ color: "var(--text-low)" }}>
        Paste your CV text, pick a target location, get realistic role titles and companies to target.
      </p>

      <form onSubmit={handleSubmit} className="mt-3 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <select
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="rounded-md border px-2.5 py-1.5 text-sm"
            style={{ borderColor: "var(--line)", background: "var(--app-bg)", color: "var(--text-high)" }}
          >
            {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="City (optional)"
            className="rounded-md border px-2.5 py-1.5 text-sm"
            style={{ borderColor: "var(--line)", background: "var(--app-bg)", color: "var(--text-high)" }}
          />
        </div>
        <textarea
          required
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          placeholder="Paste resume text here…"
          className="w-full rounded-md border px-3 py-2 text-sm"
          style={{ borderColor: "var(--line)", background: "var(--app-bg)", color: "var(--text-high)" }}
        />
        <button
          type="submit"
          disabled={loading}
          className="font-display rounded-md px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
          style={{ background: "var(--blue)" }}
        >
          {loading ? "Analyzing…" : "Find roles & companies"}
        </button>
      </form>

      {(matches || companies) && (
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {matches && matches.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase" style={{ color: "var(--text-faint)" }}>Role matches</p>
              <ul className="mt-2 space-y-2">
                {matches.map((m, i) => (
                  <li key={i} className="rounded-md border p-3" style={{ borderColor: "var(--line)" }}>
                    <p className="text-sm font-medium" style={{ color: "var(--text-high)" }}>{m.title}</p>
                    <p className="mt-0.5 text-xs" style={{ color: "var(--text-low)" }}>{m.reasoning}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {companies && companies.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase" style={{ color: "var(--text-faint)" }}>Companies to target</p>
              <ul className="mt-2 space-y-2">
                {companies.map((c, i) => (
                  <li key={i} className="rounded-md border p-3" style={{ borderColor: "var(--line)" }}>
                    <p className="text-sm font-medium" style={{ color: "var(--text-high)" }}>{c.name}</p>
                    <p className="mt-0.5 text-xs" style={{ color: "var(--text-low)" }}>{c.why}</p>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs" style={{ color: "var(--text-faint)" }}>
                AI-generated based on general knowledge, not live job postings — verify current openings yourself.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
