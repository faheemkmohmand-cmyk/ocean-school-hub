import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ArrowRight, Clock, Bookmark, BookmarkCheck, Download,
  CheckCircle, ChevronRight, Zap, Trophy, RotateCcw, ThumbsUp,
  ThumbsDown, Menu, X, Volume2, VolumeX, Play, Pause, Square,
  Timer, CreditCard, BookOpen, Star, Award
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter
} from "recharts";
import PageLayout from "@/components/layout/PageLayout";
import {
  useNoteSubjects, useNoteChapters, useNoteQuiz, useNoteQuestions,
  useNoteProgress, useFlashcards, useHighlights, useGamification,
  saveProgress, saveQuizResult, saveWrongAnswer, removeWrongAnswer,
  awardPoints, NoteQuestion
} from "@/hooks/useNotes";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import confetti from "canvas-confetti";

// ── Chart Component ───────────────────────────────────────────────────────────
function ChapterChart({ config }: { config: any }) {
  if (!config) return null;

  const COLORS = config.colors || ["#6366f1", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6"];

  // If equation mode — compute data points
  let data = config.data || [];
  if (config.equation) {
    data = [];
    const [xMin, xMax] = config.xRange || [-10, 10];
    for (let x = xMin; x <= xMax; x += 0.5) {
      try {
        // Safe equation evaluator
        const eq = config.equation
          .replace(/\^/g, "**")
          .replace(/sin\(/g, "Math.sin(")
          .replace(/cos\(/g, "Math.cos(")
          .replace(/tan\(/g, "Math.tan(")
          .replace(/sqrt\(/g, "Math.sqrt(")
          .replace(/abs\(/g, "Math.abs(")
          .replace(/log\(/g, "Math.log(")
          .replace(/pi/gi, "Math.PI")
          .replace(/e\b/g, "Math.E");
        // eslint-disable-next-line no-new-func
        const y = new Function("x", `return ${eq}`)(x);
        if (isFinite(y)) data.push({ name: x.toFixed(1), value: parseFloat(y.toFixed(3)) });
      } catch { /* skip bad points */ }
    }
  }

  const commonProps = {
    data,
    margin: { top: 10, right: 20, left: 0, bottom: 0 },
  };

  const title = config.title || (config.equation ? `y = ${config.equation}` : "Chart");
  const type = config.type || (config.equation ? "line" : "bar");

  return (
    <div className="bg-card border border-border rounded-2xl p-5 mt-8">
      <h3 className="text-base font-bold text-foreground mb-1 flex items-center gap-2">
        📊 {title}
      </h3>
      {config.equation && (
        <p className="text-sm text-muted-foreground mb-4 font-mono bg-muted px-3 py-1.5 rounded-lg inline-block">
          y = {config.equation}
        </p>
      )}
      <ResponsiveContainer width="100%" height={300}>
        {type === "bar" ? (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} label={config.xLabel ? { value: config.xLabel, position: "insideBottom", offset: -5 } : undefined} />
            <YAxis tick={{ fontSize: 11 }} label={config.yLabel ? { value: config.yLabel, angle: -90, position: "insideLeft" } : undefined} />
            <Tooltip />
            <Legend />
            <Bar dataKey="value" fill={COLORS[0]} radius={[4, 4, 0, 0]} />
            {config.data?.[0]?.value2 !== undefined && <Bar dataKey="value2" fill={COLORS[1]} radius={[4, 4, 0, 0]} />}
          </BarChart>
        ) : type === "area" ? (
          <AreaChart {...commonProps}>
            <defs>
              <linearGradient id="grad1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS[0]} stopOpacity={0.3} />
                <stop offset="95%" stopColor={COLORS[0]} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Area type="monotone" dataKey="value" stroke={COLORS[0]} fill="url(#grad1)" strokeWidth={2} />
          </AreaChart>
        ) : type === "pie" ? (
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={110} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
              {data.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        ) : (
          // Default: line chart (also for equation mode)
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} label={config.xLabel ? { value: config.xLabel, position: "insideBottom", offset: -5 } : undefined} />
            <YAxis tick={{ fontSize: 11 }} label={config.yLabel ? { value: config.yLabel, angle: -90, position: "insideLeft" } : undefined} />
            <Tooltip formatter={(v: any) => [parseFloat(v).toFixed(3), "y"]} />
            <Line type="monotone" dataKey="value" stroke={COLORS[0]} strokeWidth={2.5} dot={false} />
            {config.data?.[0]?.value2 !== undefined && <Line type="monotone" dataKey="value2" stroke={COLORS[1]} strokeWidth={2.5} dot={false} />}
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

// ── Adaptive Quiz ─────────────────────────────────────────────────────────────
const AdaptiveQuiz = ({
  quizId, chapterId, userId
}: { quizId: string; chapterId: string; userId: string }) => {
  const { data: allQuestions = [] } = useNoteQuestions(quizId);
  const { data: quiz } = useNoteQuiz(chapterId);
  const [step, setStep] = useState<"start"|"quiz"|"result">("start");
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [selected, setSelected] = useState<string|null>(null);
  const [revealed, setRevealed] = useState(false);
  const [adaptiveDiff, setAdaptiveDiff] = useState<"easy"|"medium"|"hard">("medium");
  const [correctStreak, setCorrectStreak] = useState(0);
  const [diffMsg, setDiffMsg] = useState("");
  const [points, setPoints] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  if (!allQuestions.length) return null;

  // Sort by difficulty for adaptive logic
  const easy = allQuestions.filter(q => q.difficulty === "easy");
  const medium = allQuestions.filter(q => q.difficulty === "medium");
  const hard = allQuestions.filter(q => q.difficulty === "hard");

  // Build ordered question pool
  const getPool = () => {
    const pool: NoteQuestion[] = [];
    const used = new Set<string>();
    [...medium, ...easy, ...hard].forEach(q => { if (!used.has(q.id)) { pool.push(q); used.add(q.id); } });
    return pool;
  };

  const pool = getPool();
  const q = pool[Math.min(current, pool.length - 1)];
  if (!q) return null;

  const totalQ = Math.min(pool.length, 10);
  const score = Object.values(answers).filter((a, i) => pool[i] && a === pool[i].correct).length;
  const totalPoints = Object.entries(answers).reduce((sum, [i, a]) => {
    const qi = pool[parseInt(i)];
    if (!qi || a !== qi.correct) return sum;
    return sum + (qi.difficulty === "hard" ? 3 : qi.difficulty === "medium" ? 2 : 1);
  }, 0);
  const maxPoints = pool.slice(0, totalQ).reduce((s, q) => s + (q.difficulty === "hard" ? 3 : q.difficulty === "medium" ? 2 : 1), 0);
  const pct = Math.round((score / Math.max(totalQ, 1)) * 100);

  const timeLimit = quiz?.time_limit_secs || 0;

  const startTimer = () => {
    if (!timeLimit) return;
    setTimeLeft(timeLimit);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          // Auto wrong
          if (!revealed) {
            setRevealed(true);
            setAnswers(prev => ({ ...prev, [current]: "__timeout__" }));
          }
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  };

  const selectAnswer = async (opt: string) => {
    if (revealed) return;
    clearInterval(timerRef.current);
    setSelected(opt);
    setRevealed(true);
    setAnswers(prev => ({ ...prev, [current]: opt }));
    const correct = opt === q.correct;
    if (correct) {
      const pts = q.difficulty === "hard" ? 3 : q.difficulty === "medium" ? 2 : 1;
      setPoints(p => p + pts);
      const newStreak = correctStreak + 1;
      setCorrectStreak(newStreak);
      if (newStreak >= 2 && adaptiveDiff !== "hard") {
        setAdaptiveDiff(d => d === "easy" ? "medium" : "hard");
        setDiffMsg("🔥 Great job! Moving to harder questions!");
      } else setDiffMsg("");
      if (!q.explanation) await removeWrongAnswer(userId, q.id);
    } else {
      setCorrectStreak(0);
      if (adaptiveDiff !== "easy") {
        setAdaptiveDiff(d => d === "hard" ? "medium" : "easy");
        setDiffMsg("💪 Let's try an easier one!");
      } else setDiffMsg("");
      await saveWrongAnswer(userId, q.id, opt);
    }
  };

  const next = async () => {
    if (current < totalQ - 1) {
      setCurrent(c => c + 1);
      setSelected(null);
      setRevealed(false);
      setDiffMsg("");
      startTimer();
    } else {
      clearInterval(timerRef.current);
      const passed = pct >= (quiz?.pass_score || 60);
      await saveQuizResult(userId, quizId, score, totalQ, passed);
      await saveProgress(userId, chapterId, { completed: true });
      const bonusPts = passed ? 25 : 10;
      if (pct === 100) {
        await awardPoints(userId, bonusPts + 25, "quiz_master");
        confetti({ particleCount: 200, spread: 90, origin: { y: 0.5 } });
      } else {
        await awardPoints(userId, bonusPts);
        if (passed) confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      }
      setStep("result");
    }
  };

  const optionStyle = (opt: string) => {
    if (!revealed) return "bg-card border-border hover:border-primary hover:bg-primary/5 cursor-pointer";
    if (opt === q.correct) return "bg-green-50 border-green-500 dark:bg-green-900/20";
    if (opt === selected && opt !== q.correct) return "bg-red-50 border-red-400 dark:bg-red-900/20";
    return "bg-card border-border opacity-50";
  };

  const diffColor = adaptiveDiff === "hard" ? "text-red-500 bg-red-50" : adaptiveDiff === "medium" ? "text-amber-500 bg-amber-50" : "text-green-500 bg-green-50";
  const diffDot = adaptiveDiff === "hard" ? "🔴" : adaptiveDiff === "medium" ? "🟡" : "🟢";

  if (step === "start") return (
    <div className="bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-900/20 dark:to-indigo-900/20 border border-violet-200 dark:border-violet-700/30 rounded-3xl p-6 md:p-8 text-center mt-10">
      <div className="text-5xl mb-3">🧠</div>
      <h3 className="text-2xl font-black text-foreground mb-2">Chapter Quiz</h3>
      <p className="text-muted-foreground mb-1">{Math.min(pool.length, 10)} questions • Pass: {quiz?.pass_score || 60}%</p>
      <p className="text-sm text-muted-foreground mb-1">🎯 Adaptive difficulty — gets harder as you improve!</p>
      {timeLimit > 0 && <p className="text-sm text-amber-600 mb-4">⏱ {timeLimit}s per question</p>}
      <button onClick={() => { setStep("quiz"); startTimer(); }}
        className="bg-gradient-to-r from-violet-500 to-indigo-600 text-white font-bold px-8 py-3 rounded-2xl hover:opacity-90 transition-opacity text-base">
        Start Quiz 🚀
      </button>
    </div>
  );

  if (step === "quiz") return (
    <div className="mt-10 bg-card border border-border rounded-3xl overflow-hidden shadow-lg">
      {/* Progress bar */}
      <div className="h-1.5 bg-muted">
        <div className="h-full bg-gradient-to-r from-violet-500 to-indigo-600 transition-all duration-500"
          style={{ width: `${(current / totalQ) * 100}%` }} />
      </div>
      {/* Timer bar */}
      {timeLimit > 0 && (
        <div className="h-1 bg-muted">
          <div className="h-full bg-amber-400 transition-all duration-1000"
            style={{ width: `${(timeLeft / timeLimit) * 100}%` }} />
        </div>
      )}

      <div className="p-5 md:p-8">
        <div className="flex justify-between items-center mb-5 flex-wrap gap-2">
          <span className="text-sm font-semibold text-muted-foreground">Q {current + 1} / {totalQ}</span>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${diffColor}`}>{diffDot} {adaptiveDiff}</span>
            {timeLimit > 0 && <span className={`text-sm font-bold font-mono ${timeLeft < 10 ? "text-red-500" : "text-foreground"}`}>⏱ {timeLeft}s</span>}
            <span className="text-sm bg-primary/10 text-primary font-bold px-3 py-1 rounded-full">⭐ {points} pts</span>
          </div>
        </div>

        {diffMsg && (
          <motion.p initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="text-sm font-semibold text-center mb-4 text-violet-600 bg-violet-50 dark:bg-violet-900/20 py-2 px-4 rounded-xl">
            {diffMsg}
          </motion.p>
        )}

        <AnimatePresence mode="wait">
          <motion.div key={current} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <h4 className="text-lg md:text-xl font-bold text-foreground mb-5 leading-relaxed">{q.question}</h4>

            <div className="grid grid-cols-1 gap-3">
              {(["a","b","c","d"] as const).map(opt => (
                <button key={opt} onClick={() => selectAnswer(opt)} disabled={revealed}
                  className={`w-full text-left px-4 py-4 md:px-5 rounded-2xl border-2 font-medium transition-all duration-200 min-h-[56px] ${optionStyle(opt)}`}>
                  <span className="font-black text-primary mr-3 uppercase">{opt}.</span>
                  {q[`option_${opt}` as keyof NoteQuestion] as string}
                  {revealed && opt === q.correct && <span className="ml-2">✅</span>}
                  {revealed && opt === selected && opt !== q.correct && <span className="ml-2">❌</span>}
                </button>
              ))}
            </div>

            {revealed && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 space-y-3">
                {selected !== q.correct && q.explanation && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/30 rounded-xl p-4 text-sm text-blue-800 dark:text-blue-300">
                    <p className="font-bold mb-1">📖 Step-by-step solution:</p>
                    <p>{q.explanation}</p>
                  </div>
                )}
                {selected !== q.correct && (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 rounded-xl p-3 text-sm text-green-700 dark:text-green-400">
                    ✅ Correct answer: <strong>{q.correct.toUpperCase()}. {q[`option_${q.correct}` as keyof NoteQuestion] as string}</strong>
                  </div>
                )}
                <button onClick={next}
                  className="w-full bg-gradient-to-r from-violet-500 to-indigo-600 text-white font-bold py-3.5 rounded-2xl hover:opacity-90 transition-opacity text-base">
                  {current < totalQ - 1 ? "Next Question →" : "See Results 🏆"}
                </button>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );

  if (step === "result") {
    const emoji = pct === 100 ? "🏆" : pct >= 80 ? "⭐" : pct >= 60 ? "👍" : "💪";
    const msg = pct === 100 ? "Perfect Score! Amazing!" : pct >= 80 ? "Excellent Work!" : pct >= 60 ? "Good Job!" : "Keep Practicing!";
    return (
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
        className="mt-10 bg-card border border-border rounded-3xl p-6 md:p-8 text-center shadow-lg">
        <div className="text-6xl mb-3">{emoji}</div>
        <h3 className="text-2xl font-black text-foreground mb-1">{msg}</h3>
        <div className="text-5xl font-black text-primary my-3">{score}/{totalQ}</div>
        <div className="w-full bg-muted rounded-full h-3 mb-1">
          <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-600 transition-all" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-muted-foreground text-sm mb-2">{pct}% score</p>
        <p className="text-amber-600 font-bold text-sm mb-6">⭐ You earned {points} / {maxPoints} points!</p>
        <button onClick={() => { setCurrent(0); setAnswers({}); setSelected(null); setRevealed(false); setStep("quiz"); setPoints(0); setCorrectStreak(0); setAdaptiveDiff("medium"); startTimer(); }}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl border border-border hover:bg-secondary font-semibold text-sm mx-auto">
          <RotateCcw className="w-4 h-4" /> Try Again
        </button>
      </motion.div>
    );
  }
  return null;
};

// ── Flashcard Mode ────────────────────────────────────────────────────────────
const FlashcardMode = ({ chapterId, onClose }: { chapterId: string; onClose: () => void }) => {
  const { data: cards = [] } = useFlashcards(chapterId);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState<Set<string>>(new Set());
  const [done, setDone] = useState(false);

  const remaining = cards.filter(c => !known.has(c.id));
  const card = remaining[idx] || cards[idx];
  const progress = Math.round((known.size / Math.max(cards.length, 1)) * 100);

  if (!cards.length) return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-card rounded-3xl p-8 text-center max-w-sm w-full">
        <p className="text-4xl mb-3">📇</p>
        <p className="font-bold text-foreground">No flashcards yet for this chapter</p>
        <button onClick={onClose} className="mt-4 px-6 py-2 rounded-xl bg-primary text-primary-foreground font-semibold">Close</button>
      </div>
    </div>
  );

  const markKnown = () => {
    const newKnown = new Set(known);
    newKnown.add(card.id);
    setKnown(newKnown);
    setFlipped(false);
    if (newKnown.size === cards.length) { setDone(true); return; }
    const nextIdx = remaining.findIndex((c, i) => i > idx && !newKnown.has(c.id));
    setIdx(nextIdx >= 0 ? nextIdx : 0);
  };

  const markReview = () => {
    setFlipped(false);
    const next = (idx + 1) % remaining.length;
    setIdx(next);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-card rounded-3xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h3 className="font-bold text-foreground">📇 Flashcards</h3>
            <p className="text-xs text-muted-foreground">{known.size}/{cards.length} mastered</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-24 bg-muted rounded-full h-2">
              <div className="h-full bg-green-500 rounded-full" style={{ width: `${progress}%` }} />
            </div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-secondary"><X className="w-5 h-5" /></button>
          </div>
        </div>

        {done ? (
          <div className="p-10 text-center">
            <div className="text-5xl mb-4">🎉</div>
            <h3 className="text-xl font-black text-foreground mb-2">All Mastered!</h3>
            <p className="text-muted-foreground mb-6">You've gone through all {cards.length} flashcards</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => { setKnown(new Set()); setIdx(0); setDone(false); setFlipped(false); }}
                className="px-5 py-2.5 rounded-xl border border-border hover:bg-secondary font-semibold text-sm flex items-center gap-2">
                <RotateCcw className="w-4 h-4" /> Restart
              </button>
              <button onClick={onClose} className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm">Done ✓</button>
            </div>
          </div>
        ) : (
          <div className="p-6">
            <p className="text-xs text-center text-muted-foreground mb-4">Card {idx + 1} of {remaining.length} remaining • Tap to flip</p>

            {/* 3D Flip Card */}
            <div className="perspective-1000 cursor-pointer mb-6" onClick={() => setFlipped(f => !f)} style={{ perspective: "1000px" }}>
              <motion.div animate={{ rotateY: flipped ? 180 : 0 }} transition={{ duration: 0.5 }}
                style={{ transformStyle: "preserve-3d", position: "relative", height: "200px" }}>
                {/* Front */}
                <div style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}
                  className="absolute inset-0 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-2xl flex items-center justify-center p-6">
                  <p className="text-white text-lg font-bold text-center leading-relaxed">{card?.front}</p>
                </div>
                {/* Back */}
                <div style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                  className="absolute inset-0 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center p-6">
                  <p className="text-white text-base text-center leading-relaxed">{card?.back}</p>
                </div>
              </motion.div>
            </div>

            {flipped && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3">
                <button onClick={markReview} className="flex-1 py-3 rounded-2xl border-2 border-amber-400 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 font-bold text-sm">
                  🔄 Review Again
                </button>
                <button onClick={markKnown} className="flex-1 py-3 rounded-2xl border-2 border-green-400 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 font-bold text-sm">
                  ✅ Got It!
                </button>
              </motion.div>
            )}
            {!flipped && <p className="text-center text-sm text-muted-foreground mt-2">👆 Tap the card to see the answer</p>}
          </div>
        )}
      </div>
    </div>
  );
};

// ── Audio Player ──────────────────────────────────────────────────────────────
const AudioPlayer = ({ content, onClose }: { content: string; onClose: () => void }) => {
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  const stripped = content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

  const play = () => {
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(stripped);
    utt.rate = speed;
    utt.lang = "en-US";
    utt.onend = () => setPlaying(false);
    utterRef.current = utt;
    window.speechSynthesis.speak(utt);
    setPlaying(true);
  };

  const pause = () => { window.speechSynthesis.pause(); setPlaying(false); };
  const resume = () => { window.speechSynthesis.resume(); setPlaying(true); };
  const stop = () => { window.speechSynthesis.cancel(); setPlaying(false); };

  useEffect(() => () => { window.speechSynthesis.cancel(); }, []);

  return (
    <div className="fixed bottom-20 right-4 z-40 bg-card border border-border rounded-2xl shadow-xl p-4 w-72">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-primary" />
          <span className="text-sm font-bold text-foreground">Read Aloud</span>
        </div>
        <button onClick={() => { stop(); onClose(); }} className="p-1 hover:bg-secondary rounded-lg"><X className="w-4 h-4" /></button>
      </div>
      <div className="flex gap-2 mb-3">
        {!playing ? (
          <button onClick={play} className="flex-1 flex items-center justify-center gap-1.5 bg-primary text-primary-foreground py-2 rounded-xl text-sm font-semibold">
            <Play className="w-4 h-4" /> Play
          </button>
        ) : (
          <button onClick={pause} className="flex-1 flex items-center justify-center gap-1.5 bg-amber-500 text-white py-2 rounded-xl text-sm font-semibold">
            <Pause className="w-4 h-4" /> Pause
          </button>
        )}
        {playing && (
          <button onClick={resume} className="flex-1 flex items-center justify-center gap-1.5 bg-green-500 text-white py-2 rounded-xl text-sm font-semibold">
            <Play className="w-4 h-4" /> Resume
          </button>
        )}
        <button onClick={stop} className="p-2 rounded-xl border border-border hover:bg-secondary"><Square className="w-4 h-4" /></button>
      </div>
      <div className="flex gap-1">
        {[0.75, 1, 1.25, 1.5].map(s => (
          <button key={s} onClick={() => { setSpeed(s); if (playing) { stop(); setTimeout(play, 100); } }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${speed === s ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-secondary/70"}`}>
            {s}x
          </button>
        ))}
      </div>
    </div>
  );
};

// ── Pomodoro Timer ────────────────────────────────────────────────────────────
const PomodoroTimer = ({ onClose }: { onClose: () => void }) => {
  const [mode, setMode] = useState<"study"|"break">("study");
  const [secs, setSecs] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSecs(s => {
          if (s <= 1) {
            clearInterval(intervalRef.current);
            setRunning(false);
            if (mode === "study") {
              setMode("break"); setSecs(5 * 60);
              try { const ctx = new AudioContext(); const osc = ctx.createOscillator(); osc.connect(ctx.destination); osc.frequency.value = 800; osc.start(); setTimeout(() => osc.stop(), 300); } catch {}
            } else { setMode("study"); setSecs(25 * 60); }
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, mode]);

  const fmt = (s: number) => `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;

  return (
    <div className="fixed top-20 right-4 z-40 bg-card border border-border rounded-2xl shadow-xl p-4 w-52">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-bold flex items-center gap-1.5">
          {mode === "study" ? "🍅 Study" : "☕ Break"}
        </span>
        <button onClick={onClose} className="p-1 hover:bg-secondary rounded"><X className="w-3.5 h-3.5" /></button>
      </div>
      <div className={`text-3xl font-black text-center font-mono mb-3 ${mode === "study" ? "text-red-500" : "text-green-500"}`}>{fmt(secs)}</div>
      <div className="flex gap-2">
        <button onClick={() => setRunning(r => !r)}
          className={`flex-1 py-2 rounded-xl text-white text-sm font-semibold ${running ? "bg-amber-500" : "bg-primary"}`}>
          {running ? "Pause" : "Start"}
        </button>
        <button onClick={() => { setRunning(false); setMode("study"); setSecs(25*60); }}
          className="p-2 rounded-xl border border-border hover:bg-secondary">
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

// ── Gamification Bar ──────────────────────────────────────────────────────────
const GamificationBar = ({ userId }: { userId: string }) => {
  const { data: g } = useGamification(userId);
  if (!g) return null;
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <span className="text-sm font-bold text-amber-600 flex items-center gap-1">⭐ {g.total_points} pts</span>
      <span className="text-sm font-bold text-orange-500 flex items-center gap-1">🔥 {g.streak_days} day streak</span>
      {(g.badges || []).slice(0, 3).map((b: string) => {
        const badge = [
          { id: "first_step", emoji: "🌟" }, { id: "bookworm", emoji: "📚" },
          { id: "quiz_master", emoji: "🏆" }, { id: "on_fire", emoji: "🔥" },
          { id: "legend", emoji: "👑" }, { id: "top_student", emoji: "⭐" },
        ].find(x => x.id === b);
        return badge ? <span key={b} title={b} className="text-lg">{badge.emoji}</span> : null;
      })}
    </div>
  );
};

// ── Main Chapter Page ─────────────────────────────────────────────────────────
const ChapterPage = () => {
  const { subject: subjectSlug, chapter: chapterSlug } = useParams<{ subject: string; chapter: string }>();
  const { user } = useAuth();
  const contentRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<HTMLDivElement>(null);
  const [readProgress, setReadProgress] = useState(0);
  const [bookmarked, setBookmarked] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [helpful, setHelpful] = useState<"yes"|"no"|null>(null);
  const [showAudio, setShowAudio] = useState(false);
  const [showPomodoro, setShowPomodoro] = useState(false);
  const [showFlashcards, setShowFlashcards] = useState(false);

  const { data: subjects = [] } = useNoteSubjects();
  const subject = subjects.find(s => s.slug === subjectSlug);
  const { data: chapters = [] } = useNoteChapters(subject?.id);
  const chapter = chapters.find(c => c.slug === chapterSlug);
  const { data: progress = [] } = useNoteProgress(user?.id);
  const { data: quiz } = useNoteQuiz(chapter?.id);
  const { data: flashcards = [] } = useFlashcards(chapter?.id);

  const chapterIdx = chapters.findIndex(c => c.slug === chapterSlug);
  const prevChapter = chapters[chapterIdx - 1];
  const nextChapter = chapters[chapterIdx + 1];

  useEffect(() => {
    if (!chapter || !progress.length) return;
    const p = progress.find(p => p.chapter_id === chapter.id);
    if (p) { setBookmarked(p.bookmarked); setCompleted(p.completed); }
  }, [chapter, progress]);

  useEffect(() => {
    if (user && chapter) {
      saveProgress(user.id, chapter.id, { started: true });
      awardPoints(user.id, 5);
      incrementViewCount(chapter.id);
    }
  }, [user?.id, chapter?.id]);

  const onScroll = useCallback(() => {
    if (!contentRef.current) return;
    const { scrollTop, clientHeight } = document.documentElement;
    const elTop = contentRef.current.getBoundingClientRect().top + window.scrollY;
    const elHeight = contentRef.current.offsetHeight;
    const pct = Math.min(100, Math.max(0, Math.round(((scrollTop - elTop + clientHeight) / elHeight) * 100)));
    setReadProgress(pct);
    if (pct >= 50 && user && chapter) awardPoints(user.id, 0); // mark activity
    if (pct >= 90 && !completed && user && chapter) {
      setCompleted(true);
      saveProgress(user.id, chapter.id, { completed: true });
      awardPoints(user.id, 20, "first_step");
    }
  }, [completed, user, chapter]);

  useEffect(() => {
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, [onScroll]);

  // Fixed animation runner with cleanup
  useEffect(() => {
    if (!chapter?.animation_code || !animRef.current) return;
    const container = animRef.current;
    container.innerHTML = "";
    const runningIntervals: ReturnType<typeof setInterval>[] = [];

    try {
      // Wrap code to track intervals
      const wrappedCode = chapter.animation_code.replace(/setInterval\s*\(/g, "__trackedInterval(");
      // eslint-disable-next-line no-new-func
      const fn = new Function("container", "__trackedInterval", wrappedCode);
      const trackedInterval = (cb: () => void, ms: number) => {
        const id = setInterval(cb, ms);
        runningIntervals.push(id);
        return id;
      };
      fn(container, trackedInterval);
    } catch (e: any) {
      container.innerHTML = `<div style="padding:20px;color:#ef4444;font-family:monospace;font-size:12px;background:#fef2f2;border-radius:12px">⚠️ Animation Error: ${e.message}<br/><br/>Please check the animation code in admin panel.</div>`;
    }
    return () => {
      runningIntervals.forEach(id => clearInterval(id));
      container.innerHTML = "";
    };
  }, [chapter?.animation_code]);

  const toggleBookmark = async () => {
    if (!user || !chapter) return;
    const next = !bookmarked;
    setBookmarked(next);
    await saveProgress(user.id, chapter.id, { bookmarked: next });
    if (next) await awardPoints(user.id, 5);
  };

  const incrementViewCount = async (id: string) => {
    const { incrementViewCount: inc } = await import("@/hooks/useNotes");
    await inc(id);
  };

  if (!subject || !chapter) return (
    <PageLayout>
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <p className="text-4xl mb-4">📭</p>
        <p className="font-semibold text-foreground">Chapter not found</p>
        <Link to="/notes" className="text-primary text-sm mt-2 inline-block">← Back to Notes</Link>
      </div>
    </PageLayout>
  );

  return (
    <PageLayout>
      {/* Reading progress bar */}
      <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-muted">
        <div className="h-full transition-all duration-300" style={{ width: `${readProgress}%`, backgroundColor: subject.color }} />
      </div>

      {/* Floating tools */}
      {showAudio && chapter.content && <AudioPlayer content={chapter.content} onClose={() => setShowAudio(false)} />}
      {showPomodoro && <PomodoroTimer onClose={() => setShowPomodoro(false)} />}
      {showFlashcards && <FlashcardMode chapterId={chapter.id} onClose={() => setShowFlashcards(false)} />}

      {/* Floating action buttons */}
      <div className="fixed bottom-24 right-4 z-40 flex flex-col gap-2">
        <button onClick={() => setShowPomodoro(v => !v)} title="Study Timer"
          className="w-12 h-12 rounded-full bg-red-500 text-white shadow-lg hover:bg-red-600 flex items-center justify-center text-xl">
          🍅
        </button>
        {(chapter.audio_enabled !== false) && (
          <button onClick={() => setShowAudio(v => !v)} title="Read Aloud"
            className="w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg hover:opacity-90 flex items-center justify-center">
            <Volume2 className="w-5 h-5" />
          </button>
        )}
        {flashcards.length > 0 && (
          <button onClick={() => setShowFlashcards(true)} title="Flashcards"
            className="w-12 h-12 rounded-full bg-emerald-500 text-white shadow-lg hover:bg-emerald-600 flex items-center justify-center">
            📇
          </button>
        )}
      </div>

      <div className="max-w-5xl mx-auto px-3 md:px-4 py-6 md:py-8 flex gap-6 md:gap-8">

        {/* Desktop sidebar */}
        <aside className="hidden lg:block w-60 shrink-0">
          <div className="sticky top-8 bg-card border border-border rounded-2xl overflow-hidden">
            <div className="p-4 text-white font-bold text-sm" style={{ backgroundColor: subject.color }}>
              {subject.emoji} {subject.name}
            </div>
            <div className="p-2 max-h-[70vh] overflow-y-auto">
              {chapters.map((ch, i) => (
                <Link key={ch.id} to={`/notes/${subjectSlug}/${ch.slug}`}>
                  <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-colors ${ch.slug === chapterSlug ? "font-bold text-white" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
                    style={ch.slug === chapterSlug ? { backgroundColor: subject.color } : {}}>
                    <span className="w-5 h-5 rounded-full bg-current/20 flex items-center justify-center text-[10px] font-black shrink-0">{i + 1}</span>
                    <span className="truncate">{ch.title}</span>
                    {progress.find(p => p.chapter_id === ch.id && p.completed) && <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </aside>

        {/* Mobile sidebar */}
        {sidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
            <div className="relative w-72 bg-card h-full flex flex-col">
              <div className="p-4 text-white font-bold flex justify-between" style={{ backgroundColor: subject.color }}>
                <span>{subject.emoji} {subject.name}</span>
                <button onClick={() => setSidebarOpen(false)}><X className="w-5 h-5" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-2">
                {chapters.map((ch, i) => (
                  <Link key={ch.id} to={`/notes/${subjectSlug}/${ch.slug}`} onClick={() => setSidebarOpen(false)}>
                    <div className={`flex items-center gap-2 px-3 py-3 rounded-xl text-sm ${ch.slug === chapterSlug ? "font-bold text-white" : "text-muted-foreground"}`}
                      style={ch.slug === chapterSlug ? { backgroundColor: subject.color } : {}}>
                      <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] shrink-0">{i + 1}</span>
                      <span className="flex-1 truncate">{ch.title}</span>
                      {progress.find(p => p.chapter_id === ch.id && p.completed) && <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}

        <main className="flex-1 min-w-0">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4 flex-wrap">
            <Link to="/notes" className="hover:text-foreground">Notes</Link>
            <ChevronRight className="w-3 h-3" />
            <Link to={`/notes/${subjectSlug}`} className="hover:text-foreground">{subject.name}</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-foreground font-medium truncate max-w-[150px]">{chapter.title}</span>
          </div>

          {/* Gamification bar */}
          {user && <div className="mb-4"><GamificationBar userId={user.id} /></div>}

          {/* Chapter header */}
          <div className="relative overflow-hidden rounded-3xl p-6 md:p-8 mb-6 md:mb-8 text-white"
            style={{ background: `linear-gradient(135deg, ${subject.color}, ${subject.color}99)` }}>
            <div className="absolute top-0 right-0 text-7xl md:text-8xl opacity-10">{subject.emoji}</div>
            <div className="relative">
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span className="bg-white/20 px-2.5 py-1 rounded-full text-xs font-bold">Chapter {chapter.chapter_number}</span>
                <span className="bg-white/20 px-2.5 py-1 rounded-full text-xs font-bold capitalize">{chapter.difficulty}</span>
                {completed && <span className="bg-green-500 px-2.5 py-1 rounded-full text-xs font-bold">✓ Completed</span>}
              </div>
              <h1 className="text-xl md:text-3xl font-black leading-tight mb-2 md:mb-3">{chapter.title}</h1>
              {chapter.description && <p className="text-white/80 text-sm">{chapter.description}</p>}

              <div className="flex flex-wrap items-center gap-2 md:gap-4 mt-4">
                <div className="flex items-center gap-1.5 text-sm text-white/80">
                  <Clock className="w-4 h-4" /> {chapter.read_time_mins} min
                </div>
                {chapter.animation_code && <div className="flex items-center gap-1.5 text-sm text-white/80"><Zap className="w-4 h-4" /> Interactive</div>}
                {flashcards.length > 0 && <div className="flex items-center gap-1.5 text-sm text-white/80">📇 {flashcards.length} cards</div>}

                <div className="ml-auto flex flex-wrap items-center gap-2">
                  <button onClick={toggleBookmark}
                    className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-xl text-sm font-medium transition-colors">
                    {bookmarked ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                    <span className="hidden sm:inline">{bookmarked ? "Saved" : "Save"}</span>
                  </button>
                  {chapter.pdf_url && (
                    <a href={chapter.pdf_url} target="_blank" rel="noreferrer"
                      className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-xl text-sm font-medium">
                      <Download className="w-4 h-4" /> <span className="hidden sm:inline">PDF</span>
                    </a>
                  )}
                  <button onClick={() => setSidebarOpen(true)}
                    className="lg:hidden flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-xl text-sm font-medium">
                    <Menu className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Chapter Content */}
          <div ref={contentRef}
            className="notes-content prose prose-base md:prose-lg max-w-none dark:prose-invert
              prose-h2:text-orange-500 prose-h2:font-black
              prose-h3:text-blue-600 prose-h3:font-bold
              prose-strong:text-foreground
              prose-code:bg-primary/10 prose-code:text-primary prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
              prose-table:border prose-th:bg-muted prose-td:border prose-td:border-border"
            style={{ fontSize: "17px", lineHeight: "1.85" }}>
            {chapter.content
              ? <div dangerouslySetInnerHTML={{ __html: chapter.content }} />
              : <div className="text-center py-16 text-muted-foreground"><p className="text-4xl mb-3">📝</p><p>Content coming soon...</p></div>
            }
          </div>

          {/* Interactive Animation */}
          {chapter.animation_code && (
            <div className="mt-8">
              <h3 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                <Zap className="w-5 h-5 text-violet-500" /> Interactive Demo
              </h3>
              <div ref={animRef} className="bg-white border border-border rounded-2xl overflow-hidden"
                style={{ minHeight: "300px" }} />
              <button onClick={() => {
                if (!animRef.current || !chapter.animation_code) return;
                const container = animRef.current;
                container.innerHTML = "";
                const intervals: ReturnType<typeof setInterval>[] = [];
                try {
                  const wrapped = chapter.animation_code.replace(/setInterval\s*\(/g, "__ti(");
                  // eslint-disable-next-line no-new-func
                  new Function("container", "__ti", wrapped)(container, (cb: () => void, ms: number) => { const id = setInterval(cb, ms); intervals.push(id); return id; });
                } catch {}
              }} className="mt-2 text-xs text-muted-foreground flex items-center gap-1.5 hover:text-foreground">
                <RotateCcw className="w-3.5 h-3.5" /> Restart Animation
              </button>
            </div>
          )}

          {/* Chart / Graph */}
          <ChapterChart config={chapter.graph_config} />

          {/* Helpful */}
          <div className="mt-8 flex items-center gap-4 bg-secondary/50 rounded-2xl p-4">
            <p className="text-sm font-semibold text-foreground flex-1">Was this chapter helpful?</p>
            <div className="flex gap-2">
              <button onClick={() => setHelpful("yes")}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${helpful === "yes" ? "bg-green-500 text-white" : "bg-card border border-border hover:border-green-500"}`}>
                <ThumbsUp className="w-4 h-4" /> Yes
              </button>
              <button onClick={() => setHelpful("no")}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${helpful === "no" ? "bg-red-500 text-white" : "bg-card border border-border hover:border-red-400"}`}>
                <ThumbsDown className="w-4 h-4" /> No
              </button>
            </div>
          </div>

          {/* Flashcards button */}
          {flashcards.length > 0 && (
            <button onClick={() => setShowFlashcards(true)}
              className="mt-6 w-full flex items-center justify-center gap-2 py-4 rounded-2xl border-2 border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 font-bold hover:bg-emerald-100 transition-colors">
              📇 Study {flashcards.length} Flashcards
            </button>
          )}

          {/* Quiz */}
          {quiz && user && <AdaptiveQuiz quizId={quiz.id} chapterId={chapter.id} userId={user.id} />}
          {!user && quiz && (
            <div className="mt-10 bg-primary/5 border border-primary/20 rounded-2xl p-6 text-center">
              <Trophy className="w-8 h-8 text-primary mx-auto mb-2" />
              <p className="font-semibold text-foreground">Sign in to take the quiz and track your progress</p>
              <Link to="/auth/signin" className="inline-block mt-3 bg-primary text-primary-foreground px-6 py-2 rounded-xl text-sm font-semibold">Sign In</Link>
            </div>
          )}

          {/* Prev / Next */}
          <div className="flex gap-3 mt-8 mb-4">
            {prevChapter ? (
              <Link to={`/notes/${subjectSlug}/${prevChapter.slug}`} className="flex-1">
                <div className="flex items-center gap-3 bg-card border border-border hover:border-primary/50 rounded-2xl p-4 transition-all hover:shadow-md group h-full">
                  <ArrowLeft className="w-5 h-5 text-muted-foreground group-hover:text-primary shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Previous</p>
                    <p className="text-sm font-semibold text-foreground truncate">{prevChapter.title}</p>
                  </div>
                </div>
              </Link>
            ) : <div className="flex-1" />}
            {nextChapter && (
              <Link to={`/notes/${subjectSlug}/${nextChapter.slug}`} className="flex-1">
                <div className="flex items-center gap-3 bg-card border border-border hover:border-primary/50 rounded-2xl p-4 transition-all hover:shadow-md group h-full">
                  <div className="min-w-0 text-right flex-1">
                    <p className="text-xs text-muted-foreground">Next</p>
                    <p className="text-sm font-semibold text-foreground truncate">{nextChapter.title}</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary shrink-0" />
                </div>
              </Link>
            )}
          </div>

          {/* Mobile chapter nav bar */}
          <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-card/95 backdrop-blur-sm border-t border-border flex">
            {prevChapter ? (
              <Link to={`/notes/${subjectSlug}/${prevChapter.slug}`} className="flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-semibold text-muted-foreground hover:text-foreground">
                <ArrowLeft className="w-4 h-4" /> Prev
              </Link>
            ) : <div className="flex-1" />}
            <button onClick={() => setSidebarOpen(true)}
              className="flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-semibold text-primary border-x border-border">
              <BookOpen className="w-4 h-4" /> Chapters
            </button>
            {nextChapter ? (
              <Link to={`/notes/${subjectSlug}/${nextChapter.slug}`} className="flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-semibold text-muted-foreground hover:text-foreground">
                Next <ArrowRight className="w-4 h-4" />
              </Link>
            ) : <div className="flex-1" />}
          </div>
        </main>
      </div>
    </PageLayout>
  );
};

export default ChapterPage;
