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
  const wordsKeyRef = useRef(words.join("|"));

  useEffect(() => {
    if (!words || words.length === 0) return;

    const newKey = words.join("|");
    if (newKey !== wordsKeyRef.current) {
      wordsKeyRef.current = newKey;
      wordIndexRef.current = 0;
      isDeletingRef.current = false;
      setDisplayed("");
    }

    if (timerRef.current) clearTimeout(timerRef.current);

    const tick = () => {
      const currentWord = words[wordIndexRef.current];

      if (!isDeletingRef.current) {
        setDisplayed((prev) => {
          const next = currentWord.slice(0, prev.length + 1);
          if (next === currentWord) {
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
        setDisplayed((prev) => {
          const next = prev.slice(0, -1);
          if (next === "") {
            isDeletingRef.current = false;
            wordIndexRef.current = (wordIndexRef.current + 1) % words.length;
            timerRef.current = setTimeout(tick, typingSpeed + 100);
            return "";
          }
          timerRef.current = setTimeout(tick, deletingSpeed);
          return next;
        });
      }
    };

    timerRef.current = setTimeout(tick, 500);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [words.join("|")]);

  return { displayed };
}
