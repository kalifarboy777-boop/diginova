"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/cn";

type Theme = "light" | "dark" | "system";

/** Choix du thème : clair, sombre ou système (mémorisé dans le navigateur). */
export function ThemeToggle({ className, dark }: { className?: string; dark?: boolean }) {
  const [theme, setTheme] = React.useState<Theme>("system");
  React.useEffect(() => {
    try {
      setTheme((localStorage.getItem("dn_theme") as Theme) ?? "system");
    } catch {}
  }, []);
  const apply = (t: Theme) => {
    setTheme(t);
    const root = document.documentElement;
    root.classList.remove("dark", "light");
    if (t !== "system") root.classList.add(t);
    try {
      if (t === "system") localStorage.removeItem("dn_theme");
      else localStorage.setItem("dn_theme", t);
    } catch {}
  };
  const opts: [Theme, typeof Sun, string][] = [
    ["light", Sun, "Thème clair"],
    ["system", Monitor, "Thème du système"],
    ["dark", Moon, "Thème sombre"],
  ];
  return (
    <div role="radiogroup" aria-label="Thème" className={cn("inline-flex rounded-full p-1", dark ? "bg-white/5" : "bg-bg-subtle", className)}>
      {opts.map(([t, Icon, label]) => (
        <button
          key={t}
          type="button"
          role="radio"
          aria-checked={theme === t}
          aria-label={label}
          title={label}
          onClick={() => apply(t)}
          className={cn("flex size-7 items-center justify-center rounded-full transition-colors", theme === t ? (dark ? "bg-white/15 text-white" : "bg-bg-surface text-text-primary shadow-soft") : dark ? "text-white/50 hover:text-white" : "text-text-tertiary hover:text-text-primary")}
        >
          <Icon className="size-3.5" />
        </button>
      ))}
    </div>
  );
}
