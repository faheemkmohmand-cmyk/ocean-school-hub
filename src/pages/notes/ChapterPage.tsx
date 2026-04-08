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

// ── FIXED Audio Player Component ─────────────────────────────────────────────
const AudioPlayer = ({ content, onClose }: { content: string; onClose: () => void }) => {
  const [status, setStatus] = useState<"idle" | "loading" | "playing" | "paused" | "error">("idle");
  const [speed, setSpeed] = useState(1);
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const synthRef = useRef<typeof window.speechSynthesis | null>(null);
  const contentRef = useRef(content);
  const charIndexRef = useRef(0);

  // Clean text for speech
  const cleanText = useCallback((html: string) => {
    return html
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/\s+/g, " ")
      .trim()
      .substring(0, 5000);
  }, []);

  // Initialize speech synthesis
  useEffect(() => {
    if (!window.speechSynthesis) {
      setStatus("error");
      setErrorMsg("Your browser doesn't support text-to-speech");
      return;
    }

    synthRef.current = window.speechSynthesis;
    
    // CRITICAL FIX: Some browsers need resume()
    if (synthRef.current.paused) {
      synthRef.current.resume();
    }

    // Cancel any existing speech
    synthRef.current.cancel();

    return () => {
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);

  const startSpeech = useCallback((rate: number, startFrom: number = 0) => {
    if (!synthRef.current) return;

    // CRITICAL: Cancel and wait a bit
    synthRef.current.cancel();
    
    setTimeout(() => {
      const text = cleanText(contentRef.current);
      if (!text) {
        setErrorMsg("No content to read");
        setStatus("error");
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utteranceRef.current = utterance;
      
      // Configure
      utterance.rate = rate;
      utterance.pitch = 1;
      utterance.volume = 1;
      
      // Get voices and set good one
      const voices = synthRef.current.getVoices();
      const preferredVoice = voices.find(v => 
        v.name.includes("Google US English") || 
        v.name.includes("Samantha") ||
        v.name.includes("Daniel") ||
        (v.lang === "en-US" && v.localService === false)
      );
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      // Event handlers
      utterance.onstart = () => {
        setStatus("playing");
        setErrorMsg("");
      };
      
      utterance.onend = () => {
        setStatus("idle");
        setProgress(100);
      };
      
      utterance.onpause = () => setStatus("paused");
      
      utterance.onerror = (event) => {
        console.error("Speech error:", event);
        if (event.error !== "canceled") {
          setErrorMsg(`Speech error: ${event.error}`);
          setStatus("error");
        }
      };

      utterance.onboundary = (event) => {
        if (event.name === "word") {
          charIndexRef.current = event.charIndex;
          const percent = (event.charIndex / text.length) * 100;
          setProgress(percent);
        }
      };

      // CRITICAL FIX: Some browsers need this hack
      if (synthRef.current.speaking) {
        synthRef.current.cancel();
      }

      // Speak with retry
      try {
        synthRef.current.speak(utterance);
        
        // Chrome mobile fix: resume after short delay
        setTimeout(() => {
          if (synthRef.current?.paused) {
            synthRef.current.resume();
          }
        }, 100);
        
      } catch (err) {
        setErrorMsg("Failed to start speech");
        setStatus("error");
      }
    }, 100);
  }, [cleanText]);

  const play = () => {
    if (status === "paused" && utteranceRef.current) {
      synthRef.current?.resume();
      setStatus("playing");
    } else {
      setStatus("loading");
      startSpeech(speed);
    }
  };

  const pause = () => {
    synthRef.current?.pause();
    setStatus("paused");
  };

  const stop = () => {
    synthRef.current?.cancel();
    setStatus("idle");
    setProgress(0);
    charIndexRef.current = 0;
  };

  const changeSpeed = (newSpeed: number) => {
    setSpeed(newSpeed);
    if (status === "playing") {
      // Restart with new speed
      const currentProgress = charIndexRef.current;
      stop();
      setTimeout(() => {
        startSpeech(newSpeed, currentProgress);
      }, 150);
    }
  };

  // Auto-play on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      play();
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop();
    };
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      className="fixed bottom-24 right-4 z-50 bg-card border border-border rounded-2xl shadow-2xl p-5 w-80 backdrop-blur-md"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Volume2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-foreground">Read Aloud</h4>
            <p className="text-xs text-muted-foreground">
              {status === "playing" ? "Speaking..." : 
               status === "paused" ? "Paused" : 
               status === "loading" ? "Loading..." : 
               status === "error" ? "Error" : "Ready"}
            </p>
          </div>
        </div>
        <button 
          onClick={() => { stop(); onClose(); }}
          className="p-2 hover:bg-destructive/10 hover:text-destructive rounded-lg transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Error Display */}
      <AnimatePresence>
        {errorMsg && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2"
          >
            <span className="text-xs text-destructive">{errorMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-primary rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1 text-right">{Math.round(progress)}%</p>
      </div>

      {/* Controls */}
      <div className="flex gap-2 mb-4">
        {status === "playing" ? (
          <button 
            onClick={pause}
            className="flex-1 flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white py-2.5 rounded-xl font-semibold transition-colors"
          >
            <Pause className="w-4 h-4" /> Pause
          </button>
        ) : (
          <button 
            onClick={play}
            disabled={status === "loading"}
            className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground py-2.5 rounded-xl font-semibold transition-colors disabled:opacity-50"
          >
            {status === "loading" ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            {status === "paused" ? "Resume" : "Play"}
          </button>
        )}
        
        <button 
          onClick={stop}
          className="p-2.5 border border-border hover:bg-secondary rounded-xl transition-colors"
        >
          <Square className="w-4 h-4" />
        </button>
      </div>

      {/* Speed Control */}
      <div className="flex gap-1 bg-muted/50 p-1 rounded-xl">
        {[0.5, 0.75, 1, 1.25, 1.5, 2].map((s) => (
          <button
            key={s}
            onClick={() => changeSpeed(s)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
              speed === s 
                ? "bg-primary text-primary-foreground shadow-sm" 
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            {s}x
          </button>
        ))}
      </div>

      {/* Status Indicator */}
      <div className="mt-3 flex items-center justify-center gap-2">
        <span className={`w-2 h-2 rounded-full animate-pulse ${
          status === "playing" ? "bg-green-500" : 
          status === "error" ? "bg-destructive" : 
          "bg-muted"
        }`} />
        <span className="text-xs text-muted-foreground">
          {status === "playing" ? "Audio playing" : 
           status === "paused" ? "Audio paused" : 
           status === "error" ? "Check error above" : 
           "Click play to start"}
        </span>
      </div>
    </motion.div>
  );
};

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
      <div style={{ width: "100%", overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
      <ResponsiveContainer width="100%" height={300} minWidth={280}>
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
    if (opt === q.correct) return "bg-green-50 border-green-500 dark:bg-green-900/20"
