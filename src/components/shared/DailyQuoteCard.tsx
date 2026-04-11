// src/components/shared/DailyQuoteCard.tsx
// Reusable daily quote widget — drop anywhere (Home, Overview, etc.)

import { useTodayQuote } from "@/hooks/useNewFeatures";
import { Quote } from "lucide-react";

export function DailyQuoteCard() {
  const { data: quote, isLoading } = useTodayQuote();

  if (isLoading) return (
    <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-200 dark:border-emerald-700/30 rounded-2xl p-4 animate-pulse">
      <div className="h-4 bg-emerald-200/60 rounded w-3/4 mb-2" />
      <div className="h-3 bg-emerald-200/40 rounded w-1/3" />
    </div>
  );

  if (!quote) return null;

  const isIslamic = quote.category === "islamic";

  return (
    <div className={`relative overflow-hidden rounded-2xl p-4 border ${
      isIslamic
        ? "bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border-emerald-200 dark:border-emerald-700/30"
        : "bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-700/30"
    }`}>
      <div className="absolute top-2 right-3 opacity-10">
        <Quote className="w-10 h-10" />
      </div>
      <div className="flex items-start gap-2.5">
        <span className="text-xl shrink-0">{isIslamic ? "🌙" : "💡"}</span>
        <div>
          <p className={`text-sm font-medium leading-relaxed ${isIslamic ? "text-emerald-800 dark:text-emerald-200" : "text-blue-800 dark:text-blue-200"}`}>
            "{quote.text}"
          </p>
          {quote.author && (
            <p className={`text-xs mt-1.5 font-semibold ${isIslamic ? "text-emerald-600 dark:text-emerald-400" : "text-blue-600 dark:text-blue-400"}`}>
              — {quote.author}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default DailyQuoteCard;
