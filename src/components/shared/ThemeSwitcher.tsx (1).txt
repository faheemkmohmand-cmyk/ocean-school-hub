import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { useTheme, type ThemeMode } from "@/hooks/useTheme";

const OPTIONS: { id: ThemeMode; label: string; emoji: string; dot: string }[] = [
  { id: "light",    label: "Light",    emoji: "☀️", dot: "#1e3a5f" },
  { id: "dark",     label: "Dark",     emoji: "🌙", dot: "#2d4f82" },
  { id: "midnight", label: "Midnight", emoji: "🌑", dot: "#3b82f6" },
  { id: "forest",   label: "Forest",   emoji: "🌿", dot: "#166534" },
  { id: "violet",   label: "Violet",   emoji: "💜", dot: "#6d28d9" },
];

// ── Inline expandable version (used in mobile menu) ──────────────────────────
export const ThemeInlineSelector = () => {
  const { theme, setTheme } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const current = OPTIONS.find((o) => o.id === theme) ?? OPTIONS[0];

  return (
    <div style={{ width: "100%" }}>
      {/* Toggle row */}
      <button
        onClick={() => setExpanded((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "12px 16px",
          borderRadius: "12px",
          border: "none",
          cursor: "pointer",
          background: expanded ? "hsl(var(--secondary))" : "transparent",
          color: "hsl(var(--foreground))",
          textAlign: "left",
          transition: "background 0.15s",
        }}
      >
        <span style={{ fontSize: "20px" }}>🎨</span>
        <span style={{ flex: 1, fontSize: "14px", fontWeight: 500 }}>Theme</span>
        <span style={{ fontSize: "13px", color: "hsl(var(--muted-foreground))" }}>
          {current.emoji} {current.label}
        </span>
        <ChevronDown
          style={{
            width: "16px", height: "16px",
            color: "hsl(var(--muted-foreground))",
            transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s",
            flexShrink: 0,
          }}
        />
      </button>

      {/* Expanded options */}
      {expanded && (
        <div style={{
          margin: "4px 0 4px 16px",
          borderLeft: "2px solid hsl(var(--border))",
          paddingLeft: "12px",
        }}>
          {OPTIONS.map((opt) => {
            const active = opt.id === theme;
            return (
              <button
                key={opt.id}
                onClick={() => { setTheme(opt.id); setExpanded(false); }}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "10px 12px",
                  borderRadius: "10px",
                  border: "none",
                  cursor: "pointer",
                  background: active ? "hsl(var(--primary) / 0.12)" : "transparent",
                  color: active ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
                  fontWeight: active ? 600 : 500,
                  fontSize: "14px",
                  textAlign: "left",
                  marginBottom: "2px",
                  transition: "background 0.15s, color 0.15s",
                }}
              >
                {/* Color dot */}
                <span style={{
                  width: "12px", height: "12px",
                  borderRadius: "50%",
                  backgroundColor: opt.dot,
                  border: "2px solid hsl(var(--border))",
                  flexShrink: 0,
                  display: "inline-block",
                }} />
                <span style={{ flex: 1 }}>{opt.emoji} {opt.label}</span>
                {active && <Check style={{ width: "15px", height: "15px", flexShrink: 0 }} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ── Icon-only dropdown (used in desktop navbar) ───────────────────────────────
import { useRef, useEffect } from "react";
import { Palette } from "lucide-react";

const ThemeSwitcher = ({ compact = true }: { compact?: boolean }) => {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = OPTIONS.find((o) => o.id === theme) ?? OPTIONS[0];

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex", alignItems: "center", gap: "6px",
          padding: "8px", borderRadius: "8px",
          border: "none", cursor: "pointer",
          background: open ? "hsl(var(--secondary))" : "transparent",
          color: "hsl(var(--muted-foreground))",
          transition: "background 0.15s",
        }}
        title="Change theme"
        aria-label="Change theme"
      >
        <Palette style={{ width: "20px", height: "20px" }} />
      </button>

      {open && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 8px)",
          right: 0,
          zIndex: 9999,
          width: "200px",
          borderRadius: "14px",
          overflow: "hidden",
          border: "1px solid hsl(var(--border))",
          backgroundColor: "hsl(var(--card))",
          boxShadow: "0 20px 60px -10px rgba(0,0,0,0.25), 0 0 0 1px hsl(var(--border))",
        }}>
          <div style={{
            padding: "8px 14px 6px",
            fontSize: "10px", fontWeight: 700,
            letterSpacing: "0.12em", textTransform: "uppercase",
            color: "hsl(var(--muted-foreground))",
            borderBottom: "1px solid hsl(var(--border))",
          }}>
            Choose Theme
          </div>

          {OPTIONS.map((opt) => {
            const active = opt.id === theme;
            return (
              <button
                key={opt.id}
                onClick={() => { setTheme(opt.id); setOpen(false); }}
                style={{
                  width: "100%", display: "flex", alignItems: "center",
                  gap: "10px", padding: "10px 14px",
                  fontSize: "13px", fontWeight: active ? 600 : 500,
                  cursor: "pointer", border: "none", textAlign: "left",
                  backgroundColor: active ? "hsl(var(--secondary))" : "transparent",
                  color: active ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
                  transition: "background 0.15s",
                }}
                onMouseEnter={e => {
                  if (!active) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "hsl(var(--secondary))";
                }}
                onMouseLeave={e => {
                  if (!active) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent";
                }}
              >
                <span style={{
                  width: "12px", height: "12px", borderRadius: "50%",
                  backgroundColor: opt.dot,
                  border: "2px solid hsl(var(--border))",
                  flexShrink: 0, display: "inline-block",
                }} />
                <span style={{ flex: 1 }}>{opt.emoji} {opt.label}</span>
                {active && <Check style={{ width: "14px", height: "14px", color: "hsl(var(--primary))", flexShrink: 0 }} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ThemeSwitcher;
