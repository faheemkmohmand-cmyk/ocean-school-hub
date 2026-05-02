import { useState, useRef, useEffect } from "react";
import { Palette, Check } from "lucide-react";
import { useTheme, type ThemeMode } from "@/hooks/useTheme";

interface ThemeOption {
  id: ThemeMode;
  label: string;
  emoji: string;
  dot: string;
}

const OPTIONS: ThemeOption[] = [
  { id: "light",    label: "Light",    emoji: "☀️", dot: "#1e3a5f" },
  { id: "dark",     label: "Dark",     emoji: "🌙", dot: "#f59e0b" },
  { id: "midnight", label: "Midnight", emoji: "🌑", dot: "#3b82f6" },
  { id: "forest",   label: "Forest",   emoji: "🌿", dot: "#166534" },
  { id: "violet",   label: "Violet",   emoji: "💜", dot: "#6d28d9" },
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
          className="absolute right-0 mt-2 w-48 rounded-xl border border-border shadow-elevated overflow-hidden z-[9999]"
          style={{ backgroundColor: "hsl(var(--card))", color: "hsl(var(--card-foreground))" }}
          role="menu"
        >
          <div
            className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider border-b"
            style={{ color: "hsl(var(--muted-foreground))", borderColor: "hsl(var(--border))" }}
          >
            Theme
          </div>
          {OPTIONS.map((opt) => {
            const active = opt.id === theme;
            return (
              <button
                key={opt.id}
                onClick={() => { setTheme(opt.id); setOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors hover:bg-secondary"
                style={{
                  backgroundColor: active ? "hsl(var(--secondary))" : undefined,
                  color: active ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
                }}
                role="menuitem"
              >
                <span
                  className="w-3.5 h-3.5 rounded-full shrink-0 ring-2"
                  style={{ backgroundColor: opt.dot, ringColor: "hsl(var(--border))" }}
                />
                <span className="flex-1 text-left font-medium">{opt.emoji} {opt.label}</span>
                {active && <Check className="w-4 h-4" style={{ color: "hsl(var(--primary))" }} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ThemeSwitcher;
