"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Copy, Check } from "lucide-react";

export default function ExtensionSetup() {
  const supabase = createClient();
  const [token, setToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const { data } = await supabase
        .from("profiles")
        .select("extension_token")
        .eq("id", userData.user.id)
        .maybeSingle();

      if (data?.extension_token) {
        setToken(data.extension_token);
      } else {
        const newToken = crypto.randomUUID();
        await supabase.from("profiles").update({ extension_token: newToken }).eq("id", userData.user.id);
        setToken(newToken);
      }
      setLoading(false);
    }
    load();
  }, [supabase]);

  function copy() {
    if (!token) return;
    navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="mt-8 rounded-xl border p-5" style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
      <h2 className="font-display text-sm font-semibold" style={{ color: "var(--text-high)" }}>
        Browser extension setup
      </h2>
      <p className="mt-1 text-xs" style={{ color: "var(--text-low)" }}>
        Paste this token into the extension&apos;s options page once. Keep it private — it lets anyone
        with it log applications to your account.
      </p>

      <div className="mt-3 flex items-center gap-2">
        <code
          className="flex-1 truncate rounded-md border px-3 py-2 text-xs"
          style={{ borderColor: "var(--line)", background: "var(--app-bg)", color: "var(--text-high)" }}
        >
          {loading ? "Generating…" : token}
        </code>
        <button
          onClick={copy}
          disabled={loading}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md"
          style={{ background: "var(--blue)" }}
        >
          {copied ? <Check className="h-4 w-4 text-white" /> : <Copy className="h-4 w-4 text-white" />}
        </button>
      </div>
    </div>
  );
}
