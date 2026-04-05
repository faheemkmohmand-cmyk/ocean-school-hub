import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { ArrowLeft, Clock, FileText, Trophy, Download, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import {
  usePublishedTests, useMyAttempts, useTestQuestions, useTestAttempts,
  useSubmitAttempt, useAllAttempts,
  Test, TestQuestion, TestAttempt, getGrade, formatTimeTaken
} from "@/hooks/useTests";
import jsPDF from "jspdf";
import "jspdf-autotable";

// ─── Main Component ──────────────────────────────────────────────────
const TestsTab = () => {
  const [view, setView] = useState<"list" | "start" | "test" | "results">("list");
  const [selectedTest, setSelectedTest] = useState<Test | null>(null);
  const [attempt, setAttempt] = useState<TestAttempt | null>(null);

  if (view === "start" && selectedTest) return <StartScreen test={selectedTest} onBegin={() => setView("test")} onBack={() => setView("list")} />;
  if (view === "test" && selectedTest) return <McqScreen test={selectedTest} onComplete={(a) => { setAttempt(a); setView("results"); }} />;
  if (view === "results" && selectedTest) return <ResultsScreen test={selectedTest} attempt={attempt} onBack={() => { setView("list"); setAttempt(null); }} />;

  return <TestsList onStartTest={(t) => { setSelectedTest(t); setView("start"); }} onViewResults={(t, a) => { setSelectedTest(t); setAttempt(a); setView("results"); }} />;
};

export default TestsTab;

// ─── Tests List ──────────────────────────────────────────────────────
function TestsList({ onStartTest, onViewResults }: { onStartTest: (t: Test) => void; onViewResults: (t: Test, a: TestAttempt) => void }) {
  const { data: tests, isLoading: loadingTests } = usePublishedTests();
  const { data: myAttempts, isLoading: loadingAttempts } = useMyAttempts();
  const { data: allAttempts } = useAllAttempts();
  const [typeFilter, setTypeFilter] = useState("all");

  const attemptMap = new Map<string, TestAttempt>();
  (myAttempts || []).forEach((a) => attemptMap.set(a.test_id, a));

  const filtered = (tests || []).filter((t) => typeFilter === "all" || t.type === typeFilter);

  // Rankings
  const rankings = (() => {
    if (!allAttempts || allAttempts.length === 0) return [];
    const userMap = new Map<string, { name: string; attempts: number; totalPct: number; bestPct: number }>();
    allAttempts.forEach((a) => {
      const existing = userMap.get(a.user_id);
      if (existing) {
        existing.attempts++;
        existing.totalPct += a.percentage;
        existing.bestPct = Math.max(existing.bestPct, a.percentage);
      } else {
        userMap.set(a.user_id, { name: a.student_name, attempts: 1, totalPct: a.percentage, bestPct: a.percentage });
      }
    });
    return Array.from(userMap.entries())
      .map(([uid, d]) => ({ userId: uid, name: d.name, attempts: d.attempts, avgPct: Math.round(d.totalPct / d.attempts), bestPct: d.bestPct }))
      .sort((a, b) => b.avgPct - a.avgPct);
  })();

  if (loadingTests || loadingAttempts) return <div className="space-y-4"><Skeleton className="h-8 w-48" />{[1, 2, 3].map((i) => <Skeleton key={i} className="h-40 rounded-xl" />)}</div>;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-heading font-bold text-foreground">MCQ Tests</h2>
        <p className="text-muted-foreground">Attempt weekly & monthly MCQ tests</p>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {["all", "weekly", "monthly"].map((f) => (
          <Button key={f} size="sm" variant={typeFilter === f ? "default" : "outline"} onClick={() => setTypeFilter(f)} className="capitalize">{f === "all" ? "All" : f}</Button>
        ))}
      </div>

      {/* Test Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.length === 0 && <p className="col-span-2 text-center text-muted-foreground py-12">No tests available</p>}
        {filtered.map((t) => {
          const myAttempt = attemptMap.get(t.id);
          return (
            <Card key={t.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <h3 className="font-heading font-bold text-lg text-foreground">{t.title}</h3>
                  <div className="flex gap-1.5">
                    <Badge variant="secondary">{t.subject}</Badge>
                    <Badge variant={t.type === "weekly" ? "default" : "secondary"} className={t.type === "monthly" ? "bg-purple-500/10 text-purple-600 border-purple-300" : ""}>{t.type}</Badge>
                  </div>
                </div>
                {t.description && <p className="text-sm text-muted-foreground">{t.description}</p>}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5" />{t.question_count || 0} questions</span>
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{t.time_per_question}s per question</span>
                </div>

                {myAttempt ? (
                  <div className="pt-2 border-t border-border space-y-2">
                    <Badge variant={myAttempt.percentage >= 50 ? "default" : "destructive"} className="text-sm">
                      Your Score: {myAttempt.score}/{myAttempt.total_questions} — {myAttempt.percentage}%
                    </Badge>
                    <Button size="sm" variant="outline" onClick={() => onViewResults(t, myAttempt)} className="w-full">View Results</Button>
                  </div>
                ) : !t.is_active ? (
                  <Badge variant="outline" className="mt-2">Coming Soon</Badge>
                ) : (
                  <Button onClick={() => onStartTest(t)} className="w-full mt-2">Start Test</Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Rankings */}
      {rankings.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Trophy className="w-5 h-5 text-primary" /> Overall Test Rankings</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border bg-muted/50">
                  <th className="p-3 text-left font-medium">Rank</th>
                  <th className="p-3 text-left font-medium">Student</th>
                  <th className="p-3 text-center font-medium">Tests</th>
                  <th className="p-3 text-center font-medium">Avg %</th>
                  <th className="p-3 text-center font-medium">Best %</th>
                  <th className="p-3 text-center font-medium">Badges</th>
                </tr></thead>
                <tbody>
                  {rankings.map((r, i) => (
                    <tr key={r.userId} className="border-b border-border hover:bg-muted/30">
                      <td className="p-3 font-bold">{i === 0 ? "🏆" : i + 1}</td>
                      <td className="p-3 font-medium text-foreground">{r.name}</td>
                      <td className="p-3 text-center">{r.attempts}</td>
                      <td className="p-3 text-center font-semibold">{r.avgPct}%</td>
                      <td className="p-3 text-center">{r.bestPct}%</td>
                      <td className="p-3 text-center">
                        {i === 0 && "🏆 "}{r.avgPct >= 80 && "⭐ "}{r.attempts >= 5 && "📚"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Start Screen ────────────────────────────────────────────────────
function StartScreen({ test, onBegin, onBack }: { test: Test; onBegin: () => void; onBack: () => void }) {
  const totalTime = (test.question_count || 0) * test.time_per_question;
  return (
    <div className="max-w-lg mx-auto space-y-6">
      <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>
      <Card>
        <CardContent className="p-6 space-y-5 text-center">
          <h2 className="text-2xl font-heading font-bold text-foreground">{test.title}</h2>
          <div className="flex justify-center gap-2">
            <Badge variant="secondary">{test.subject}</Badge>
            <Badge>{test.type}</Badge>
          </div>
          {test.description && <p className="text-muted-foreground">{test.description}</p>}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="p-3 bg-muted/50 rounded-lg"><p className="font-bold text-foreground">{test.question_count || 0}</p><p className="text-muted-foreground">Questions</p></div>
            <div className="p-3 bg-muted/50 rounded-lg"><p className="font-bold text-foreground">{test.time_per_question}s</p><p className="text-muted-foreground">Per Question</p></div>
            <div className="col-span-2 p-3 bg-muted/50 rounded-lg"><p className="font-bold text-foreground">{Math.ceil(totalTime / 60)} min</p><p className="text-muted-foreground">Estimated Total Time</p></div>
          </div>
          <div className="text-left bg-muted/30 p-4 rounded-lg text-sm text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground mb-2">Rules:</p>
            <p>• Answer all questions</p>
            <p>• Each question has {test.time_per_question} seconds</p>
            <p>• You cannot go back to previous questions</p>
            <p>• You can only attempt this test <strong>once</strong></p>
          </div>
          <Button size="lg" className="w-full text-lg py-6" onClick={onBegin}>Begin Test</Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── MCQ Screen ──────────────────────────────────────────────────────
function McqScreen({ test, onComplete }: { test: Test; onComplete: (a: TestAttempt) => void }) {
  const { user, profile } = useAuth();
  const { data: questions, isLoading } = useTestQuestions(test.id);
  const submitAttempt = useSubmitAttempt();

  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(test.time_per_question);
  const [startTime] = useState(Date.now());

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const questionsRef = useRef<TestQuestion[]>([]);

  useEffect(() => { if (questions) questionsRef.current = questions; }, [questions]);

  const advanceQuestion = useCallback(() => {
    const qs = questionsRef.current;
    if (qs.length === 0) return;
    const currentQ = qs[currentIdx];
    if (currentQ) {
      setAnswers((prev) => {
        if (selected) return { ...prev, [currentQ.id]: selected };
        return prev;
      });
    }
    setSelected(null);
    setTimeLeft(test.time_per_question);

    if (currentIdx >= qs.length - 1) {
      // complete
      if (timerRef.current) clearInterval(timerRef.current);
      // need to compute final answers including current
      const finalAnswers = { ...answers };
      if (selected && currentQ) finalAnswers[currentQ.id] = selected;
      let score = 0;
      qs.forEach((q) => { if (finalAnswers[q.id] === q.correct_option) score++; });
      const pct = qs.length > 0 ? Math.round((score / qs.length) * 100 * 100) / 100 : 0;
      const timeTaken = Math.round((Date.now() - startTime) / 1000);

      const attemptData = {
        test_id: test.id,
        user_id: user?.id || "",
        student_name: profile?.full_name || "Student",
        student_class: profile?.class || null,
        roll_number: profile?.roll_number || null,
        answers: finalAnswers,
        score,
        total_questions: qs.length,
        percentage: pct,
        time_taken: timeTaken,
      };

      submitAttempt.mutate(attemptData, {
        onSuccess: (data) => onComplete(data),
        onError: (err) => {
          if (String(err).includes("duplicate") || String(err).includes("unique")) {
            toast.error("You have already attempted this test");
          } else {
            toast.error("Failed to submit test");
          }
        },
      });
    } else {
      setCurrentIdx((i) => i + 1);
    }
  }, [currentIdx, selected, answers, test, user, profile, startTime, submitAttempt, onComplete]);

  // Timer
  useEffect(() => {
    if (isLoading || !questions || questions.length === 0) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          advanceQuestion();
          return test.time_per_question;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [currentIdx, isLoading, questions?.length]);

  if (isLoading || !questions) return <div className="flex items-center justify-center h-64"><Skeleton className="h-64 w-full max-w-lg rounded-xl" /></div>;

  const currentQ = questions[currentIdx];
  if (!currentQ) return null;

  const progressPct = ((currentIdx) / questions.length) * 100;
  const timerPct = (timeLeft / test.time_per_question) * 100;

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col">
      {/* Top bar */}
      <div className="bg-card border-b border-border p-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <h3 className="font-heading font-semibold text-sm text-foreground truncate">{test.title}</h3>
          <span className="text-sm text-muted-foreground">Question {currentIdx + 1} of {questions.length}</span>
          <div className="flex items-center gap-2">
            <div className={`w-12 h-12 rounded-full border-4 flex items-center justify-center font-bold text-lg ${timeLeft <= 5 ? "border-destructive text-destructive animate-pulse" : "border-primary text-primary"}`}>
              {timeLeft}
            </div>
          </div>
        </div>
      </div>

      {/* Question */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-y-auto">
        <Card className="w-full max-w-2xl">
          <CardContent className="p-6 md:p-8 space-y-6">
            <p className="text-lg md:text-xl font-medium text-foreground">
              <span className="text-primary font-bold mr-2">Q{currentIdx + 1}.</span>{currentQ.question_text}
            </p>
            <div className="grid grid-cols-1 gap-3">
              {(["A", "B", "C", "D"] as const).map((opt) => {
                const val = currentQ[`option_${opt.toLowerCase()}` as keyof TestQuestion] as string;
                const isSelected = selected === opt;
                return (
                  <button key={opt} onClick={() => setSelected(opt)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all ${isSelected ? "border-primary bg-primary/10 shadow-sm" : "border-border hover:border-primary/40 hover:bg-muted/50"}`}>
                    <span className={`inline-flex w-8 h-8 rounded-full items-center justify-center font-bold text-sm mr-3 ${isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{opt}</span>
                    <span className="text-foreground">{val}</span>
                  </button>
                );
              })}
            </div>
            <Button onClick={advanceQuestion} className="w-full" size="lg" disabled={submitAttempt.isPending}>
              {submitAttempt.isPending ? "Submitting..." : currentIdx === questions.length - 1 ? "Finish Test" : "Next Question"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Progress bar */}
      <div className="bg-card border-t border-border p-3">
        <div className="max-w-2xl mx-auto">
          <Progress value={progressPct} className="h-2" />
          <p className="text-xs text-muted-foreground mt-1 text-center">{Math.round(progressPct)}% complete</p>
        </div>
      </div>
    </div>
  );
}

// ─── Results Screen ──────────────────────────────────────────────────
function ResultsScreen({ test, attempt, onBack }: { test: Test; attempt: TestAttempt | null; onBack: () => void }) {
  const { data: questions } = useTestQuestions(test.id);
  const { data: allAttempts } = useTestAttempts(test.id);
  const { profile } = useAuth();
  const [showCountUp, setShowCountUp] = useState(true);
  const [displayPct, setDisplayPct] = useState(0);

  useEffect(() => {
    if (!attempt || !showCountUp) return;
    const target = attempt.percentage;
    let current = 0;
    const step = Math.max(1, Math.round(target / 40));
    const iv = setInterval(() => {
      current = Math.min(current + step, target);
      setDisplayPct(current);
      if (current >= target) { clearInterval(iv); setShowCountUp(false); }
    }, 30);
    return () => clearInterval(iv);
  }, [attempt]);

  if (!attempt) return null;

  const grade = getGrade(attempt.percentage);
  const passed = attempt.percentage >= 50;
  const myRank = (allAttempts || []).findIndex((a) => a.user_id === attempt.user_id) + 1;

  const downloadPDF = () => {
    const doc = new jsPDF();
    const navy = "#042C53";
    const w = doc.internal.pageSize.getWidth();

    // Header
    doc.setFillColor(4, 44, 83);
    doc.rect(0, 0, w, 35, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("GHS Babi Khel", w / 2, 16, { align: "center" });
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("MCQ Test Result Card", w / 2, 26, { align: "center" });

    // Test info
    doc.setTextColor(4, 44, 83);
    doc.setFontSize(11);
    let y = 45;
    doc.setFont("helvetica", "bold");
    doc.text("Test:", 20, y);
    doc.setFont("helvetica", "normal");
    doc.text(test.title, 50, y);
    y += 8;
    doc.setFont("helvetica", "bold");
    doc.text("Subject:", 20, y);
    doc.setFont("helvetica", "normal");
    doc.text(test.subject, 50, y);
    y += 8;
    doc.setFont("helvetica", "bold");
    doc.text("Type:", 20, y);
    doc.setFont("helvetica", "normal");
    doc.text(test.type, 50, y);
    y += 8;
    doc.setFont("helvetica", "bold");
    doc.text("Date:", 20, y);
    doc.setFont("helvetica", "normal");
    doc.text(new Date(attempt.completed_at).toLocaleDateString(), 50, y);

    // Student info
    y += 15;
    doc.setFont("helvetica", "bold");
    doc.text("Student:", 20, y);
    doc.setFont("helvetica", "normal");
    doc.text(attempt.student_name, 55, y);
    y += 8;
    doc.setFont("helvetica", "bold");
    doc.text("Class:", 20, y);
    doc.setFont("helvetica", "normal");
    doc.text(attempt.student_class || "—", 55, y);
    y += 8;
    doc.setFont("helvetica", "bold");
    doc.text("Roll No:", 20, y);
    doc.setFont("helvetica", "normal");
    doc.text(attempt.roll_number || "—", 55, y);

    // Result box
    y += 15;
    doc.setDrawColor(4, 44, 83);
    doc.setLineWidth(0.5);
    doc.rect(20, y, w - 40, 30);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(4, 44, 83);
    doc.text(`Score: ${attempt.score}/${attempt.total_questions}`, 30, y + 12);
    doc.text(`Percentage: ${attempt.percentage}%`, 30, y + 22);
    doc.text(`Grade: ${grade}`, w / 2 + 20, y + 12);
    doc.text(`Status: ${passed ? "PASS" : "FAIL"}`, w / 2 + 20, y + 22);

    // Question summary
    y += 40;
    if (questions) {
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Question Summary:", 20, y);
      y += 8;
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      questions.forEach((q, i) => {
        if (y > 270) { doc.addPage(); y = 20; }
        const userAns = attempt.answers[q.id] || "—";
        const isCorrect = userAns === q.correct_option;
        const mark = isCorrect ? "✓" : "✗";
        doc.text(`Q${i + 1}: ${mark} (Your: ${userAns}, Correct: ${q.correct_option})`, 25, y);
        y += 6;
      });
    }

    if (myRank > 0) {
      y += 8;
      doc.setFont("helvetica", "bold");
      doc.text(`Class Rank: ${myRank}`, 20, y);
    }

    // Footer
    const pageH = doc.internal.pageSize.getHeight();
    doc.setFillColor(4, 44, 83);
    doc.rect(0, pageH - 15, w, 15, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("Official Result — GHS Babi Khel", w / 2, pageH - 6, { align: "center" });

    doc.save(`${test.title}_Result_${attempt.student_name}.pdf`);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="w-4 h-4 mr-1" /> Back to Tests</Button>

      {/* Score Card */}
      <Card>
        <CardContent className="p-6 md:p-8 text-center space-y-4">
          <div className={`text-6xl md:text-8xl font-bold ${passed ? "text-primary" : "text-destructive"}`}>
            {showCountUp ? displayPct : attempt.percentage}%
          </div>
          <p className="text-xl text-foreground">{attempt.score} / {attempt.total_questions} Correct</p>
          <div className="flex justify-center gap-3">
            <Badge className="text-lg px-4 py-1" variant={passed ? "default" : "destructive"}>Grade: {grade}</Badge>
            <Badge className="text-lg px-4 py-1" variant={passed ? "default" : "destructive"}>{passed ? "PASS ✅" : "FAIL ❌"}</Badge>
          </div>
          {myRank > 0 && <p className="text-muted-foreground">Your Rank: <strong>#{myRank}</strong></p>}
          <Button onClick={downloadPDF}><Download className="w-4 h-4 mr-1" /> Download PDF Result Card</Button>
        </CardContent>
      </Card>

      {/* Question Review */}
      {questions && (
        <Card>
          <CardHeader><CardTitle>Question Review</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {questions.map((q, i) => {
              const userAns = attempt.answers[q.id];
              const isCorrect = userAns === q.correct_option;
              return (
                <div key={q.id} className={`p-4 rounded-lg border ${isCorrect ? "border-primary/30 bg-primary/5" : "border-destructive/30 bg-destructive/5"}`}>
                  <div className="flex items-start gap-2 mb-2">
                    {isCorrect ? <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" /> : <XCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />}
                    <p className="font-medium text-foreground"><span className="font-bold mr-1">Q{i + 1}.</span>{q.question_text}</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-sm ml-7">
                    {(["A", "B", "C", "D"] as const).map((opt) => {
                      const val = q[`option_${opt.toLowerCase()}` as keyof TestQuestion] as string;
                      const isUserPick = userAns === opt;
                      const isCorrectOpt = q.correct_option === opt;
                      let cls = "bg-muted/50 text-muted-foreground";
                      if (isCorrectOpt) cls = "bg-primary/15 text-primary font-semibold border border-primary/30";
                      else if (isUserPick && !isCorrect) cls = "bg-destructive/15 text-destructive font-semibold border border-destructive/30";
                      return <div key={opt} className={`px-3 py-1.5 rounded-md ${cls}`}><span className="font-bold mr-1">{opt}.</span>{val}</div>;
                    })}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Leaderboard */}
      {allAttempts && allAttempts.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Trophy className="w-5 h-5 text-primary" /> Test Leaderboard</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border bg-muted/50">
                  <th className="p-3 text-left font-medium">Rank</th>
                  <th className="p-3 text-left font-medium">Name</th>
                  <th className="p-3 text-center font-medium">Score</th>
                  <th className="p-3 text-center font-medium">%</th>
                </tr></thead>
                <tbody>
                  {(allAttempts || []).filter((a) => a.test_id === test.id).sort((a, b) => b.score - a.score).slice(0, 20).map((a, i) => {
                    const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : String(i + 1);
                    const isMe = a.user_id === attempt.user_id;
                    return (
                      <tr key={a.id} className={`border-b border-border ${isMe ? "bg-primary/5 font-semibold" : "hover:bg-muted/30"}`}>
                        <td className="p-3 font-bold">{medal}</td>
                        <td className="p-3 text-foreground">{a.student_name}{isMe && " (You)"}</td>
                        <td className="p-3 text-center">{a.score}/{a.total_questions}</td>
                        <td className="p-3 text-center">{a.percentage}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
