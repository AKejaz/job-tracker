"use client";

import { useEffect, useRef, useState } from "react";
import { Palette } from "lucide-react";

const THEMES = [
  { id: "light", label: "Light", swatch: "#2563eb" },
  { id: "dark", label: "Dark", swatch: "#5b9bf7" },
  { id: "midnight", label: "Midnight", swatch: "#4d8dff" },
  { id: "blossom", label: "Blossom", swatch: "#d6336c" },
  { id: "lavender", label: "Lavender", swatch: "#8b6fd1" },
];

// Fan sweeps from straight-down (90°) through left to straight-up (270°),
// in screen-space angle convention (0°=right, 90°=down, 180°=left, 270°=up).
const START_ANGLE = 95;
const END_ANGLE = 255;
const RADIUS = 78;

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
  const n = THEMES.length;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative z-10 flex h-8 w-8 items-center justify-center rounded-md border transition-transform"
        style={{
          borderColor: "var(--line)",
          background: "var(--surface)",
          transform: open ? "scale(1.08)" : "scale(1)",
        }}
        title="Change theme"
      >
        <Palette className="h-4 w-4" style={{ color: current.swatch }} />
      </button>

      {THEMES.map((t, i) => {
        const angle = n === 1 ? START_ANGLE : START_ANGLE + (i * (END_ANGLE - START_ANGLE)) / (n - 1);
        const rad = (angle * Math.PI) / 180;
        const x = open ? Math.cos(rad) * RADIUS : 0;
        const y = open ? Math.sin(rad) * RADIUS : 0;
        const isActive = t.id === theme;
        const delay = open ? i * 35 : (n - 1 - i) * 25;

        return (
          <button
            key={t.id}
            onClick={() => applyTheme(t.id)}
            title={t.label}
            className="absolute flex flex-col items-center justify-center rounded-full border shadow-sm"
            style={{
              top: "4px",
              left: "4px",
              width: "40px",
              height: "40px",
              background: "var(--surface)",
              borderColor: isActive ? t.swatch : "var(--line)",
              borderWidth: isActive ? "2px" : "1px",
              opacity: open ? 1 : 0,
              pointerEvents: open ? "auto" : "none",
              transform: `translate(${x}px, ${y}px) scale(${open ? 1 : 0.3})`,
              transition: `transform 0.4s cubic-bezier(0.34, 1.4, 0.64, 1) ${delay}ms, opacity 0.25s ease ${delay}ms`,
              zIndex: 5,
            }}
          >
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: t.swatch }} />
          </button>
        );
      })}
    </div>
  );
}
