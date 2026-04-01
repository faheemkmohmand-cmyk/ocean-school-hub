import { useState, useEffect, useRef } from "react";

interface UseTypingAnimationProps {
  words: string[];
  typingSpeed?: number;
  deletingSpeed?: number;
  pauseTime?: number;
}

export function useTypingAnimation({
  words,
  typingSpeed = 80,
  deletingSpeed = 40,
  pauseTime = 2200,
}: UseTypingAnimationProps) {
  const [displayed, setDisplayed] = useState("");
  const wordIndexRef = useRef(0);
  const isDeletingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!words || words.length === 0) return;

    const tick = () => {
      const currentWord = words[wordIndexRef.current];

      if (!isDeletingRef.current) {
        // TYPING phase
        setDisplayed((prev) => {
          const next = currentWord.slice(0, prev.length + 1);
          if (next === currentWord) {
            // Finished typing — pause then start deleting
            timerRef.current = setTimeout(() => {
              isDeletingRef.current = true;
              timerRef.current = setTimeout(tick, deletingSpeed);
            }, pauseTime);
            return next;
          }
          timerRef.current = setTimeout(tick, typingSpeed);
          return next;
        });
      } else {
        // DELETING phase
        setDisplayed((prev) => {
          const next = prev.slice(0, -1);
          if (next === "") {
            // Finished deleting — move to next word
            isDeletingRef.current = false;
            wordIndexRef.current = (wordIndexRef.current + 1) % words.length;
            timerRef.current = setTimeout(tick, typingSpeed + 100); // small gap before next word
            return "";
          }
          timerRef.current = setTimeout(tick, deletingSpeed);
          return next;
        });
      }
    };

    // Start after small initial delay
    timerRef.current = setTimeout(tick, 500);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // ✅ Run once only — refs handle the state internally

  return { displayed };
}
