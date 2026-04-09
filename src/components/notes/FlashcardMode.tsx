import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, RotateCcw, Check, CircleAlert as AlertCircle, SkipForward } from "lucide-react";
import { useFlashcards } from "@/hooks/useNotes";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";

interface FlashcardModeProps {
  chapterId: string;
  onClose: () => void;
}

const FlashcardMode = ({ chapterId, onClose }: FlashcardModeProps) => {
  const { user } = useAuth();
  const { data: flashcards = [] } = useFlashcards(chapterId);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [progress, setProgress] = useState<Record<string, { known: boolean; marked: boolean }>>({});
  const [sessionCards, setSessionCards] = useState<string[]>([]);

  useEffect(() => {
    if (!flashcards.length) return;
    setSessionCards(flashcards.map(f => f.id));
  }, [flashcards]);

  const currentCardId = sessionCards[currentIdx];
  const currentCard = flashcards.find(f => f.id === currentCardId);

  const handleMarkKnown = async () => {
    if (!user || !currentCard) return;

    const nextReviewDate = new Date();
    if (progress[currentCardId]?.correct_count ?? 0 === 0) {
      nextReviewDate.setDate(nextReviewDate.getDate() + 1);
    } else if ((progress[currentCardId]?.correct_count ?? 0) === 1) {
      nextReviewDate.setDate(nextReviewDate.getDate() + 3);
    } else {
      nextReviewDate.setDate(nextReviewDate.getDate() + 7);
    }

    await supabase.from("note_flashcard_progress").upsert({
      user_id: user.id,
      flashcard_id: currentCardId,
      known: true,
      correct_count: (progress[currentCardId]?.correct_count ?? 0) + 1,
      next_review: nextReviewDate.toISOString(),
    }, { onConflict: "user_id,flashcard_id" });

    moveToNext();
  };

  const handleReviewAgain = () => {
    setProgress(p => ({ ...p, [currentCardId]: { ...(p[currentCardId] || {}), marked: true } }));
    const remainingCards = sessionCards.filter((_, i) => i > currentIdx);
    if (remainingCards.length >= 2) {
      const reviewIdx = currentIdx + 2;
      setSessionCards(prev => {
        const newCards = [...prev];
        const card = newCards.splice(currentIdx, 1)[0];
        newCards.splice(reviewIdx, 0, card);
        return newCards;
      });
    }
    moveToNext();
  };

  const moveToNext = () => {
    if (currentIdx < sessionCards.length - 1) {
      setCurrentIdx(currentIdx + 1);
      setFlipped(false);
    } else {
      onClose();
    }
  };

  if (!flashcards.length) {
    return (
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      >
        <div className="bg-card rounded-2xl p-6 max-w-sm text-center">
          <p className="text-foreground font-semibold">No flashcards available</p>
          <Button onClick={onClose} className="mt-4 w-full">Close</Button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-card rounded-2xl shadow-2xl max-w-2xl w-full"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <p className="text-sm text-muted-foreground">Flashcards</p>
            <p className="text-lg font-bold text-foreground">{currentIdx + 1} of {sessionCards.length}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-secondary rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-8">
          <div className="flex gap-2 mb-6">
            {sessionCards.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  i < currentIdx ? "bg-green-500" : i === currentIdx ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentCardId}
              initial={{ rotateY: -90, opacity: 0 }}
              animate={{ rotateY: 0, opacity: 1 }}
              exit={{ rotateY: 90, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="min-h-[300px] perspective"
              style={{ perspective: "1000px" }}
            >
              <div
                onClick={() => setFlipped(!flipped)}
                className={`h-[300px] rounded-2xl p-8 cursor-pointer flex items-center justify-center text-center transition-all ${
                  flipped
                    ? "bg-gradient-to-br from-emerald-500 to-teal-600 text-white"
                    : "bg-gradient-to-br from-blue-500 to-purple-600 text-white border-2 border-primary"
                }`}
              >
                <div className="max-w-md">
                  <p className="text-xs font-semibold uppercase opacity-70 mb-2">{flipped ? "Answer" : "Question"}</p>
                  <p className="text-2xl font-bold leading-relaxed">{flipped ? currentCard?.back : currentCard?.front}</p>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          <p className="text-xs text-muted-foreground text-center mt-4">Click card to reveal answer</p>

          {flipped && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-3 mt-8"
            >
              <Button
                onClick={handleMarkKnown}
                variant="default"
                className="flex-1 bg-green-600 hover:bg-green-700 gap-2"
              >
                <Check className="w-4 h-4" /> Got It
              </Button>
              <Button
                onClick={handleReviewAgain}
                variant="outline"
                className="flex-1 gap-2"
              >
                <AlertCircle className="w-4 h-4" /> Review Again
              </Button>
              <Button
                onClick={moveToNext}
                variant="outline"
                size="icon"
              >
                <SkipForward className="w-4 h-4" />
              </Button>
            </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default FlashcardMode;
