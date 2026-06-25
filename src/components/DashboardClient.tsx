"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import RoleMatchWidget from "@/components/RoleMatchWidget";
import GrindHeatmap from "@/components/GrindHeatmap";
import { TrendChart, MediumBreakdownChart, ConversionFunnel } from "@/components/Charts";

type Application = {
  id: string;
  company_name: string;
  job_title: string;
  pay: string | null;
  source: string | null;
  medium: string | null;
  status: string;
  applied_at: string;
  needs_review: boolean;
};

const RANGES = [30, 60, 90] as const;
type Range = (typeof RANGES)[number];

export default function DashboardClient() {
  const supabase = useMemo(() => createClient(), []);
  const [apps, setApps] = useState<Application[]>([]);
  const [range, setRange] = useState<Range>(30);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [gmailConnected, setGmailConnected] = useState<boolean | null>(null);

  useEffect(() => {
    async function checkGmail() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const { data } = await supabase
        .from("profiles")
        .select("gmail_connected")
        .eq("id", userData.user.id)
        .maybeSingle();
      setGmailConnected(data?.gmail_connected ?? false);
    }
    checkGmail();
  }, [supabase]);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function load() {
      const { data } = await supabase
        .from("applications")
        .select("id, company_name, job_title, pay, source, medium, status, applied_at, needs_review")
        .order("applied_at", { ascending: false });
      setApps(data ?? []);
      setLoading(false);
    }

    load();

    channel = supabase
      .channel("applications-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "applications" }, () => {
        load();
      })
      .subscribe();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [supabase]);

  const cutoff = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - range);
    return d;
  }, [range]);

  const filtered = useMemo(
    () => apps.filter((a) => new Date(a.applied_at) >= cutoff),
    [apps, cutoff]
  );

  const total = filtered.length;
  const interviewed = filtered.filter((a) => a.status === "interview" || a.status === "offer").length;
  const offers = filtered.filter((a) => a.status === "offer").length;
  const responseRate = total > 0 ? Math.round((interviewed / total) * 100) : 0;

  return (
    <div className="min-h-screen px-6 py-8" style={{ background: "var(--ink)", color: "var(--text-high)" }}>
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight">Job Application Tracker</h1>
            <p className="font-data text-xs" style={{ color: "var(--text-low)" }}>
              {gmailConnected === true ? "● Gmail syncing automatically" : gmailConnected === false ? "○ Gmail not connected" : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <RangeToggle range={range} onChange={setRange} />
            <button
              onClick={() => setShowAddForm((v) => !v)}
              className="font-display rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
              style={{ background: "var(--gold)", color: "var(--ink)" }}
            >
              {showAddForm ? "Close" : "+ Add manually"}
            </button>
          </div>
        </div>

        {gmailConnected === false && (
          <a
            href="/api/auth/google/start"
            className="mt-4 block rounded-md border px-4 py-3 text-sm transition-colors hover:border-[var(--gold)]"
            style={{ borderColor: "var(--line)", background: "var(--surface)", color: "var(--text-high)" }}
          >
            Connect Gmail to auto-log applications and offers →
          </a>
        )}

        {showAddForm && <AddApplicationForm onAdded={() => setShowAddForm(false)} />}

        {/* KPI row */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiCard label="Total applied" value={total} />
          <KpiCard label="Interviews" value={interviewed} accent="var(--gold)" />
          <KpiCard label="Offers" value={offers} accent="var(--teal)" />
          <KpiCard label="Response rate" value={`${responseRate}%`} accent="var(--gold)" />
        </div>

        {/* Signature heatmap */}
        <div className="mt-6">
          <GrindHeatmap dates={apps.map((a) => a.applied_at)} />
        </div>

        {/* Charts row */}
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <TrendChart apps={filtered} days={range} />
          </div>
          <ConversionFunnel apps={filtered} />
        </div>

        <div className="mt-4">
          <MediumBreakdownChart apps={filtered} />
        </div>

        {/* Table */}
        <div className="mt-8">
          <h2 className="font-display mb-3 text-sm font-semibold" style={{ color: "var(--text-low)" }}>
            APPLICATIONS ({filtered.length})
          </h2>
          {loading ? (
            <p className="text-sm" style={{ color: "var(--text-low)" }}>Loading…</p>
          ) : (
            <ApplicationsTable apps={filtered} />
          )}
        </div>

        <RoleMatchWidget />
      </div>
    </div>
  );
}

function KpiCard({ label, value, accent }: { label: string; value: number | string; accent?: string }) {
  return (
    <div className="rounded-lg border p-4" style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
      <p className="font-data text-xs" style={{ color: "var(--text-low)" }}>{label}</p>
      <p className="font-display mt-1 text-2xl font-semibold" style={{ color: accent ?? "var(--text-high)" }}>
        {value}
      </p>
    </div>
  );
}

function RangeToggle({ range, onChange }: { range: Range; onChange: (r: Range) => void }) {
  return (
    <div className="flex rounded-md border p-0.5" style={{ borderColor: "var(--line)" }}>
      {RANGES.map((r) => (
        <button
          key={r}
          onClick={() => onChange(r)}
          className="font-data rounded px-2.5 py-1 text-xs font-medium transition-colors"
          style={
            range === r
              ? { background: "var(--gold)", color: "var(--ink)" }
              : { color: "var(--text-low)" }
          }
        >
          {r}d
        </button>
      ))}
    </div>
  );
}

const STATUS_STYLES: Record<string, { bg: string; fg: string }> = {
  applied: { bg: "var(--surface-raised)", fg: "var(--text-low)" },
  interview: { bg: "#3a2f12", fg: "var(--gold)" },
  offer: { bg: "#173127", fg: "var(--teal)" },
  rejected: { bg: "#3a1f1a", fg: "var(--coral)" },
};

function ApplicationsTable({ apps }: { apps: Application[] }) {
  if (apps.length === 0) {
    return (
      <p
        className="rounded-md border p-6 text-center text-sm"
        style={{ borderColor: "var(--line)", color: "var(--text-low)" }}
      >
        No applications in this range yet. They&apos;ll show up here automatically once email syncing is on.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border" style={{ borderColor: "var(--line)" }}>
      <table className="w-full text-left text-sm">
        <thead
          className="font-data text-xs uppercase"
          style={{ background: "var(--surface)", color: "var(--text-low)" }}
        >
          <tr>
            <th className="px-4 py-2">Position</th>
            <th className="px-4 py-2">Company</th>
            <th className="px-4 py-2">Pay</th>
            <th className="px-4 py-2">Date applied</th>
            <th className="px-4 py-2">Medium</th>
            <th className="px-4 py-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {apps.map((a) => {
            const style = STATUS_STYLES[a.status] ?? STATUS_STYLES.applied;
            return (
              <tr key={a.id} className="border-t" style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
                <td className="px-4 py-2 font-medium">{a.job_title}</td>
                <td className="px-4 py-2">{a.company_name}</td>
                <td className="font-data px-4 py-2" style={{ color: "var(--text-low)" }}>{a.pay ?? "—"}</td>
                <td className="font-data px-4 py-2" style={{ color: "var(--text-low)" }}>
                  {new Date(a.applied_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-2 capitalize" style={{ color: "var(--text-low)" }}>{a.medium ?? "—"}</td>
                <td className="px-4 py-2">
                  <span
                    className="font-data rounded px-2 py-0.5 text-xs capitalize"
                    style={{ background: style.bg, color: style.fg }}
                  >
                    {a.status}
                    {a.needs_review ? " · review" : ""}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function AddApplicationForm({ onAdded }: { onAdded: () => void }) {
  const supabase = useMemo(() => createClient(), []);
  const [form, setForm] = useState({
    job_title: "",
    company_name: "",
    pay: "",
    medium: "linkedin",
    applied_at: new Date().toISOString().slice(0, 10),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const { data: userData } = await supabase.auth.getUser();
    const { error: insertError } = await supabase.from("applications").insert({
      ...form,
      user_id: userData.user?.id,
      source: "manual",
      status: "applied",
      needs_review: false,
    });
    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    onAdded();
  }

  const inputStyle = {
    borderColor: "var(--line)",
    background: "var(--ink)",
    color: "var(--text-high)",
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-4 grid grid-cols-2 gap-3 rounded-lg border p-4 sm:grid-cols-5"
      style={{ borderColor: "var(--line)", background: "var(--surface)" }}
    >
      {error && (
        <p className="col-span-2 rounded px-2 py-1.5 text-xs sm:col-span-5" style={{ background: "#3a1f1a", color: "var(--coral)" }}>
          {error}
        </p>
      )}
      <input required placeholder="Position" value={form.job_title}
        onChange={(e) => setForm({ ...form, job_title: e.target.value })}
        className="rounded border px-2 py-1.5 text-sm" style={inputStyle} />
      <input required placeholder="Company" value={form.company_name}
        onChange={(e) => setForm({ ...form, company_name: e.target.value })}
        className="rounded border px-2 py-1.5 text-sm" style={inputStyle} />
      <input placeholder="Pay (optional)" value={form.pay}
        onChange={(e) => setForm({ ...form, pay: e.target.value })}
        className="rounded border px-2 py-1.5 text-sm" style={inputStyle} />
      <select value={form.medium} onChange={(e) => setForm({ ...form, medium: e.target.value })}
        className="rounded border px-2 py-1.5 text-sm" style={inputStyle}>
        <option value="linkedin">LinkedIn</option>
        <option value="indeed">Indeed</option>
        <option value="email">Email</option>
        <option value="company_site">Company site</option>
        <option value="other">Other</option>
      </select>
      <input type="date" value={form.applied_at}
        onChange={(e) => setForm({ ...form, applied_at: e.target.value })}
        className="rounded border px-2 py-1.5 text-sm" style={inputStyle} />
      <button type="submit" disabled={saving}
        className="font-display col-span-2 rounded px-3 py-1.5 text-sm font-medium sm:col-span-1"
        style={{ background: "var(--gold)", color: "var(--ink)" }}>
        {saving ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
