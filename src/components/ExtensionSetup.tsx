"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Copy, Check, Download, Link as LinkIcon } from "lucide-react";

export default function ExtensionSetup() {
  const supabase = createClient();
  const [token, setToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showManual, setShowManual] = useState(false);

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
        Browser extension
      </h2>
      <p className="mt-1 text-xs" style={{ color: "var(--text-low)" }}>
        Record applications from any job site with one click.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <a
          href="/job-tracker-extension.zip"
          download
          className="font-display flex items-center gap-1.5 rounded-md px-3.5 py-2 text-sm font-semibold text-white"
          style={{ background: "var(--blue)" }}
        >
          <Download className="h-3.5 w-3.5" /> Download extension
        </a>
        <a
          href="/extension-connect"
          target="_blank"
          rel="noopener noreferrer"
          className="font-display flex items-center gap-1.5 rounded-md border px-3.5 py-2 text-sm font-semibold"
          style={{ borderColor: "var(--line)", color: "var(--text-high)" }}
        >
          <LinkIcon className="h-3.5 w-3.5" /> Connect extension
        </a>
      </div>

      <ol className="mt-4 list-inside list-decimal space-y-1 text-xs" style={{ color: "var(--text-low)" }}>
        <li>Download, then unzip it somewhere you won&apos;t delete.</li>
        <li>Go to <code>chrome://extensions</code>, enable Developer mode, click "Load unpacked," select the unzipped folder.</li>
        <li>Click "Connect extension" above — it links automatically, no copying anything.</li>
      </ol>

      <button
        onClick={() => setShowManual((v) => !v)}
        className="mt-3 text-xs underline"
        style={{ color: "var(--text-faint)" }}
      >
        {showManual ? "Hide manual token" : "Auto-connect not working? Use manual token instead"}
      </button>

      {showManual && (
        <div className="mt-2 flex items-center gap-2">
          <code
            className="flex-1 truncate rounded-md border px-3 py-2 text-xs"
            style={{ borderColor: "var(--line)", background: "var(--app-bg)", color: "var(--text-high)" }}
          >
            {token ?? "Generating…"}
          </code>
          <button onClick={copy} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md" style={{ background: "var(--blue)" }}>
            {copied ? <Check className="h-4 w-4 text-white" /> : <Copy className="h-4 w-4 text-white" />}
          </button>
        </div>
      )}
    </div>
  );
}
