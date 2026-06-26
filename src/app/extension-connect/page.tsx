"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ExtensionConnectPage() {
  const [status, setStatus] = useState<"loading" | "waiting" | "connected" | "error">("loading");
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    async function loadToken() {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        setStatus("error");
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("extension_token")
        .eq("id", userData.user.id)
        .maybeSingle();

      let t = data?.extension_token;
      if (!t) {
        t = crypto.randomUUID();
        await supabase.from("profiles").update({ extension_token: t }).eq("id", userData.user.id);
      }
      setToken(t);
      setStatus("waiting");
    }
    loadToken();
  }, []);

  useEffect(() => {
    if (status !== "waiting") return;
    const el = document.getElementById("job-tracker-token-bridge");
    if (!el) return;

    // The extension's content script (matching this exact page) reads data-token from this
    // element, saves it via chrome.storage, then flips data-connected to "true" here.
    const observer = new MutationObserver(() => {
      if (el.getAttribute("data-connected") === "true") {
        setStatus("connected");
        observer.disconnect();
      }
    });
    observer.observe(el, { attributes: true });

    // Fallback: if no extension responds within a few seconds, let the person know
    // and offer the manual token as a backup instead of waiting forever.
    const timeout = setTimeout(() => {
      if (status === "waiting") setStatus((s) => (s === "waiting" ? "waiting" : s));
    }, 6000);

    return () => {
      observer.disconnect();
      clearTimeout(timeout);
    };
  }, [status]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4" style={{ background: "var(--app-bg)" }}>
      <div
        id="job-tracker-token-bridge"
        data-token={token ?? ""}
        data-connected="false"
        style={{ display: "none" }}
      />

      <div
        className="w-full max-w-sm rounded-xl border p-6 text-center"
        style={{ borderColor: "var(--line)", background: "var(--surface)" }}
      >
        {status === "loading" && (
          <p className="text-sm" style={{ color: "var(--text-low)" }}>Preparing your connection…</p>
        )}
        {status === "waiting" && (
          <>
            <p className="font-display text-sm font-semibold" style={{ color: "var(--text-high)" }}>
              Looking for the extension…
            </p>
            <p className="mt-2 text-xs" style={{ color: "var(--text-low)" }}>
              Make sure the Job Tracker extension is installed, then keep this tab open.
              It'll connect automatically.
            </p>
            <p className="mt-4 text-xs" style={{ color: "var(--text-faint)" }}>
              Nothing happening? You can also{" "}
              <button
                onClick={() => navigator.clipboard.writeText(token ?? "")}
                className="underline"
                style={{ color: "var(--blue)" }}
              >
                copy your token manually
              </button>{" "}
              and paste it into the extension's options page.
            </p>
          </>
        )}
        {status === "connected" && (
          <>
            <p className="font-display text-sm font-semibold" style={{ color: "var(--green)" }}>
              ✓ Connected!
            </p>
            <p className="mt-2 text-xs" style={{ color: "var(--text-low)" }}>
              You can close this tab and start recording applications.
            </p>
          </>
        )}
        {status === "error" && (
          <p className="text-sm" style={{ color: "var(--red)" }}>Please log in to your dashboard first, then retry.</p>
        )}
      </div>
    </div>
  );
}
