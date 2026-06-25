"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import RoleMatchWidget from "@/components/RoleMatchWidget";

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

    // Realtime: any insert/update/delete on applications refreshes the list instantly.
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
  const bySource = useMemo(() => {
    const counts: Record<string, number> = { linkedin: 0, indeed: 0, email: 0, company_site: 0, other: 0 };
    for (const a of filtered) {
      const key = (a.medium ?? "other").toLowerCase().replace(/\s+/g, "_");
      counts[key in counts ? key : "other"] += 1;
    }
    return counts;
  }, [filtered]);

  return (
    <div className="min-h-screen bg-neutral-950 px-6 py-8 text-neutral-100">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Job Application Tracker</h1>
          <div className="flex items-center gap-2">
            <RangeToggle range={range} onChange={setRange} />
            <button
              onClick={() => setShowAddForm((v) => !v)}
              className="rounded-md bg-neutral-100 px-3 py-1.5 text-sm font-medium text-neutral-900"
            >
              {showAddForm ? "Close" : "+ Add manually"}
            </button>
          </div>
        </div>

        {gmailConnected === false && (
          <a
            href="/api/auth/google/start"
            className="mt-4 block rounded-md border border-neutral-700 bg-neutral-900 px-4 py-3 text-sm text-neutral-200 hover:border-neutral-500"
          >
            Connect Gmail to auto-log applications and offers →
          </a>
        )}
        {gmailConnected === true && (
          <p className="mt-4 text-xs text-neutral-500">Gmail connected — syncing automatically.</p>
        )}

        {showAddForm && (
          <AddApplicationForm
            onAdded={() => setShowAddForm(false)}
          />
        )}

        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-5">
          <KpiCard label="Total applied" value={total} />
          <KpiCard label="LinkedIn" value={bySource.linkedin} />
          <KpiCard label="Indeed" value={bySource.indeed} />
          <KpiCard label="Email" value={bySource.email} />
          <KpiCard label="Company site" value={bySource.company_site} />
        </div>

        <div className="mt-8">
          <h2 className="mb-3 text-sm font-medium text-neutral-400">
            Applications ({filtered.length})
          </h2>
          {loading ? (
            <p className="text-sm text-neutral-500">Loading…</p>
          ) : (
            <ApplicationsTable apps={filtered} />
          )}
        </div>

        <RoleMatchWidget />
      </div>
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
      <p className="text-xs text-neutral-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function RangeToggle({ range, onChange }: { range: Range; onChange: (r: Range) => void }) {
  return (
    <div className="flex rounded-md border border-neutral-700 p-0.5">
      {RANGES.map((r) => (
        <button
          key={r}
          onClick={() => onChange(r)}
          className={`rounded px-2.5 py-1 text-xs font-medium ${
            range === r ? "bg-neutral-100 text-neutral-900" : "text-neutral-300"
          }`}
        >
          {r}d
        </button>
      ))}
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  applied: "bg-neutral-800 text-neutral-300",
  interview: "bg-blue-900 text-blue-300",
  offer: "bg-green-900 text-green-300",
  rejected: "bg-red-900 text-red-300",
};

function ApplicationsTable({ apps }: { apps: Application[] }) {
  if (apps.length === 0) {
    return (
      <p className="rounded-md border border-neutral-800 p-6 text-center text-sm text-neutral-500">
        No applications in this range yet. They'll show up here automatically once email syncing is on.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-800">
      <table className="w-full text-left text-sm">
        <thead className="bg-neutral-900 text-xs uppercase text-neutral-400">
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
          {apps.map((a) => (
            <tr key={a.id} className="border-t border-neutral-800">
              <td className="px-4 py-2">{a.job_title}</td>
              <td className="px-4 py-2">{a.company_name}</td>
              <td className="px-4 py-2 text-neutral-400">{a.pay ?? "—"}</td>
              <td className="px-4 py-2 text-neutral-400">
                {new Date(a.applied_at).toLocaleDateString()}
              </td>
              <td className="px-4 py-2 capitalize text-neutral-400">{a.medium ?? "—"}</td>
              <td className="px-4 py-2">
                <span
                  className={`rounded px-2 py-0.5 text-xs capitalize ${
                    STATUS_STYLES[a.status] ?? "bg-neutral-800 text-neutral-300"
                  }`}
                >
                  {a.status}
                  {a.needs_review ? " · review" : ""}
                </span>
              </td>
            </tr>
          ))}
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

  return (
    <form onSubmit={handleSubmit} className="mt-4 grid grid-cols-2 gap-3 rounded-lg border border-neutral-800 bg-neutral-900 p-4 sm:grid-cols-5">
      {error && (
        <p className="col-span-2 rounded bg-red-950 px-2 py-1.5 text-xs text-red-300 sm:col-span-5">
          {error}
        </p>
      )}      <input required placeholder="Position" value={form.job_title}
        onChange={(e) => setForm({ ...form, job_title: e.target.value })}
        className="rounded border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-sm" />
      <input required placeholder="Company" value={form.company_name}
        onChange={(e) => setForm({ ...form, company_name: e.target.value })}
        className="rounded border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-sm" />
      <input placeholder="Pay (optional)" value={form.pay}
        onChange={(e) => setForm({ ...form, pay: e.target.value })}
        className="rounded border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-sm" />
      <select value={form.medium} onChange={(e) => setForm({ ...form, medium: e.target.value })}
        className="rounded border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-sm">
        <option value="linkedin">LinkedIn</option>
        <option value="indeed">Indeed</option>
        <option value="email">Email</option>
        <option value="company_site">Company site</option>
        <option value="other">Other</option>
      </select>
      <input type="date" value={form.applied_at}
        onChange={(e) => setForm({ ...form, applied_at: e.target.value })}
        className="rounded border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-sm" />
      <button type="submit" disabled={saving}
        className="col-span-2 rounded bg-neutral-100 px-3 py-1.5 text-sm font-medium text-neutral-900 sm:col-span-1">
        {saving ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
