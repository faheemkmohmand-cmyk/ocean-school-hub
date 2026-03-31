import { useState, useEffect } from "react";

interface UseTypingAnimationProps {
  words: string[];
  typingSpeed?: number;   // ms per character
  deletingSpeed?: number; // ms per character when deleting
  pauseTime?: number;     // ms to pause after full word is typed
}

export function useTypingAnimation({
  words,
  typingSpeed = 80,
  deletingSpeed = 40,
  pauseTime = 2000,
}: UseTypingAnimationProps) {
  const [displayed, setDisplayed] = useState("");
  const [wordIndex, setWordIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (words.length === 0) return;

    const currentWord = words[wordIndex % words.length];

    if (isPaused) {
      const pauseTimer = setTimeout(() => {
        setIsPaused(false);
        setIsDeleting(true);
      }, pauseTime);
      return () => clearTimeout(pauseTimer);
    }

    if (isDeleting) {
      if (displayed.length === 0) {
        setIsDeleting(false);
        setWordIndex((prev) => (prev + 1) % words.length);
        return;
      }
      const timer = setTimeout(() => {
        setDisplayed((prev) => prev.slice(0, -1));
      }, deletingSpeed);
      return () => clearTimeout(timer);
    }

    // Typing
    if (displayed.length < currentWord.length) {
      const timer = setTimeout(() => {
        setDisplayed(currentWord.slice(0, displayed.length + 1));
      }, typingSpeed);
      return () => clearTimeout(timer);
    }

    // Full word typed → pause
    setIsPaused(true);
  }, [displayed, isDeleting, isPaused, wordIndex, words, typingSpeed, deletingSpeed, pauseTime]);

  return { displayed, isDeleting };
}
