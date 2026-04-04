import { useEffect, useRef } from "react";
import { Radio } from "lucide-react";
import { useNews } from "@/hooks/useNews";

const NewsTicker = () => {
  const { data: news = [] } = useNews(10);
  const tickerRef = useRef<HTMLDivElement>(null);

  // Duplicate items so loop is seamless
  const items = news.length > 0
    ? [...news, ...news]
    : [
        { id: "1", title: "Welcome to GHS Babi Khel — Excellence in Education" },
        { id: "2", title: "Admissions Open for Session 2025-26 — Apply Now" },
        { id: "3", title: "BISE Peshawar Annual Exams Results Published" },
        { id: "4", title: "Science Lab Inauguration Ceremony — District Mohmand" },
      ].flatMap(i => [i, i]);

  return (
    <div className="bg-primary text-primary-foreground py-2 overflow-hidden">
      <div className="container mx-auto px-4 flex items-center gap-3">
        {/* Label */}
        <div className="flex items-center gap-1.5 shrink-0 bg-white/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
          <Radio className="w-3 h-3 animate-pulse" />
          Live News
        </div>

        {/* Scrolling text */}
        <div className="flex-1 overflow-hidden relative">
          {/* Fade edges */}
          <div className="absolute left-0 top-0 h-full w-8 bg-gradient-to-r from-primary to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 h-full w-8 bg-gradient-to-l from-primary to-transparent z-10 pointer-events-none" />

          <div
            ref={tickerRef}
            className="flex gap-12 whitespace-nowrap"
            style={{
              animation: "ticker-scroll 18s linear infinite",
            }}
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
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
};

export default NewsTicker;
