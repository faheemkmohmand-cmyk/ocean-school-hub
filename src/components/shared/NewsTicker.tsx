import { Megaphone } from "lucide-react";
import { useNotices } from "@/hooks/useNotices";

const NewsTicker = () => {
  const { data: notices = [] } = useNotices(20);

  // Use real DB notices; fall back to school defaults only if DB is empty
  const baseItems = notices.length > 0
    ? notices
    : [
        { id: "1", title: "Welcome to GHS Babi Khel — Excellence in Education" },
        { id: "2", title: "Admissions Open for Session 2025-26 — Apply Now" },
        { id: "3", title: "BISE Peshawar Annual Exams Results Published" },
        { id: "4", title: "Science Lab Inauguration Ceremony — District Mohmand" },
      ];

  // Triple-duplicate so the seamless loop never shows a gap
  const items = [...baseItems, ...baseItems, ...baseItems];

  // Calculate scroll duration based on item count so speed stays consistent
  // ~120px per item at ~80px/s ≈ good reading pace
  const durationSecs = Math.max(8, baseItems.length * 4);

  return (
    <div className="bg-red-600 text-white py-2 overflow-hidden">
      <div className="container mx-auto px-4 flex items-center gap-3">
        {/* Label */}
        <div className="flex items-center gap-1.5 shrink-0 bg-white/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
          <Megaphone className="w-3 h-3 animate-pulse" />
          Announcements
        </div>

        {/* Scrolling text */}
        <div className="flex-1 overflow-hidden relative">
          {/* Fade edges */}
          <div className="absolute left-0 top-0 h-full w-8 bg-gradient-to-r from-red-600 to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 h-full w-8 bg-gradient-to-l from-red-600 to-transparent z-10 pointer-events-none" />

          <div
            className="flex gap-12 whitespace-nowrap"
            style={{ animation: `ticker-scroll ${durationSecs}s linear infinite` }}
          >
            {items.map((item, idx) => (
              <span key={`${item.id}-${idx}`} className="text-sm font-medium inline-flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-white/60 inline-block shrink-0" />
                {item.title}
              </span>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes ticker-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-33.333%); }
        }
      `}</style>
    </div>
  );
};

export default NewsTicker;
