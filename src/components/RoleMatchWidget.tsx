"use client";

import { useState } from "react";

type RoleMatch = { title: string; reasoning: string };

export default function RoleMatchWidget() {
  const [text, setText] = useState("");
  const [matches, setMatches] = useState<RoleMatch[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/resume", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resume_text: text }),
    });
    const data = await res.json();
    setMatches(data.matches ?? []);
    setLoading(false);
  }

  return (
    <div className="mt-8 rounded-lg border p-4" style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
      <h2 className="font-display text-sm font-semibold">CV → role matches (Islamabad, 2026 market)</h2>
      <p className="mt-1 text-xs" style={{ color: "var(--text-low)" }}>
        Paste your CV text below. (PDF upload + auto-extraction can be wired in once this is validated.)
      </p>
      <form onSubmit={handleSubmit} className="mt-3 space-y-2">
        <textarea
          required
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          placeholder="Paste resume text here…"
          className="w-full rounded border px-3 py-2 text-sm"
          style={{ borderColor: "var(--line)", background: "var(--app-bg)", color: "var(--text-high)" }}
        />
        <button
          type="submit"
          disabled={loading}
          className="font-display rounded px-3 py-1.5 text-sm font-medium disabled:opacity-50"
          style={{ background: "var(--blue)", color: "white" }}
        >
          {loading ? "Analyzing…" : "Find matching roles"}
        </button>
      </form>

      {matches && (
        <ul className="mt-4 space-y-2">
          {matches.map((m, i) => (
            <li key={i} className="rounded border p-3" style={{ borderColor: "var(--line)" }}>
              <p className="text-sm font-medium">{m.title}</p>
              <p className="mt-0.5 text-xs" style={{ color: "var(--text-low)" }}>{m.reasoning}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
