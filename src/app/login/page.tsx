"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setStatus(error ? "error" : "sent");
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4" style={{ background: "var(--app-bg)" }}>
      <div className="w-full max-w-sm">
        <h1 className="font-display text-xl font-semibold" style={{ color: "var(--text-high)" }}>
          Job Tracker
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-low)" }}>
          Sign in with a magic link sent to your email.
        </p>

        {status === "sent" ? (
          <p className="mt-6 rounded-md p-4 text-sm" style={{ background: "var(--surface)", color: "var(--text-high)" }}>
            Check your inbox — click the link to sign in.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-3">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-md border px-3 py-2 text-sm outline-none"
              style={{ borderColor: "var(--line)", background: "var(--surface)", color: "var(--text-high)" }}
            />
            <button
              type="submit"
              disabled={status === "sending"}
              className="font-display w-full rounded-md px-3 py-2 text-sm font-medium disabled:opacity-50"
              style={{ background: "var(--blue)", color: "white" }}
            >
              {status === "sending" ? "Sending…" : "Send magic link"}
            </button>
            {status === "error" && (
              <p className="text-sm" style={{ color: "var(--red)" }}>Something went wrong. Try again.</p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
