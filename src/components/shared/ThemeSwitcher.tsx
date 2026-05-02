import { useState, useRef, useEffect } from "react";
import { Palette, Check } from "lucide-react";
import { useTheme, type ThemeMode } from "@/hooks/useTheme";

interface ThemeOption {
  id: ThemeMode;
  label: string;
  dot: string; // inline style background
}

const OPTIONS: ThemeOption[] = [
  { id: "light",    label: "Light",    dot: "hsl(222 47% 22%)" },
  { id: "dark",     label: "Dark",     dot: "hsl(38 92% 55%)"  },
  { id: "midnight", label: "Midnight", dot: "hsl(210 100% 56%)" },
  { id: "forest",   label: "Forest",   dot: "hsl(150 50% 22%)" },
  { id: "violet",   label: "Violet",   dot: "hsl(258 65% 38%)" },
];

const ThemeSwitcher = ({ compact = true }: { compact?: boolean }) => {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const current = OPTIONS.find((o) => o.id === theme) ?? OPTIONS[0];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
        title="Change theme"
        aria-label="Change theme"
      >
        <Palette className="w-5 h-5" />
        {!compact && (
          <span className="text-sm font-medium text-foreground hidden md:inline">
            {current.label}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-52 rounded-xl border border-border bg-popover text-popover-foreground shadow-elevated overflow-hidden z-50 animate-fade-in"
          role="menu"
        >
          <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
            Theme
          </div>
          {OPTIONS.map((opt) => {
            const active = opt.id === theme;
            return (
              <button
                key={opt.id}
                onClick={() => { setTheme(opt.id); setOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors ${
                  active ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
                role="menuitem"
              >
                <span
                  className="w-3.5 h-3.5 rounded-full ring-2 ring-border shrink-0"
                  style={{ backgroundColor: opt.dot }}
                />
                <span className="flex-1 text-left font-medium">{opt.label}</span>
                {active && <Check className="w-4 h-4 text-primary" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ThemeSwitcher;
