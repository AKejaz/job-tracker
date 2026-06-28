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

// ---------------------------------------------------------------------------
// Inline markdown renderer — handles **bold**, ## headings, and - bullet lists.
// No external dependency needed; covers all patterns the AI is instructed to use.
// ---------------------------------------------------------------------------
function renderInline(text: string): React.ReactNode {
  // Split on **bold** spans
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={i} style={{ color: "var(--text-high)", fontWeight: 600 }}>
            {part.slice(2, -2)}
          </strong>
        ) : (
          part
        )
      )}
    </>
  );
}

function MarkdownMessage({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let bulletBuffer: string[] = [];

  const flushBullets = (key: string) => {
    if (bulletBuffer.length === 0) return;
    elements.push(
      <ul key={key} className="my-1 space-y-0.5">
        {bulletBuffer.map((b, i) => (
          <li key={i} className="flex gap-1.5 text-sm leading-relaxed">
            <span className="mt-[3px] shrink-0 text-[10px]" style={{ color: "var(--blue)" }}>
              ●
            </span>
            <span>{renderInline(b)}</span>
          </li>
        ))}
      </ul>
    );
    bulletBuffer = [];
  };

  lines.forEach((line, i) => {
    const trimmed = line.trim();

    if (trimmed.startsWith("### ") || trimmed.startsWith("## ") || trimmed.startsWith("# ")) {
      flushBullets(`bl-${i}`);
      const text = trimmed.replace(/^#{1,3}\s+/, "");
      elements.push(
        <p
          key={i}
          className="mt-2.5 mb-0.5 text-[10px] font-bold uppercase tracking-widest"
          style={{ color: "var(--blue)" }}
        >
          {text}
        </p>
      );
    } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      bulletBuffer.push(trimmed.slice(2));
    } else if (trimmed === "") {
      flushBullets(`bl-${i}`);
      // empty line — spacing handled by space-y on container
    } else {
      flushBullets(`bl-${i}`);
      elements.push(
        <p key={i} className="text-sm leading-relaxed">
          {renderInline(trimmed)}
        </p>
      );
    }
  });

  flushBullets("end");

  return <div className="space-y-1">{elements}</div>;
}

// ---------------------------------------------------------------------------

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
          className="fixed bottom-20 right-5 z-40 flex h-[520px] w-80 flex-col overflow-hidden rounded-xl border shadow-xl"
          style={{ borderColor: "var(--line)", background: "var(--surface)" }}
        >
          {/* Header */}
          <div className="border-b px-4 py-3" style={{ borderColor: "var(--line)" }}>
            <p className="font-display text-sm font-semibold" style={{ color: "var(--text-high)" }}>
              Job search assistant
            </p>
            <p className="text-xs" style={{ color: "var(--text-faint)" }}>Grounded in your real data</p>
          </div>

          {/* Message list */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {messages.length === 0 && (
              <p className="text-xs" style={{ color: "var(--text-faint)" }}>
                Ask anything about your applications, or tap a question below.
              </p>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className="max-w-[88%] rounded-lg px-3 py-2"
                style={
                  m.role === "user"
                    ? { background: "var(--blue)", color: "white", marginLeft: "auto" }
                    : { background: "var(--app-bg)", color: "var(--text-high)", border: "1px solid var(--line)" }
                }
              >
                {m.role === "assistant" ? (
                  <MarkdownMessage content={m.content} />
                ) : (
                  <span className="text-sm">{m.content}</span>
                )}
              </div>
            ))}
            {loading && (
              <div
                className="inline-flex max-w-[88%] items-center gap-1.5 rounded-lg px-3 py-2 text-sm"
                style={{ background: "var(--app-bg)", color: "var(--text-faint)", border: "1px solid var(--line)" }}
              >
                <span
                  className="inline-block h-1.5 w-1.5 animate-bounce rounded-full"
                  style={{ background: "var(--blue)", animationDelay: "0ms" }}
                />
                <span
                  className="inline-block h-1.5 w-1.5 animate-bounce rounded-full"
                  style={{ background: "var(--blue)", animationDelay: "150ms" }}
                />
                <span
                  className="inline-block h-1.5 w-1.5 animate-bounce rounded-full"
                  style={{ background: "var(--blue)", animationDelay: "300ms" }}
                />
              </div>
            )}
          </div>

          {/* Quick question chips — only shown when no conversation yet */}
          {messages.length === 0 && (
            <div className="flex flex-wrap gap-1.5 px-4 pb-2">
              {QUICK_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  className="rounded-full border px-2.5 py-1 text-xs transition-colors hover:border-[var(--blue)] hover:text-[var(--blue)]"
                  style={{ borderColor: "var(--line)", color: "var(--text-low)" }}
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input bar */}
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
            <button
              type="submit"
              disabled={loading}
              className="flex h-8 w-8 items-center justify-center rounded-md disabled:opacity-50"
              style={{ background: "var(--blue)" }}
            >
              <Send className="h-3.5 w-3.5 text-white" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
