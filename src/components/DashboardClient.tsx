"use client";

import { useEffect, useMemo, useState } from "react";
import { Briefcase, MessageSquare, Users, Award, XCircle, Search, Bell, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import RoleMatchWidget from "@/components/RoleMatchWidget";
import Sidebar, { View, ResumeService } from "@/components/Sidebar";
import PipelineFunnel from "@/components/PipelineFunnel";
import RecentActivity from "@/components/RecentActivity";
import { TrendChart, MediumBreakdownChart } from "@/components/Charts";
import AnalyticsView from "@/components/AnalyticsView";
import TrendsView from "@/components/TrendsView";
import ResumeView from "@/components/ResumeView";
import EditApplicationModal from "@/components/EditApplicationModal";
import ChatWidget from "@/components/ChatWidget";
import ThemeToggle from "@/components/ThemeToggle";
import ExtensionSetup from "@/components/ExtensionSetup";
import InterviewIntelView from "@/components/InterviewIntelView";

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

const AVATAR_COLORS = ["#2563eb", "#7c3aed", "#059669", "#d97706", "#dc2626", "#0891b2"];
function avatarColor(name: string) {
  const idx = name.split("").reduce((sum, c) => sum + c.charCodeAt(0), 0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

export default function DashboardClient() {
  const supabase = useMemo(() => createClient(), []);
  const [apps, setApps] = useState<Application[]>([]);
  const [range, setRange] = useState<Range>(30);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [gmailConnected, setGmailConnected] = useState<boolean | null>(null);
  const [userEmail, setUserEmail] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<View>("dashboard");
  const [resumeService, setResumeService] = useState<ResumeService>("cv_analyzer");
  const [editing, setEditing] = useState<Application | null>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;

  useEffect(() => {
    async function checkUser() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      setUserEmail(userData.user.email);
      const { data } = await supabase
        .from("profiles")
        .select("gmail_connected")
        .eq("id", userData.user.id)
        .maybeSingle();
      setGmailConnected(data?.gmail_connected ?? false);
    }
    checkUser();
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
      .on("postgres_changes", { event: "*", schema: "public", table: "applications" }, () => load())
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

  const searched = useMemo(() => {
    if (!search.trim()) return filtered;
    const q = search.toLowerCase();
    return filtered.filter(
      (a) => a.company_name.toLowerCase().includes(q) || a.job_title.toLowerCase().includes(q)
    );
  }, [filtered, search]);

  useEffect(() => {
    setPage(1);
  }, [search, range]);

  const totalPages = Math.max(1, Math.ceil(searched.length / PAGE_SIZE));
  const paginated = useMemo(
    () => searched.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [searched, page]
  );

  const total = filtered.length;
  const interviewed = filtered.filter((a) => a.status === "interview" || a.status === "offer").length;
  const offers = filtered.filter((a) => a.status === "offer").length;
  const rejections = filtered.filter((a) => a.status === "rejected").length;
  const responseRate = total > 0 ? Math.round((interviewed / total) * 100) : 0;

  // Views that don't use the date range toggle
  const hideRangeToggle =
    view === "resume" || view === "extension" || view === "interview_intel";

  return (
    <div className="flex min-h-screen" style={{ background: "var(--app-bg)" }}>
      <Sidebar
        userEmail={userEmail}
        view={view}
        onChange={setView}
        apps={apps}
        resumeService={resumeService}
        onResumeServiceChange={setResumeService}
      />

      <main className="flex-1 px-6 py-6 lg:px-8">
        {view !== "dashboard" ? (
          <>
            <div className="flex justify-end gap-2">
              <ThemeToggle />
              {!hideRangeToggle && <RangeToggle range={range} onChange={setRange} />}
            </div>
            <div className="mt-4">
              {view === "analytics" && <AnalyticsView apps={apps} />}
              {view === "trends" && <TrendsView apps={apps} />}
              {view === "resume" && <ResumeView service={resumeService} />}
              {view === "interview_intel" && <InterviewIntelView />}
              {view === "extension" && (
                <div>
                  <h1 className="font-display text-xl font-bold" style={{ color: "var(--text-high)" }}>Extension</h1>
                  <p className="text-xs" style={{ color: "var(--text-faint)" }}>
                    Record applications from any job site with one click.
                  </p>
                  <ExtensionSetup />
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            {/* Top bar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="font-display text-xl font-bold" style={{ color: "var(--text-high)" }}>
                  Application Dashboard
                </h1>
                <p className="text-xs" style={{ color: "var(--text-faint)" }}>
                  {gmailConnected === true ? "Gmail syncing automatically" : "Gmail not connected"}
                </p>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5" style={{ color: "var(--text-faint)" }} />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search applications…"
                    className="w-48 rounded-md border py-1.5 pl-8 pr-3 text-sm outline-none"
                    style={{ borderColor: "var(--line)", background: "var(--surface)", color: "var(--text-high)" }}
                  />
                </div>
                <RangeToggle range={range} onChange={setRange} />
                <ThemeToggle />
                <button className="flex h-8 w-8 items-center justify-center rounded-md border" style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
                  <Bell className="h-4 w-4" style={{ color: "var(--text-low)" }} />
                </button>
                <button
                  onClick={() => setShowAddForm((v) => !v)}
                  className="font-display rounded-md px-3.5 py-2 text-sm font-semibold text-white"
                  style={{ background: "var(--blue)" }}
                >
                  {showAddForm ? "Close" : "+ Add Application"}
                </button>
              </div>
            </div>

            {gmailConnected === false && (
              <a href="/api/auth/google/start" className="mt-4 block rounded-lg border px-4 py-3 text-sm"
                style={{ borderColor: "var(--line)", background: "var(--blue-bg)", color: "var(--blue)" }}>
                Connect Gmail to auto-log applications and offers →
              </a>
            )}

            {showAddForm && <AddApplicationForm onAdded={() => setShowAddForm(false)} />}

            <div className="mt-6 grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-5">
              <KpiCard icon={Briefcase} label="Jobs Applied" value={total} color="var(--blue)" bg="var(--blue-bg)" />
              <KpiCard icon={MessageSquare} label="Response Rate" value={`${responseRate}%`} color="var(--purple)" bg="var(--purple-bg)" />
              <KpiCard icon={Users} label="Interview Stage" value={interviewed} color="var(--amber)" bg="var(--amber-bg)" />
              <KpiCard icon={Award} label="Offers Received" value={offers} color="var(--green)" bg="var(--green-bg)" />
              <KpiCard icon={XCircle} label="Rejections" value={rejections} color="var(--red)" bg="var(--red-bg)" />
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <PipelineFunnel apps={filtered} />
              </div>
              <RecentActivity apps={apps} />
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <TrendChart apps={filtered} days={range} />
              </div>
              <MediumBreakdownChart apps={filtered} />
            </div>

            <div className="mt-6 rounded-xl border" style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
              <div className="flex items-center justify-between px-5 py-4">
                <h2 className="font-display text-sm font-semibold" style={{ color: "var(--text-high)" }}>
                  All Applications <span style={{ color: "var(--text-faint)" }}>— {searched.length} results</span>
                </h2>
              </div>
              {loading ? (
                <p className="px-5 pb-5 text-sm" style={{ color: "var(--text-low)" }}>Loading…</p>
              ) : (
                <>
                  <ApplicationsTable apps={paginated} onEdit={setEditing} />
                  <PaginationFooter page={page} totalPages={totalPages} onChange={setPage} />
                </>
              )}
            </div>

            <RoleMatchWidget />
          </>
        )}
      </main>

      {editing && <EditApplicationModal app={editing} onClose={() => setEditing(null)} />}
      <ChatWidget />
    </div>
  );
}

function KpiCard({
  icon: Icon, label, value, color, bg,
}: { icon: typeof Briefcase; label: string; value: number | string; color: string; bg: string }) {
  return (
    <div className="rounded-xl border p-4" style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
      <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: bg }}>
        <Icon className="h-4 w-4" style={{ color }} />
      </div>
      <p className="mt-3 text-xs font-medium" style={{ color: "var(--text-low)" }}>{label}</p>
      <p className="font-display mt-0.5 text-2xl font-bold" style={{ color: "var(--text-high)" }}>{value}</p>
    </div>
  );
}

function RangeToggle({ range, onChange }: { range: Range; onChange: (r: Range) => void }) {
  return (
    <div className="flex rounded-md border p-0.5" style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
      {RANGES.map((r) => (
        <button key={r} onClick={() => onChange(r)}
          className="rounded px-2.5 py-1 text-xs font-semibold transition-colors"
          style={range === r ? { background: "var(--blue)", color: "white" } : { color: "var(--text-low)" }}>
          {r}d
        </button>
      ))}
    </div>
  );
}

const STATUS_STYLES: Record<string, { bg: string; fg: string }> = {
  applied: { bg: "var(--blue-bg)", fg: "var(--blue)" },
  interview: { bg: "var(--amber-bg)", fg: "var(--amber)" },
  offer: { bg: "var(--green-bg)", fg: "var(--green)" },
  rejected: { bg: "var(--red-bg)", fg: "var(--red)" },
};

function ApplicationsTable({ apps, onEdit }: { apps: Application[]; onEdit: (a: Application) => void }) {
  if (apps.length === 0) {
    return (
      <p className="px-5 pb-5 text-sm" style={{ color: "var(--text-faint)" }}>
        No applications match. They&apos;ll show up here automatically once email syncing is on.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="text-xs uppercase" style={{ color: "var(--text-faint)" }}>
          <tr className="border-t" style={{ borderColor: "var(--line)" }}>
            <th className="px-5 py-2.5 font-medium">Company</th>
            <th className="px-5 py-2.5 font-medium">Position</th>
            <th className="px-5 py-2.5 font-medium">Date Applied</th>
            <th className="px-5 py-2.5 font-medium">Channel</th>
            <th className="px-5 py-2.5 font-medium">Status</th>
            <th className="px-5 py-2.5 font-medium">Pay</th>
            <th className="px-5 py-2.5 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {apps.map((a) => {
            const style = STATUS_STYLES[a.status] ?? STATUS_STYLES.applied;
            return (
              <tr key={a.id} className="group border-t" style={{ borderColor: "var(--line)" }}>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="font-display flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-bold text-white"
                      style={{ background: avatarColor(a.company_name) }}>
                      {a.company_name.slice(0, 1).toUpperCase()}
                    </div>
                    <span className="font-medium" style={{ color: "var(--text-high)" }}>{a.company_name}</span>
                  </div>
                </td>
                <td className="px-5 py-3" style={{ color: "var(--text-high)" }}>{a.job_title}</td>
                <td className="px-5 py-3" style={{ color: "var(--text-low)" }}>
                  {new Date(a.applied_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </td>
                <td className="px-5 py-3 capitalize" style={{ color: "var(--text-low)" }}>{a.medium ?? "—"}</td>
                <td className="px-5 py-3">
                  <span className="rounded-full px-2.5 py-1 text-xs font-semibold capitalize" style={{ background: style.bg, color: style.fg }}>
                    {a.status}{a.needs_review ? " · review" : ""}
                  </span>
                </td>
                <td className="px-5 py-3" style={{ color: "var(--text-low)" }}>{a.pay ?? "—"}</td>
                <td className="px-5 py-3 text-right">
                  <button onClick={() => onEdit(a)} className="opacity-0 transition-opacity group-hover:opacity-100" title="Edit">
                    <Pencil className="h-3.5 w-3.5" style={{ color: "var(--text-faint)" }} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function PaginationFooter({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (p: number) => void }) {
  if (totalPages <= 1) return null;

  const pages = new Set<number>([1, totalPages, page, page - 1, page + 1].filter((p) => p >= 1 && p <= totalPages));
  const sorted = Array.from(pages).sort((a, b) => a - b);

  return (
    <div className="flex items-center justify-between border-t px-5 py-3" style={{ borderColor: "var(--line)" }}>
      <button
        onClick={() => onChange(Math.max(1, page - 1))}
        disabled={page === 1}
        className="rounded-md border px-2.5 py-1 text-xs font-medium disabled:opacity-40"
        style={{ borderColor: "var(--line)", color: "var(--text-low)" }}
      >
        Previous
      </button>

      <div className="flex items-center gap-1">
        {sorted.map((p, i) => (
          <span key={p} className="flex items-center">
            {i > 0 && sorted[i - 1] !== p - 1 && (
              <span className="px-1 text-xs" style={{ color: "var(--text-faint)" }}>…</span>
            )}
            <button
              onClick={() => onChange(p)}
              className="rounded-md px-2.5 py-1 text-xs font-medium"
              style={p === page ? { background: "var(--blue)", color: "white" } : { color: "var(--text-low)" }}
            >
              {p}
            </button>
          </span>
        ))}
      </div>

      <button
        onClick={() => onChange(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
        className="rounded-md border px-2.5 py-1 text-xs font-medium disabled:opacity-40"
        style={{ borderColor: "var(--line)", color: "var(--text-low)" }}
      >
        Next
      </button>
    </div>
  );
}

function AddApplicationForm({ onAdded }: { onAdded: () => void }) {
  const supabase = useMemo(() => createClient(), []);
  const [form, setForm] = useState({
    job_title: "", company_name: "", pay: "", medium: "linkedin",
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
      ...form, user_id: userData.user?.id, source: "manual", status: "applied", needs_review: false,
    });
    setSaving(false);
    if (insertError) { setError(insertError.message); return; }
    onAdded();
  }

  const inputStyle = { borderColor: "var(--line)", background: "var(--app-bg)", color: "var(--text-high)" };

  return (
    <form onSubmit={handleSubmit} className="mt-4 grid grid-cols-2 gap-3 rounded-xl border p-4 sm:grid-cols-5"
      style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
      {error && (
        <p className="col-span-2 rounded px-2 py-1.5 text-xs sm:col-span-5" style={{ background: "var(--red-bg)", color: "var(--red)" }}>
          {error}
        </p>
      )}
      <input required placeholder="Position" value={form.job_title}
        onChange={(e) => setForm({ ...form, job_title: e.target.value })}
        className="rounded-md border px-2.5 py-1.5 text-sm" style={inputStyle} />
      <input required placeholder="Company" value={form.company_name}
        onChange={(e) => setForm({ ...form, company_name: e.target.value })}
        className="rounded-md border px-2.5 py-1.5 text-sm" style={inputStyle} />
      <input placeholder="Pay (optional)" value={form.pay}
        onChange={(e) => setForm({ ...form, pay: e.target.value })}
        className="rounded-md border px-2.5 py-1.5 text-sm" style={inputStyle} />
      <select value={form.medium} onChange={(e) => setForm({ ...form, medium: e.target.value })}
        className="rounded-md border px-2.5 py-1.5 text-sm" style={inputStyle}>
        <option value="linkedin">LinkedIn</option>
        <option value="indeed">Indeed</option>
        <option value="email">Email</option>
        <option value="company_site">Company site</option>
        <option value="other">Other</option>
      </select>
      <input type="date" value={form.applied_at}
        onChange={(e) => setForm({ ...form, applied_at: e.target.value })}
        className="rounded-md border px-2.5 py-1.5 text-sm" style={inputStyle} />
      <button type="submit" disabled={saving}
        className="font-display col-span-2 rounded-md px-3 py-1.5 text-sm font-semibold text-white sm:col-span-1"
        style={{ background: "var(--blue)" }}>
        {saving ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
