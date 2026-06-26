"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send } from "lucide-react";

type Message = { role: "user" | "assistant"; content: string };

const QUICK_QUESTIONS = [
  "Summarize this week",
  "Which channel is converting best?",
  "Am I applying enough?",
  "What should I change?",
];

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function send(content: string) {
    if (!content.trim() || loading) return;
    const next = [...messages, { role: "user" as const, content }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      setMessages([...next, { role: "assistant", content: data.reply ?? "Something went wrong." }]);
    } catch {
      setMessages([...next, { role: "assistant", content: "Something went wrong reaching the assistant." }]);
    }
    setLoading(false);
  }

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-5 right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full shadow-lg"
        style={{ background: "var(--blue)" }}
      >
        {open ? <X className="h-5 w-5 text-white" /> : <MessageCircle className="h-5 w-5 text-white" />}
      </button>

      {open && (
        <div
          className="fixed bottom-20 right-5 z-40 flex h-[480px] w-80 flex-col overflow-hidden rounded-xl border shadow-xl"
          style={{ borderColor: "var(--line)", background: "var(--surface)" }}
        >
          <div className="border-b px-4 py-3" style={{ borderColor: "var(--line)" }}>
            <p className="font-display text-sm font-semibold" style={{ color: "var(--text-high)" }}>
              Job search assistant
            </p>
            <p className="text-xs" style={{ color: "var(--text-faint)" }}>Grounded in your real data</p>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {messages.length === 0 && (
              <p className="text-xs" style={{ color: "var(--text-faint)" }}>
                Ask anything about your applications, or tap a question below.
              </p>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className="max-w-[85%] rounded-lg px-3 py-2 text-sm"
                style={
                  m.role === "user"
                    ? { background: "var(--blue)", color: "white", marginLeft: "auto" }
                    : { background: "var(--app-bg)", color: "var(--text-high)" }
                }
              >
                {m.content}
              </div>
            ))}
            {loading && (
              <div className="max-w-[85%] rounded-lg px-3 py-2 text-sm" style={{ background: "var(--app-bg)", color: "var(--text-faint)" }}>
                Thinking…
              </div>
            )}
          </div>

          {messages.length === 0 && (
            <div className="flex flex-wrap gap-1.5 px-4 pb-2">
              {QUICK_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  className="rounded-full border px-2.5 py-1 text-xs"
                  style={{ borderColor: "var(--line)", color: "var(--text-low)" }}
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          <form
            onSubmit={(e) => { e.preventDefault(); send(input); }}
            className="flex items-center gap-2 border-t px-3 py-2.5"
            style={{ borderColor: "var(--line)" }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question…"
              className="flex-1 rounded-md border px-2.5 py-1.5 text-sm outline-none"
              style={{ borderColor: "var(--line)", background: "var(--app-bg)", color: "var(--text-high)" }}
            />
            <button type="submit" disabled={loading} className="flex h-8 w-8 items-center justify-center rounded-md" style={{ background: "var(--blue)" }}>
              <Send className="h-3.5 w-3.5 text-white" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
