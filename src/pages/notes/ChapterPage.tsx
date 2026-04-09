import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Clock, Bookmark, BookmarkCheck, Download, CircleCheck as CheckCircle, ChevronRight, Zap, Trophy, RotateCcw, ThumbsUp, ThumbsDown, Menu, X, Volume2, Play, Pause, Square, Timer, CreditCard, BookOpen, Star, Award } from "lucide-react";
import PageLayout from "@/components/layout/PageLayout";
import ChapterChart from "@/components/notes/ChapterChart";
import FlashcardMode from "@/components/notes/FlashcardMode";
import AdaptiveQuiz from "@/components/notes/AdaptiveQuiz";
import PrintOptimized from "@/components/notes/PrintOptimized";
import {
  useNoteSubjects, useNoteChapters, useNoteQuiz, useNoteQuestions,
  useNoteProgress, useFlashcards, useHighlights, useGamification,
  saveProgress, saveQuizResult, saveWrongAnswer, removeWrongAnswer,
  awardPoints, incrementViewCount, NoteQuestion
} from "@/hooks/useNotes";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import confetti from "canvas-confetti";

// ── FIXED Audio Player Component ─────────────────────────────────────────────
const AudioPlayer = ({ content, onClose }: { content: string; onClose: () => void }) => {
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [progress, setProgress] = useState(0);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);
  const textRef = useRef<string>("");

  // Extract text from HTML — the KEY fix for the nano-second stop bug
  // Chrome cancels speech if the utterance text is empty or if voices not loaded
  const getCleanText = (html: string): string => {
    const tmp = document.createElement("div");
    tmp.innerHTML = html;
    // Remove scripts and style tags
    tmp.querySelectorAll("script, style").forEach(el => el.remove());
    const raw = tmp.textContent || tmp.innerText || "";
    // Clean up whitespace
    return raw.replace(/\s+/g, " ").replace(/\n+/g, " ").trim().substring(0, 8000);
  };

  const speak = (rate: number) => {
    window.speechSynthesis.cancel();

    // Wait for voices to load — this is the main reason it stops instantly in Chrome
    const doSpeak = () => {
      const text = textRef.current;
      if (!text || text.length < 5) return;

      const utt = new SpeechSynthesisUtterance(text);
      utt.rate = rate;
      utt.pitch = 1.0;
      utt.volume = 1.0;
      utt.lang = "en-US";

      // Pick best English voice
      const voices = window.speechSynthesis.getVoices();
      const best = voices.find(v => v.name.includes("Google US English"))
        || voices.find(v => v.name.includes("Samantha"))
        || voices.find(v => v.lang === "en-US" && !v.localService)
        || voices.find(v => v.lang.startsWith("en"))
        || voices[0];
      if (best) utt.voice = best;

      utt.onstart = () => { setPlaying(true); setPaused(false); };
      utt.onend   = () => { setPlaying(false); setPaused(false); setProgress(100); };
      utt.onpause = () => { setPaused(true); };
      utt.onresume = () => { setPaused(false); };
      utt.onerror = (e) => {
        if (e.error !== "canceled" && e.error !== "interrupted") {
          setPlaying(false); setPaused(false);
        }
      };
      utt.onboundary = (e) => {
        if (e.name === "word") setProgress(Math.round((e.charIndex / text.length) * 100));
      };

      utterRef.current = utt;
      window.speechSynthesis.speak(utt);

      // Chrome-specific: it pauses after ~15s without this keepAlive
      // This is the #1 bug causing audio to stop in nano seconds on some browsers
    };

    // Chrome needs voices to be loaded first
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      doSpeak();
    } else {
      // Voices not loaded yet — wait for them
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.onvoiceschanged = null;
        doSpeak();
      };
      // Fallback: try after 500ms anyway
      setTimeout(doSpeak, 500);
    }
  };

  // Chrome keepAlive fix — Chrome stops TTS after ~15 seconds without this
  useEffect(() => {
    if (!playing || paused) return;
    const keepAlive = setInterval(() => {
      if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      }
    }, 10000);
    return () => clearInterval(keepAlive);
  }, [playing, paused]);

  // Load text on mount
  useEffect(() => {
    textRef.current = getCleanText(content);
  }, [content]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { window.speechSynthesis.cancel(); };
  }, []);

  const handlePlay = () => {
    if (paused) {
      window.speechSynthesis.resume();
      setPaused(false); setPlaying(true);
    } else {
      speak(speed);
    }
  };
  const handlePause = () => { window.speechSynthesis.pause(); setPaused(true); };
  const handleStop  = () => { window.speechSynthesis.cancel(); setPlaying(false); setPaused(false); setProgress(0); };
  const handleSpeed = (s: number) => {
    setSpeed(s);
    if (playing || paused) { handleStop(); setTimeout(() => speak(s), 300); }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed bottom-24 right-4 z-50 bg-card border border-border rounded-2xl shadow-2xl p-4 w-72"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-primary" />
          <span className="text-sm font-bold text-foreground">Read Aloud</span>
          {playing && !paused && (
            <span className="flex gap-0.5 items-end h-4">
              {[0,1,2].map(i => (
                <span key={i} className="w-1 bg-primary rounded-full animate-pulse"
                  style={{ height: `${8+i*4}px`, animationDelay: `${i*150}ms` }} />
              ))}
            </span>
          )}
        </div>
        <button onClick={() => { handleStop(); onClose(); }} className="p-1 hover:bg-secondary rounded-lg transition-colors">
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-muted rounded-full mb-3 overflow-hidden">
        <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
      </div>

      {/* Controls */}
      <div className="flex gap-2 mb-3">
        {!playing || paused ? (
          <button onClick={handlePlay}
            className="flex-1 flex items-center justify-center gap-1.5 bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity">
            <Play className="w-4 h-4" /> {paused ? "Resume" : "Play"}
          </button>
        ) : (
          <button onClick={handlePause}
            className="flex-1 flex items-center justify-center gap-1.5 bg-amber-500 text-white py-2.5 rounded-xl text-sm font-semibold hover:opacity-90">
            <Pause className="w-4 h-4" /> Pause
          </button>
        )}
        <button onClick={handleStop}
          className="w-10 h-10 flex items-center justify-center border border-border rounded-xl hover:bg-secondary transition-colors">
          <Square className="w-4 h-4" />
        </button>
      </div>

      {/* Speed */}
      <div className="flex gap-1">
        {[0.75, 1, 1.25, 1.5].map(s => (
          <button key={s} onClick={() => handleSpeed(s)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors ${speed === s ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-secondary/70"}`}>
            {s}x
          </button>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground text-center mt-2">
        {textRef.current.length > 0 ? `~${Math.ceil(textRef.current.length / (speed * 200))} min read` : "Loading..."}
      </p>
    </motion.div>
  )
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
  const [showPrint, setShowPrint] = useState(false);
  const [liteMode, setLiteMode] = useState(() => {
    const saved = localStorage.getItem("lite-mode");
    if (saved) return JSON.parse(saved);
    if (typeof navigator !== "undefined" && (navigator as any).connection) {
      const type = (navigator as any).connection.effectiveType;
      return type === "2g" || type === "slow-2g";
    }
    return false;
  });

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
      (async () => {
        await incrementViewCount(chapter.id);
      })();
    }
  }, [user?.id, chapter?.id]);

  const onScroll = useCallback(() => {
    if (!contentRef.current) return;
    const { scrollTop, clientHeight } = document.documentElement;
    const elTop = contentRef.current.getBoundingClientRect().top + window.scrollY;
    const elHeight = contentRef.current.offsetHeight;
    const pct = Math.min(100, Math.max(0, Math.round(((scrollTop - elTop + clientHeight) / elHeight) * 100)));
    setReadProgress(pct);
    if (pct >= 50 && user && chapter) awardPoints(user.id, 0);
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

  useEffect(() => {
    localStorage.setItem("lite-mode", JSON.stringify(liteMode));
  }, [liteMode]);

  useEffect(() => {
    if (!chapter?.animation_code || !animRef.current) return;
    const container = animRef.current;
    container.innerHTML = "";
    const runningIntervals: ReturnType<typeof setInterval>[] = [];

    try {
      const wrappedCode = chapter.animation_code
        .replace(/setInterval\s*\(/g, "__trackedInterval(")
        .replace(
          /canvas\.width\s*=\s*(\d+)/g,
          `canvas.width = Math.min($1, container.offsetWidth || $1)`
        );
      const fn = new Function("container", "__trackedInterval", wrappedCode);
      const trackedInterval = (cb: () => void, ms: number) => {
        const id = setInterval(cb, ms);
        runningIntervals.push(id);
        return id;
      };
      fn(container, trackedInterval);
    } catch (e: any) {
      container.innerHTML = `<div style="padding:20px;color:#ef4444;font-family:monospace;font-size:13px;background:#fef2f2;border-radius:12px;word-break:break-word">⚠️ Animation Error: ${String(e.message)}<br/><br/>Check the animation code in admin panel.</div>`;
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
      {showPrint && <PrintOptimized chapter={chapter} subject={subject} schoolName="GHS Babi Khel" onClose={() => setShowPrint(false)} />}

      {/* Floating action buttons */}
      <div className="fixed bottom-28 right-4 z-40 flex flex-col gap-2">
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
                  <button onClick={() => setShowPrint(true)}
                    className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-xl text-sm font-medium transition-colors">
                    <Download className="w-4 h-4" /> <span className="hidden sm:inline">Print</span>
                  </button>
                  {chapter.pdf_url && (
                    <a href={chapter.pdf_url} target="_blank" rel="noreferrer"
                      className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-xl text-sm font-medium">
                      <Download className="w-4 h-4" /> <span className="hidden sm:inline">PDF</span>
                    </a>
                  )}
                  <button onClick={() => setLiteMode(!liteMode)} title={liteMode ? "Disable Lite Mode" : "Enable Lite Mode"}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${liteMode ? "bg-white/30 text-white" : "bg-white/20 hover:bg-white/30 text-white"}`}>
                    {liteMode ? "🔆" : "📡"}
                  </button>
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
            className={`notes-content prose prose-base md:prose-lg max-w-none dark:prose-invert
              prose-h2:text-orange-500 prose-h2:font-black
              prose-h3:text-blue-600 prose-h3:font-bold
              prose-strong:text-foreground
              prose-code:bg-primary/10 prose-code:text-primary prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
              prose-table:border prose-th:bg-muted prose-td:border prose-td:border-border ${liteMode ? "prose-img:hidden" : ""}`}
            style={{ fontSize: "17px", lineHeight: "1.85" }}>
            {chapter.content
              ? <div dangerouslySetInnerHTML={{ __html: liteMode ? chapter.content.replace(/<img[^>]*>/g, "") : chapter.content }} />
              : <div className="text-center py-16 text-muted-foreground"><p className="text-4xl mb-3">📝</p><p>Content coming soon...</p></div>
            }
          </div>

          {/* Interactive Animation */}
          {chapter.animation_code && !liteMode && (
            <div className="mt-8">
              <h3 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                <Zap className="w-5 h-5 text-violet-500" /> Interactive Demo
              </h3>
              <div
                ref={animRef}
                className="bg-white dark:bg-zinc-900 border border-border rounded-2xl"
                style={{
                  minHeight: "320px",
                  width: "100%",
                  overflowX: "auto",
                  overflowY: "visible",
                  position: "relative",
                  display: "block",
                  boxSizing: "border-box",
                }}
              />
              <button onClick={() => {
                if (!animRef.current || !chapter.animation_code) return;
                const container = animRef.current;
                container.innerHTML = "";
                const intervals: ReturnType<typeof setInterval>[] = [];
                try {
                  const wrapped = chapter.animation_code.replace(/setInterval\s*\(/g, "__ti(");
                  new Function("container", "__ti", wrapped)(container, (cb: () => void, ms: number) => { const id = setInterval(cb, ms); intervals.push(id); return id; });
                } catch {}
              }} className="mt-2 text-xs text-muted-foreground flex items-center gap-1.5 hover:text-foreground">
                <RotateCcw className="w-3.5 h-3.5" /> Restart Animation
              </button>
            </div>
          )}

          {/* Chart / Graph */}
          {!liteMode && <ChapterChart config={chapter.graph_config} />}

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
        


            
