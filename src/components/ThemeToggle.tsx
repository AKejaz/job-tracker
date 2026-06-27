"use client";

import { useEffect, useRef, useState } from "react";
import { Palette, Check } from "lucide-react";

const THEMES = [
  { id: "light", label: "Light", swatch: "#2563eb" },
  { id: "dark", label: "Dark", swatch: "#5b9bf7" },
  { id: "midnight", label: "Midnight", swatch: "#4d8dff" },
  { id: "blossom", label: "Blossom", swatch: "#d6336c" },
  { id: "lavender", label: "Lavender", swatch: "#8b6fd1" },
];

export default function ThemeToggle() {
  const [theme, setTheme] = useState("light");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTheme(document.documentElement.getAttribute("data-theme") ?? "light");
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", onClickOutside);
    return () => document.removeEventListener("click", onClickOutside);
  }, []);

  function applyTheme(id: string) {
    setTheme(id);
    setOpen(false);
    if (id === "light") {
      document.documentElement.removeAttribute("data-theme");
    } else {
      document.documentElement.setAttribute("data-theme", id);
    }
    localStorage.setItem("theme", id);
  }

  const current = THEMES.find((t) => t.id === theme) ?? THEMES[0];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative z-10 flex h-8 w-8 items-center justify-center rounded-md border transition-transform"
        style={{ borderColor: "var(--line)", background: "var(--surface)" }}
        title="Change theme"
      >
        <Palette className="h-4 w-4" style={{ color: current.swatch }} />
      </button>

      {/* Contained dropdown card — grows from the button corner, never escapes its own bounds */}
      <div
        className="absolute right-0 top-9 z-50 w-44 origin-top-right overflow-hidden rounded-lg border shadow-lg"
        style={{
          borderColor: "var(--line)",
          background: "var(--surface)",
          transformOrigin: "top right",
          transform: open ? "scale(1)" : "scale(0.85)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.18s ease",
        }}
      >
        <div className="p-1.5">
          {THEMES.map((t, i) => {
            const isActive = t.id === theme;
            return (
              <button
                key={t.id}
                onClick={() => applyTheme(t.id)}
                className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm"
                style={{
                  background: isActive ? "var(--app-bg)" : "transparent",
                  opacity: open ? 1 : 0,
                  transform: open ? "translateY(0)" : "translateY(-4px)",
                  transition: `opacity 0.2s ease ${open ? i * 30 : 0}ms, transform 0.2s ease ${open ? i * 30 : 0}ms`,
                }}
              >
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ background: t.swatch, boxShadow: isActive ? `0 0 0 2px var(--surface), 0 0 0 3px ${t.swatch}` : undefined }}
                />
                <span className="flex-1" style={{ color: "var(--text-high)" }}>{t.label}</span>
                {isActive && <Check className="h-3.5 w-3.5 shrink-0" style={{ color: t.swatch }} />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
