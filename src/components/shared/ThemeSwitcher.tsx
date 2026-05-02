import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Palette, Check } from "lucide-react";
import { useTheme, type ThemeMode } from "@/hooks/useTheme";

interface ThemeOption {
  id: ThemeMode;
  label: string;
  emoji: string;
  dot: string;
}

const OPTIONS: ThemeOption[] = [
  { id: "light",    label: "Light",    emoji: "☀️", dot: "hsl(222 47% 22%)" },
  { id: "dark",     label: "Dark",     emoji: "🌙", dot: "hsl(38 92% 55%)"  },
  { id: "midnight", label: "Midnight", emoji: "🌑", dot: "hsl(210 100% 56%)" },
  { id: "forest",   label: "Forest",   emoji: "🌿", dot: "hsl(150 50% 22%)" },
  { id: "violet",   label: "Violet",   emoji: "💜", dot: "hsl(258 65% 38%)" },
];

const ThemeSwitcher = ({ compact = true }: { compact?: boolean }) => {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  // Position dropdown relative to button using fixed coords
  const openDropdown = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + window.scrollY + 8,
        right: window.innerWidth - rect.right,
      });
    }
    setOpen((v) => !v);
  };

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        btnRef.current && !btnRef.current.contains(e.target as Node) &&
        dropRef.current && !dropRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const current = OPTIONS.find((o) => o.id === theme) ?? OPTIONS[0];

  // Dropdown rendered via portal — escapes overflow:hidden containers
  const dropdown = open
    ? createPortal(
        <div
          ref={dropRef}
          style={{
            position: "fixed",
            top: dropdownPos.top,
            right: dropdownPos.right,
            zIndex: 99999,
            width: "220px",
            borderRadius: "14px",
            overflow: "hidden",
            border: "1px solid hsl(var(--border))",
            backgroundColor: "hsl(var(--card))",
            boxShadow: "0 16px 48px -8px rgba(0,0,0,0.25)",
          }}
          role="menu"
        >
          {/* Header */}
          <div style={{
            padding: "8px 14px",
            fontSize: "10px",
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "hsl(var(--muted-foreground))",
            borderBottom: "1px solid hsl(var(--border))",
          }}>
            Choose Theme
          </div>

          {/* Options */}
          {OPTIONS.map((opt) => {
            const active = opt.id === theme;
            return (
              <button
                key={opt.id}
                onClick={() => { setTheme(opt.id); setOpen(false); }}
                role="menuitem"
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "10px 14px",
                  fontSize: "14px",
                  fontWeight: active ? 600 : 500,
                  cursor: "pointer",
                  border: "none",
                  outline: "none",
                  textAlign: "left",
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
                {/* Color dot */}
                <span style={{
                  width: "14px",
                  height: "14px",
                  borderRadius: "50%",
                  backgroundColor: opt.dot,
                  border: "2px solid hsl(var(--border))",
                  flexShrink: 0,
                }} />
                <span style={{ flex: 1 }}>{opt.emoji} {opt.label}</span>
                {active && (
                  <Check style={{ width: "16px", height: "16px", color: "hsl(var(--primary))", flexShrink: 0 }} />
                )}
              </button>
            );
          })}
        </div>,
        document.body
      )
    : null;

  return (
    <>
      <button
        ref={btnRef}
        onClick={openDropdown}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "8px",
          borderRadius: "8px",
          border: "none",
          cursor: "pointer",
          background: "transparent",
          color: "hsl(var(--muted-foreground))",
          transition: "background 0.15s, color 0.15s",
        }}
        title="Change theme"
        aria-label="Change theme"
      >
        <Palette style={{ width: "20px", height: "20px" }} />
        {!compact && (
          <span style={{ fontSize: "14px", fontWeight: 500, color: "hsl(var(--foreground))" }}>
            {current.emoji} {current.label}
          </span>
        )}
      </button>

      {dropdown}
    </>
  );
};

export default ThemeSwitcher;
