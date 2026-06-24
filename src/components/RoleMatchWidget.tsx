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
    <div className="mt-8 rounded-lg border border-neutral-800 bg-neutral-900 p-4">
      <h2 className="text-sm font-medium text-neutral-300">CV → role matches (Islamabad, 2026 market)</h2>
      <p className="mt-1 text-xs text-neutral-500">
        Paste your CV text below. (PDF upload + auto-extraction can be wired in once this is validated.)
      </p>
      <form onSubmit={handleSubmit} className="mt-3 space-y-2">
        <textarea
          required
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          placeholder="Paste resume text here…"
          className="w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded bg-neutral-100 px-3 py-1.5 text-sm font-medium text-neutral-900 disabled:opacity-50"
        >
          {loading ? "Analyzing…" : "Find matching roles"}
        </button>
      </form>

      {matches && (
        <ul className="mt-4 space-y-2">
          {matches.map((m, i) => (
            <li key={i} className="rounded border border-neutral-800 p-3">
              <p className="text-sm font-medium">{m.title}</p>
              <p className="mt-0.5 text-xs text-neutral-400">{m.reasoning}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
