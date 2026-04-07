import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ArrowRight, Clock, Bookmark, BookmarkCheck,
  Download, CheckCircle, ChevronRight, Zap, Trophy,
  RotateCcw, ThumbsUp, ThumbsDown, Menu, X
} from "lucide-react";
import PageLayout from "@/components/layout/PageLayout";
import {
  useNoteSubjects, useNoteChapters, useNoteQuiz, useNoteQuestions,
  useNoteProgress, saveProgress, saveQuizResult, NoteQuestion
} from "@/hooks/useNotes";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import confetti from "canvas-confetti";

// ── Quiz Component ────────────────────────────────────────────────────────────
const QuizSection = ({ quizId, chapterId, userId }: { quizId: string; chapterId: string; userId: string }) => {
  const { data: questions = [] } = useNoteQuestions(quizId);
  const { data: quiz } = useNoteQuiz(chapterId);
  const [step, setStep] = useState<"start" | "quiz" | "result">("start");
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);

  if (!questions.length) return null;

  const q = questions[current];
  const score = questions.filter((q, i) => answers[i] === q.correct).length;
  const pct = Math.round((score / questions.length) * 100);

  const selectAnswer = (opt: string) => {
    if (revealed) return;
    setSelected(opt);
    setRevealed(true);
    setAnswers(prev => ({ ...prev, [current]: opt }));
  };

  const next = () => {
    if (current < questions.length - 1) {
      setCurrent(c => c + 1);
      setSelected(null);
      setRevealed(false);
    } else {
      const passed = pct >= (quiz?.pass_score || 60);
      saveQuizResult(userId, quizId, score, questions.length, passed);
      saveProgress(userId, chapterId, { completed: true });
      if (passed) confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
      setStep("result");
    }
  };

  const optionStyle = (opt: string) => {
    if (!revealed) return "bg-card border-border hover:border-primary hover:bg-primary/5";
    if (opt === q.correct) return "bg-green-50 border-green-500 dark:bg-green-900/20";
    if (opt === selected && opt !== q.correct) return "bg-red-50 border-red-400 dark:bg-red-900/20";
    return "bg-card border-border opacity-60";
  };

  if (step === "start") return (
    <div className="bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-900/20 dark:to-indigo-900/20 border border-violet-200 dark:border-violet-700/30 rounded-3xl p-8 text-center mt-10">
      <div className="text-5xl mb-4">🧠</div>
      <h3 className="text-2xl font-black text-foreground mb-2">Chapter Quiz</h3>
      <p className="text-muted-foreground mb-2">{questions.length} questions • Pass score: {quiz?.pass_score || 60}%</p>
      <p className="text-sm text-muted-foreground mb-6">Test what you've learned from this chapter</p>
      <button onClick={() => setStep("quiz")}
        className="bg-gradient-to-r from-violet-500 to-indigo-600 text-white font-bold px-8 py-3 rounded-2xl hover:opacity-90 transition-opacity">
        Start Quiz 🚀
      </button>
    </div>
  );

  if (step === "quiz") return (
    <div className="mt-10 bg-card border border-border rounded-3xl overflow-hidden shadow-lg">
      {/* Progress */}
      <div className="h-1.5 bg-muted">
        <div className="h-full bg-gradient-to-r from-violet-500 to-indigo-600 transition-all duration-500"
          style={{ width: `${((current) / questions.length) * 100}%` }} />
      </div>

      <div className="p-6 md:p-8">
        <div className="flex justify-between items-center mb-6">
          <span className="text-sm font-semibold text-muted-foreground">Question {current + 1} of {questions.length}</span>
          <span className="text-sm bg-primary/10 text-primary font-bold px-3 py-1 rounded-full">
            {Object.keys(answers).length}/{questions.length} answered
          </span>
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={current} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <h4 className="text-xl font-bold text-foreground mb-6 leading-relaxed">{q.question}</h4>

            <div className="grid grid-cols-1 gap-3">
              {(["a", "b", "c", "d"] as const).map(opt => (
                <button key={opt} onClick={() => selectAnswer(opt)}
                  disabled={revealed}
                  className={`w-full text-left px-5 py-4 rounded-2xl border-2 font-medium transition-all duration-200 ${optionStyle(opt)}`}>
                  <span className="font-black text-primary mr-3 uppercase">{opt}.</span>
                  {q[`option_${opt}` as keyof NoteQuestion] as string}
                  {revealed && opt === q.correct && <span className="ml-2">✅</span>}
                  {revealed && opt === selected && opt !== q.correct && <span className="ml-2">❌</span>}
                </button>
              ))}
            </div>

            {revealed && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
                {q.explanation && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/30 rounded-xl p-4 text-sm text-blue-800 dark:text-blue-300 mb-4">
                    💡 <strong>Explanation:</strong> {q.explanation}
                  </div>
                )}
                <button onClick={next}
                  className="w-full bg-gradient-to-r from-violet-500 to-indigo-600 text-white font-bold py-3 rounded-2xl hover:opacity-90 transition-opacity">
                  {current < questions.length - 1 ? "Next Question →" : "See Results 🏆"}
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
    const msg = pct === 100 ? "Perfect Score! Amazing!" : pct >= 80 ? "Excellent Work!" : pct >= 60 ? "Good Job! Keep it up!" : "Keep trying! You can do it!";
    return (
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
        className="mt-10 bg-card border border-border rounded-3xl p-8 text-center shadow-lg">
        <div className="text-6xl mb-4">{emoji}</div>
        <h3 className="text-2xl font-black text-foreground mb-1">{msg}</h3>
        <div className="text-5xl font-black text-primary my-4">{score}/{questions.length}</div>
        <div className="w-full bg-muted rounded-full h-4 mb-2">
          <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-600 transition-all"
            style={{ width: `${pct}%` }} />
        </div>
        <p className="text-muted-foreground text-sm mb-6">{pct}% score</p>
        <div className="flex gap-3 justify-center">
          <button onClick={() => { setCurrent(0); setAnswers({}); setSelected(null); setRevealed(false); setStep("quiz"); }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border hover:bg-secondary font-semibold text-sm">
            <RotateCcw className="w-4 h-4" /> Try Again
          </button>
        </div>
      </motion.div>
    );
  }
  return null;
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

  const { data: subjects = [] } = useNoteSubjects();
  const subject = subjects.find(s => s.slug === subjectSlug);
  const { data: chapters = [] } = useNoteChapters(subject?.id);
  const chapter = chapters.find(c => c.slug === chapterSlug);
  const { data: progress = [] } = useNoteProgress(user?.id);
  const { data: quiz } = useNoteQuiz(chapter?.id);

  const chapterIdx = chapters.findIndex(c => c.slug === chapterSlug);
  const prevChapter = chapters[chapterIdx - 1];
  const nextChapter = chapters[chapterIdx + 1];

  // Load progress
  useEffect(() => {
    if (!chapter || !progress.length) return;
    const p = progress.find(p => p.chapter_id === chapter.id);
    if (p) { setBookmarked(p.bookmarked); setCompleted(p.completed); }
  }, [chapter, progress]);

  // Mark as started
  useEffect(() => {
    if (user && chapter) saveProgress(user.id, chapter.id, { started: true });
  }, [user, chapter]);

  // Read progress & auto-complete
  const onScroll = useCallback(() => {
    const el = contentRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
    const elTop = el.getBoundingClientRect().top + window.scrollY;
    const elHeight = el.offsetHeight;
    const pct = Math.min(100, Math.max(0, Math.round(((scrollTop - elTop + clientHeight) / elHeight) * 100)));
    setReadProgress(pct);
    if (pct >= 90 && !completed && user && chapter) {
      setCompleted(true);
      saveProgress(user.id, chapter.id, { completed: true });
    }
  }, [completed, user, chapter]);

  useEffect(() => {
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, [onScroll]);

  // Run custom animation code
  useEffect(() => {
    if (!chapter?.animation_code || !animRef.current) return;
    try {
      const fn = new Function("container", chapter.animation_code);
      fn(animRef.current);
    } catch (e) {
      console.warn("Animation error:", e);
    }
  }, [chapter?.animation_code]);

  const toggleBookmark = async () => {
    if (!user || !chapter) return;
    const next = !bookmarked;
    setBookmarked(next);
    await saveProgress(user.id, chapter.id, { bookmarked: next });
  };

  if (!subject || !chapter) return (
    <PageLayout><div className="max-w-4xl mx-auto px-4 py-20 text-center">
      <p className="text-4xl mb-4">📭</p>
      <p className="font-semibold text-foreground">Chapter not found</p>
      <Link to="/notes" className="text-primary text-sm mt-2 inline-block">Back to Notes</Link>
    </div></PageLayout>
  );

  return (
    <PageLayout>
      {/* Reading progress bar */}
      <div className="fixed top-0 left-0 right-0 z-50 h-1" style={{ backgroundColor: "#e5e7eb" }}>
        <div className="h-full transition-all duration-300" style={{ width: `${readProgress}%`, backgroundColor: subject.color }} />
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 flex gap-8">

        {/* ── Sidebar ── */}
        <>
          {/* Desktop sidebar */}
          <aside className="hidden lg:block w-64 shrink-0">
            <div className="sticky top-8 bg-card border border-border rounded-2xl overflow-hidden">
              <div className="p-4 text-white font-bold text-sm" style={{ backgroundColor: subject.color }}>
                {subject.emoji} {subject.name}
              </div>
              <div className="p-2 max-h-[70vh] overflow-y-auto">
                {chapters.map((ch, i) => (
                  <Link key={ch.id} to={`/notes/${subjectSlug}/${ch.slug}`}>
                    <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                      ch.slug === chapterSlug ? "font-bold text-white" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    }`} style={ch.slug === chapterSlug ? { backgroundColor: subject.color } : {}}>
                      <span className="w-5 h-5 rounded-full bg-current/20 flex items-center justify-center text-[10px] font-black shrink-0">{i + 1}</span>
                      <span className="truncate">{ch.title}</span>
                      {progress.find(p => p.chapter_id === ch.id && p.completed) && <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </aside>

          {/* Mobile sidebar overlay */}
          {sidebarOpen && (
            <div className="lg:hidden fixed inset-0 z-50 flex">
              <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
              <div className="relative w-72 bg-card h-full flex flex-col overflow-hidden">
                <div className="p-4 text-white font-bold flex justify-between" style={{ backgroundColor: subject.color }}>
                  <span>{subject.emoji} {subject.name}</span>
                  <button onClick={() => setSidebarOpen(false)}><X className="w-5 h-5" /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-2">
                  {chapters.map((ch, i) => (
                    <Link key={ch.id} to={`/notes/${subjectSlug}/${ch.slug}`} onClick={() => setSidebarOpen(false)}>
                      <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm ${ch.slug === chapterSlug ? "font-bold text-white" : "text-muted-foreground"}`}
                        style={ch.slug === chapterSlug ? { backgroundColor: subject.color } : {}}>
                        <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] shrink-0">{i + 1}</span>
                        <span className="truncate">{ch.title}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>

        {/* ── Main Content ── */}
        <main className="flex-1 min-w-0">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-6 flex-wrap">
            <Link to="/notes" className="hover:text-foreground transition-colors">Notes</Link>
            <ChevronRight className="w-3 h-3" />
            <Link to={`/notes/${subjectSlug}`} className="hover:text-foreground transition-colors">{subject.name}</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-foreground font-medium">{chapter.title}</span>
          </div>

          {/* Chapter header */}
          <div className="relative overflow-hidden rounded-3xl p-8 mb-8 text-white" style={{ background: `linear-gradient(135deg, ${subject.color}, ${subject.color}99)` }}>
            <div className="absolute top-0 right-0 text-8xl opacity-10">{subject.emoji}</div>
            <div className="relative">
              <div className="flex items-center gap-2 mb-3">
                <span className="bg-white/20 px-2.5 py-1 rounded-full text-xs font-bold">Chapter {chapter.chapter_number}</span>
                <span className="bg-white/20 px-2.5 py-1 rounded-full text-xs font-bold capitalize">{chapter.difficulty}</span>
                {completed && <span className="bg-green-500 px-2.5 py-1 rounded-full text-xs font-bold">✓ Completed</span>}
              </div>
              <h1 className="text-2xl md:text-3xl font-black leading-tight mb-3">{chapter.title}</h1>
              {chapter.description && <p className="text-white/80 text-sm">{chapter.description}</p>}

              <div className="flex flex-wrap items-center gap-4 mt-4">
                <div className="flex items-center gap-1.5 text-sm text-white/80">
                  <Clock className="w-4 h-4" /> {chapter.read_time_mins} min read
                </div>
                {chapter.animation_code && (
                  <div className="flex items-center gap-1.5 text-sm text-white/80">
                    <Zap className="w-4 h-4" /> Interactive
                  </div>
                )}

                <div className="ml-auto flex items-center gap-2">
                  <button onClick={toggleBookmark}
                    className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-xl text-sm font-medium transition-colors">
                    {bookmarked ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                    {bookmarked ? "Bookmarked" : "Bookmark"}
                  </button>
                  {chapter.pdf_url && (
                    <a href={chapter.pdf_url} target="_blank" rel="noreferrer"
                      className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-xl text-sm font-medium transition-colors">
                      <Download className="w-4 h-4" /> PDF
                    </a>
                  )}
                  <button onClick={() => setSidebarOpen(true)}
                    className="lg:hidden flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-xl text-sm font-medium">
                    <Menu className="w-4 h-4" /> Chapters
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ── Notes Content ── */}
          <div ref={contentRef} className="notes-content prose prose-lg max-w-none dark:prose-invert
            prose-h2:text-orange-500 prose-h2:font-black prose-h2:text-2xl
            prose-h3:text-blue-600 prose-h3:font-bold
            prose-strong:text-foreground
            prose-code:bg-primary/10 prose-code:text-primary prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
            prose-table:border prose-th:bg-muted prose-td:border prose-td:border-border">
            {chapter.content ? (
              <div dangerouslySetInnerHTML={{ __html: chapter.content }} />
            ) : (
              <div className="text-center py-16 text-muted-foreground">
                <p className="text-4xl mb-3">📝</p>
                <p>Content coming soon...</p>
              </div>
            )}
          </div>

          {/* ── Interactive Animation Area ── */}
          {chapter.animation_code && (
            <div className="mt-8">
              <h3 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                <Zap className="w-5 h-5 text-violet-500" /> Interactive Demo
              </h3>
              <div ref={animRef} className="bg-card border border-border rounded-2xl min-h-48 overflow-hidden" />
            </div>
          )}

          {/* ── Graph Area ── */}
          {chapter.graph_config && (
            <div className="mt-8 bg-card border border-border rounded-2xl p-6">
              <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                📊 Data Visualization
              </h3>
              <pre className="text-xs text-muted-foreground bg-muted p-4 rounded-xl overflow-auto">
                {JSON.stringify(chapter.graph_config, null, 2)}
              </pre>
            </div>
          )}

          {/* ── Was this helpful ── */}
          <div className="mt-10 flex items-center gap-4 bg-secondary/50 rounded-2xl p-4">
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

          {/* ── Quiz ── */}
          {quiz && user && (
            <QuizSection quizId={quiz.id} chapterId={chapter.id} userId={user.id} />
          )}
          {!user && quiz && (
            <div className="mt-10 bg-primary/5 border border-primary/20 rounded-2xl p-6 text-center">
              <Trophy className="w-8 h-8 text-primary mx-auto mb-2" />
              <p className="font-semibold text-foreground">Sign in to take the quiz and track your progress</p>
              <Link to="/auth/signin" className="inline-block mt-3 bg-primary text-primary-foreground px-6 py-2 rounded-xl text-sm font-semibold">
                Sign In
              </Link>
            </div>
          )}

          {/* ── Prev / Next navigation ── */}
          <div className="flex gap-3 mt-10">
            {prevChapter ? (
              <Link to={`/notes/${subjectSlug}/${prevChapter.slug}`} className="flex-1">
                <div className="flex items-center gap-3 bg-card border border-border hover:border-primary/50 rounded-2xl p-4 transition-all hover:shadow-md group">
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
                <div className="flex items-center gap-3 bg-card border border-border hover:border-primary/50 rounded-2xl p-4 transition-all hover:shadow-md group">
                  <div className="min-w-0 text-right flex-1">
                    <p className="text-xs text-muted-foreground">Next</p>
                    <p className="text-sm font-semibold text-foreground truncate">{nextChapter.title}</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary shrink-0" />
                </div>
              </Link>
            )}
          </div>
        </main>
      </div>
    </PageLayout>
  );
};

export default ChapterPage;
