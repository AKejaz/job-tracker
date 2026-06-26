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
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" />
          
          {/* Circular Palette Container */}
          <div
            className="absolute right-0 top-9 z-50 h-72 w-72"
            style={{
              perspective: "1000px",
            }}
          >
            {/* Central Hub */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className="h-16 w-16 rounded-full border-2 shadow-lg flex items-center justify-center"
                style={{
                  borderColor: "var(--line)",
                  background: "var(--surface)",
                  animation: "pulse 2s ease-in-out infinite",
                }}
              >
                <Palette
                  className="h-6 w-6"
                  style={{ color: current.swatch }}
                />
              </div>
            </div>

            {/* Circular Theme Items */}
            {THEMES.map((t, index) => {
              const angle = (index / THEMES.length) * 360;
              const radius = 90;
              const x = Math.cos((angle * Math.PI) / 180) * radius;
              const y = Math.sin((angle * Math.PI) / 180) * radius;

              return (
                <button
                  key={t.id}
                  onClick={() => applyTheme(t.id)}
                  className="absolute h-14 w-14 rounded-full border-2 shadow-md flex flex-col items-center justify-center gap-1 transition-all hover:scale-110 hover:shadow-lg"
                  style={{
                    left: "50%",
                    top: "50%",
                    transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(${
                      t.id === theme ? 1.2 : 1
                    })`,
                    borderColor: t.swatch,
                    background: "var(--surface)",
                    animation: `fadeInScale 0.5s ease-out ${index * 0.1}s both`,
                    boxShadow:
                      t.id === theme
                        ? `0 0 16px ${t.swatch}40, 0 0 24px ${t.swatch}20`
                        : undefined,
                  }}
                  title={t.label}
                >
                  <div
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: t.swatch }}
                  />
                  <span
                    className="text-[10px] font-semibold"
                    style={{ color: "var(--text-high)" }}
                  >
                    {t.label.slice(0, 3)}
                  </span>
                </button>
              );
            })}
          </div>

          {/* CSS Animations */}
          <style>{`
            @keyframes fadeInScale {
              from {
                opacity: 0;
                transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(0.5);
              }
              to {
                opacity: 1;
                transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(1);
              }
            }

            @keyframes pulse {
              0%, 100% {
                opacity: 1;
              }
              50% {
                opacity: 0.7;
              }
            }
          `}</style>
        </>
      )}
    </div>
  );
}