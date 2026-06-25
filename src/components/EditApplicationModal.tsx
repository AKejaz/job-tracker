"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Application = {
  id: string;
  company_name: string;
  job_title: string;
  pay: string | null;
  medium: string | null;
  status: string;
  applied_at: string;
};

export default function EditApplicationModal({
  app, onClose,
}: { app: Application; onClose: () => void }) {
  const supabase = createClient();
  const [form, setForm] = useState({
    company_name: app.company_name,
    job_title: app.job_title,
    pay: app.pay ?? "",
    medium: app.medium ?? "other",
    status: app.status,
    applied_at: app.applied_at.slice(0, 10),
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const { error: updateError } = await supabase
      .from("applications")
      .update({ ...form, needs_review: false, updated_at: new Date().toISOString() })
      .eq("id", app.id);
    setSaving(false);
    if (updateError) { setError(updateError.message); return; }
    onClose();
  }

  async function handleDelete() {
    if (!window.confirm(`Delete the entry for ${app.company_name} — ${app.job_title}? This can't be undone.`)) return;
    setDeleting(true);
    const { error: deleteError } = await supabase.from("applications").delete().eq("id", app.id);
    setDeleting(false);
    if (deleteError) { setError(deleteError.message); return; }
    onClose();
  }

  const inputStyle = { borderColor: "var(--line)", background: "var(--app-bg)", color: "var(--text-high)" };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-xl border p-5" style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
        <h2 className="font-display text-sm font-semibold" style={{ color: "var(--text-high)" }}>Edit application</h2>

        <form onSubmit={handleSave} className="mt-4 space-y-3">
          {error && (
            <p className="rounded px-2 py-1.5 text-xs" style={{ background: "var(--red-bg)", color: "var(--red)" }}>{error}</p>
          )}
          <div>
            <label className="text-xs font-medium" style={{ color: "var(--text-low)" }}>Company</label>
            <input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })}
              className="mt-1 w-full rounded-md border px-2.5 py-1.5 text-sm" style={inputStyle} />
          </div>
          <div>
            <label className="text-xs font-medium" style={{ color: "var(--text-low)" }}>Position</label>
            <input value={form.job_title} onChange={(e) => setForm({ ...form, job_title: e.target.value })}
              className="mt-1 w-full rounded-md border px-2.5 py-1.5 text-sm" style={inputStyle} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium" style={{ color: "var(--text-low)" }}>Pay</label>
              <input value={form.pay} onChange={(e) => setForm({ ...form, pay: e.target.value })}
                className="mt-1 w-full rounded-md border px-2.5 py-1.5 text-sm" style={inputStyle} />
            </div>
            <div>
              <label className="text-xs font-medium" style={{ color: "var(--text-low)" }}>Date applied</label>
              <input type="date" value={form.applied_at} onChange={(e) => setForm({ ...form, applied_at: e.target.value })}
                className="mt-1 w-full rounded-md border px-2.5 py-1.5 text-sm" style={inputStyle} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium" style={{ color: "var(--text-low)" }}>Channel</label>
              <select value={form.medium} onChange={(e) => setForm({ ...form, medium: e.target.value })}
                className="mt-1 w-full rounded-md border px-2.5 py-1.5 text-sm" style={inputStyle}>
                <option value="linkedin">LinkedIn</option>
                <option value="indeed">Indeed</option>
                <option value="email">Email</option>
                <option value="company_site">Company site</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium" style={{ color: "var(--text-low)" }}>Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="mt-1 w-full rounded-md border px-2.5 py-1.5 text-sm" style={inputStyle}>
                <option value="applied">Applied</option>
                <option value="interview">Interview</option>
                <option value="offer">Offer</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button type="button" onClick={handleDelete} disabled={deleting}
              className="text-sm font-medium" style={{ color: "var(--red)" }}>
              {deleting ? "Deleting…" : "Delete entry"}
            </button>
            <div className="flex gap-2">
              <button type="button" onClick={onClose}
                className="rounded-md border px-3 py-1.5 text-sm font-medium"
                style={{ borderColor: "var(--line)", color: "var(--text-low)" }}>
                Cancel
              </button>
              <button type="submit" disabled={saving}
                className="font-display rounded-md px-3 py-1.5 text-sm font-semibold text-white"
                style={{ background: "var(--blue)" }}>
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
