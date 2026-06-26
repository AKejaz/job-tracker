"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.getAttribute("data-theme") === "dark");
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    if (next) {
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
      localStorage.setItem("theme", "light");
    }
  }

  return (
    <button
      onClick={toggle}
      className="flex h-8 w-8 items-center justify-center rounded-md border"
      style={{ borderColor: "var(--line)", background: "var(--surface)" }}
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {dark ? <Sun className="h-4 w-4" style={{ color: "var(--text-low)" }} /> : <Moon className="h-4 w-4" style={{ color: "var(--text-low)" }} />}
    </button>
  );
}
