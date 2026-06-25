"use client";

type Application = {
  id: string;
  company_name: string;
  job_title: string;
  status: string;
  applied_at: string;
};

const STATUS_DOT: Record<string, string> = {
  applied: "var(--blue)",
  interview: "var(--amber)",
  offer: "var(--green)",
  rejected: "var(--red)",
};

const STATUS_LABEL: Record<string, string> = {
  applied: "Applied",
  interview: "Interview",
  offer: "Offer",
  rejected: "Rejected",
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function RecentActivity({ apps }: { apps: Application[] }) {
  const recent = [...apps]
    .sort((a, b) => new Date(b.applied_at).getTime() - new Date(a.applied_at).getTime())
    .slice(0, 6);

  return (
    <div className="rounded-xl border p-5" style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
      <h2 className="font-display text-sm font-semibold" style={{ color: "var(--text-high)" }}>
        Recent activity
      </h2>
      <p className="mt-0.5 text-xs" style={{ color: "var(--text-low)" }}>Latest applications and status</p>

      <div className="mt-4 space-y-3.5">
        {recent.length === 0 && (
          <p className="text-xs" style={{ color: "var(--text-faint)" }}>Nothing logged yet.</p>
        )}
        {recent.map((a) => (
          <div key={a.id} className="flex items-start gap-2.5">
            <span
              className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
              style={{ background: STATUS_DOT[a.status] ?? "var(--text-faint)" }}
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold" style={{ color: "var(--text-high)" }}>
                {a.company_name} <span className="font-normal" style={{ color: "var(--text-low)" }}>— {a.job_title}</span>
              </p>
              <p className="text-xs" style={{ color: "var(--text-faint)" }}>
                {STATUS_LABEL[a.status] ?? a.status} · {timeAgo(a.applied_at)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
