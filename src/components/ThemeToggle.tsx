"use client";

import { useEffect, useRef, useState } from "react";
import { Palette } from "lucide-react";

const THEMES = [
  { id: "light", label: "Light", swatch: "#2563eb" },
  { id: "dark", label: "Dark", swatch: "#5b9bf7" },
  { id: "midnight", label: "Midnight", swatch: "#4d8dff" },
  { id: "blossom", label: "Blossom", swatch: "#d6336c" },
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
        className="flex h-8 w-8 items-center justify-center rounded-md border"
        style={{ borderColor: "var(--line)", background: "var(--surface)" }}
        title="Change theme"
      >
        <Palette className="h-4 w-4" style={{ color: current.swatch }} />
      </button>

      {open && (
        <div
          className="absolute right-0 top-9 z-50 w-40 rounded-md border p-1.5 shadow-lg"
          style={{ borderColor: "var(--line)", background: "var(--surface)" }}
        >
          {THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => applyTheme(t.id)}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm"
              style={t.id === theme ? { background: "var(--app-bg)" } : {}}
            >
              <span className="h-3 w-3 rounded-full" style={{ background: t.swatch }} />
              <span style={{ color: "var(--text-high)" }}>{t.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
