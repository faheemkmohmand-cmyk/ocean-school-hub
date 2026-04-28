import { motion, useScroll, useTransform, useInView, useMotionValue, useSpring } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight, Bell, Users, GraduationCap,
  Trophy, ChevronRight, Microscope, FileText, Laptop,
  BookOpen, Sparkles, BarChart3, Calendar, Image,
  Star, Award, Heart, MapPin, Phone, Mail, Clock,
  Shield, Zap, Globe, Lightbulb
} from "lucide-react";
import PageLayout from "@/components/layout/PageLayout";
import { useSchoolSettings } from "@/hooks/useSchoolSettings";
import { useNotices } from "@/hooks/useNotices";
import { useNews } from "@/hooks/useNews";
import { useTeachers } from "@/hooks/useTeachers";
import { useAchievements } from "@/hooks/useAchievements";
import { useCountUp } from "@/hooks/useCountUp";
import { useTypingAnimation } from "@/hooks/useTypingAnimation";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import NewsTicker from "@/components/shared/NewsTicker";
import { useLeaderboard } from "@/hooks/useNotes";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import DailyQuoteCard from "@/components/shared/DailyQuoteCard";
import WeatherWidget from "@/components/shared/WeatherWidget";

/* ─── Stagger helpers ─── */
const stagger = {
  parent: { hidden: {}, visible: { transition: { staggerChildren: 0.1 } } },
  child: {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
  },
};

/* ─── Page-turn fade-up section wrapper ─── */
const sectionFadeUp = {
  hidden: { opacity: 0, y: 80, rotateX: 6 },
  visible: {
    opacity: 1, y: 0, rotateX: 0,
    transition: { duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] as const }
  },
};

/* ─── ScrollReveal — slides content in as it enters viewport ─── */
function ScrollReveal({
  children, delay = 0, direction = "up",
}: { children: React.ReactNode; delay?: number; direction?: "up"|"down"|"left"|"right" }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0,
        y: direction === "up" ? 50 : direction === "down" ? -50 : 0,
        x: direction === "left" ? 50 : direction === "right" ? -50 : 0,
      }}
      animate={isInView ? { opacity: 1, y: 0, x: 0 } : {}}
      transition={{ duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

/* ─── Animated counter — counts up when in view ─── */
function useCountUpAnim(end: number, isInView: boolean) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!isInView) return;
    let start = 0;
    const duration = 2000;
    const startTime = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(start + (end - start) * ease));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [end, isInView]);
  return count;
}
function AnimCounter({ value, suffix = "", isInView }: { value: number; suffix?: string; isInView: boolean }) {
  const c = useCountUpAnim(value, isInView);
  return <>{c}{suffix}</>;
}

/* ─── CountUp Stat ─── */
const CountStat = ({ value, label, suffix = "" }: { value: number; label: string; suffix?: string }) => {
  const { count, ref } = useCountUp(value);
  return (
    <div ref={ref} className="text-center px-4 py-3">
      <div className="text-3xl md:text-4xl font-heading font-extrabold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
        {count}{suffix}
      </div>
      <div className="text-xs uppercase tracking-widest text-muted-foreground mt-1 font-medium">{label}</div>
    </div>
  );
};

/* ─── Features ─── */
const features = [
  { icon: BookOpen, title: "Quality Curriculum", desc: "Comprehensive KPK board-aligned syllabus with modern teaching methods." },
  { icon: Trophy, title: "Top Results", desc: "Consistently achieving 98%+ pass rate across all classes." },
  { icon: GraduationCap, title: "Expert Teachers", desc: "Qualified and experienced faculty dedicated to student success." },
  { icon: Laptop, title: "Digital Library", desc: "Access past papers, notes, and study material online anytime." },
  { icon: Microscope, title: "Science Labs", desc: "Fully equipped labs for practical learning in Physics, Chemistry & Biology." },
  { icon: FileText, title: "Online Notes", desc: "Downloadable class notes and assignments for every subject." },
];

/* ─── Typing words for hero ─── */
const TYPING_WORDS = [
  "Excellence in Education",
  "Nurturing Future Leaders",
  "Quality Learning Since 2018",
  "District Mohmand's Pride",
  "Building Tomorrow Today",
];

/* ─── MAIN ─── */
/* ─── useSchoolToppers — top student per class by percentage from published results ─── */
function useSchoolToppers() {
  return useQuery({
    queryKey: ["home-school-toppers"],
    queryFn: async () => {
      // Fetch all published results, sorted by year desc then percentage desc
      // We take the #1 student per class = highest percentage in latest year
      const { data, error } = await supabase
        .from("results")
        .select("class, exam_type, year, obtained_marks, total_marks, percentage, grade, position, students(full_name, roll_number, photo_url)")
        .eq("is_published", true)
        .order("year", { ascending: false })
        .order("percentage", { ascending: false });
      if (error) throw error;

      // One topper per class — highest percentage in latest available year
      // Works whether or not position field is set
      const byClass: Record<string, any> = {};
      for (const r of (data ?? [])) {
        const cls = r.class;
        if (!byClass[cls]) {
          // First entry for this class is already the best (sorted by year desc, pct desc)
          byClass[cls] = r;
        }
      }
      return Object.values(byClass).sort((a, b) => Number(a.class) - Number(b.class));
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    placeholderData: [],
  });
}

/* ─── TopperSection — Rank #1 student cards from real results ─── */
const TopperSection = () => {
  const { data: toppers = [], isLoading } = useSchoolToppers();

  if (!isLoading && toppers.length === 0) return null;

  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <span className="text-sm font-semibold uppercase tracking-widest text-primary">Hall of Fame</span>
          <h2 className="mt-2 text-3xl md:text-4xl font-heading font-bold text-foreground">
            🏆 School Rank #1 Students
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">Position 1 holders from latest published exam results — per class</p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-48 rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 max-w-5xl mx-auto">
            {toppers.map((t, i) => {
              const name = (t.students as any)?.full_name || "Top Student";
              const photoUrl = (t.students as any)?.photo_url || null;
              const initials = (name || "?").split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
              const gradients = [
                "from-[#1565c0] via-[#1976d2] to-[#42a5f5]",
                "from-[#6a1b9a] via-[#8e24aa] to-[#ce93d8]",
                "from-[#2e7d32] via-[#388e3c] to-[#81c784]",
                "from-[#e65100] via-[#f57c00] to-[#ffb74d]",
                "from-[#1a237e] via-[#283593] to-[#7986cb]",
              ];
              const grad = gradients[i % gradients.length];
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08, type: "spring", stiffness: 200, damping: 20 }}
                  whileHover={{ y: -5, scale: 1.03 }}
                >
                  <div className={`relative rounded-3xl overflow-hidden shadow-xl bg-gradient-to-b ${grad}`}>
                    {/* Photo / avatar area */}
                    <div className="relative flex flex-col items-center pt-7 pb-3 px-3">
                      {/* Crown */}
                      <div className="text-xl mb-1 drop-shadow">👑</div>

                      {photoUrl ? (
                        <img
                          src={photoUrl}
                          alt={name}
                          className="w-16 h-16 rounded-full object-cover border-4 border-white/50 shadow-lg"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm border-4 border-white/40 flex items-center justify-center text-2xl font-black text-white shadow-lg">
                          {initials}
                        </div>
                      )}

                      {/* Rank pill */}
                      <div className="absolute top-3 right-3 bg-white/20 backdrop-blur-sm rounded-full px-2 py-0.5 text-[9px] font-black text-white border border-white/30">
                        #1
                      </div>
                    </div>

                    {/* Info panel */}
                    <div className="bg-black/20 backdrop-blur-sm mx-2 mb-2 rounded-2xl p-2.5 text-center">
                      <h3 className="text-xs font-black text-white leading-tight line-clamp-1">{name}</h3>
                      <p className="text-[9px] text-white/70 mt-0.5">Class {t.class}</p>
                      <div className="flex items-center justify-center gap-1.5 mt-2">
                        <div className="bg-white/20 rounded-lg px-2 py-0.5">
                          <span className="text-xs font-black text-white">{Number(t.percentage || 0).toFixed(0)}%</span>
                        </div>
                        <div className="bg-white/20 rounded-lg px-2 py-0.5">
                          <span className="text-xs font-black text-white">{t.grade || "A+"}</span>
                        </div>
                      </div>
                      <p className="text-[8px] text-white/50 mt-1">{t.exam_type} · {t.year}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        <div className="text-center mt-8">
          <Link to="/results"
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
            View Full Merit List <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
};


const Home = () => {
  // ── Parallax scroll effect (learned from reference) ────────────────────────
  const { scrollY } = useScroll();
  // Hero content slides upward as user scrolls — creates "page turning" feeling
  const heroContentY    = useTransform(scrollY, [0, 500], [0, 120]);
  const heroOpacity     = useTransform(scrollY, [0, 350], [1, 0]);
  // Background moves slower than content = depth parallax
  const heroBgY         = useTransform(scrollY, [0, 600], [0, 80]);
  // Blobs animate faster = layered parallax
  const blobY           = useTransform(scrollY, [0, 600], [0, 60]);

  // Stats ref for animated counter trigger
  const statsRef = useRef(null);
  const statsInView = useInView(statsRef, { once: true, margin: "-100px" });

  const { data: settings, isLoading: settingsLoading } = useSchoolSettings();
  const { data: notices = [], isLoading: noticesLoading } = useNotices(4);
  const { data: news = [], isLoading: newsLoading } = useNews(3);
  const { data: teachers = [], isLoading: teachersLoading } = useTeachers(4);
  const { data: achievements = [], isLoading: achievementsLoading } = useAchievements(3);

  // Typing animation for hero tagline
  const { displayed } = useTypingAnimation({
    words: TYPING_WORDS,
    typingSpeed: 70,
    deletingSpeed: 35,
    pauseTime: 2500,
  });

  // Typing animation for school name (loops)
  const schoolName = settings?.school_name || "GHS Babi Khel";
  const { displayed: displayedSchoolName } = useTypingAnimation({
    words: [schoolName],
    typingSpeed: 90,
    deletingSpeed: 45,
    pauseTime: 3500,
  });

  return (
    <PageLayout>

      {/* ════════ NEWS TICKER ════════ */}
      <NewsTicker />

      {/* ════════ HERO ════════ (contain layout for faster paint) */}
      <section id="hero-section" className="relative min-h-[100vh] flex items-center overflow-hidden">
        {/* Background — moves slower than content for depth parallax */}
        <motion.div
          style={{ y: heroBgY }}
          className="absolute inset-0 will-change-transform"
        >
          {settings?.banner_url ? (
            <img
              src={settings.banner_url}
              alt="School banner"
              className="absolute inset-0 w-full h-full object-cover"
              loading="eager"
              decoding="async"
              fetchPriority="high"
              style={{ height: "110%", top: "-5%" }}
            />
          ) : (
            <div className="absolute inset-0 gradient-hero" />
          )}
          {/* SVG animated mesh grid from reference */}
          <div className="absolute inset-0 opacity-20">
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <defs>
                <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                  <path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" strokeWidth="0.15" opacity="0.4" />
                </pattern>
              </defs>
              <rect width="100" height="100" fill="url(#grid)" />
            </svg>
          </div>
        </motion.div>
        <div className="absolute inset-0 bg-gradient-to-br from-[#042C53]/80 via-[#042C53]/50 to-transparent" />

        {/* Blobs — parallax floats at slightly different speed */}
        <motion.div
          style={{ y: blobY }}
          className="absolute inset-0 overflow-hidden pointer-events-none"
        >
          <motion.div
            animate={{ x: [0, 40, 0], y: [0, -30, 0] }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-20 -left-20 w-96 h-96 rounded-full bg-primary/20 blur-3xl"
          />
          <motion.div
            animate={{ x: [0, -50, 0], y: [0, 40, 0] }}
            transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
            className="absolute bottom-10 right-0 w-[500px] h-[500px] rounded-full bg-accent/15 blur-3xl"
          />
        </motion.div>

        {/* Content — slides up and fades out as you scroll (the "huffing" feeling) */}
        <motion.div
          style={{ y: heroContentY, opacity: heroOpacity }}
          className="container mx-auto px-4 relative z-10 py-24 will-change-transform"
        >
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: text */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={stagger.parent}
              className="max-w-2xl"
            >
              {/* Badge */}
              <motion.div variants={stagger.child}>
                <span className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-md rounded-full px-4 py-1.5 text-sm text-white/90 border border-white/20">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  Est. {settings?.established_year || 2018} · EMIS {settings?.emis_code || "60673"}
                </span>
              </motion.div>

              {/* H1 — School Name (typing loop) */}
              <motion.h1
                variants={stagger.child}
                className="mt-6 text-5xl md:text-7xl lg:text-8xl font-heading font-extrabold italic text-white leading-[0.95] min-h-[1em]"
              >
                <span className="bg-gradient-to-r from-white via-primary-light to-accent bg-clip-text text-transparent">
                  {displayedSchoolName}
                </span>
                <span
                  className="inline-block w-1 h-[0.85em] bg-white/70 ml-1 align-middle"
                  style={{ animation: "blink 1s step-end infinite" }}
                />
              </motion.h1>

              {/* H2 — Typing Animation */}
              <motion.h2
                variants={stagger.child}
                className="mt-4 text-xl md:text-2xl font-heading font-semibold text-white/90 min-h-[2rem]"
              >
                {displayed}
                <span
                  className="inline-block w-0.5 h-6 bg-white/80 ml-1 align-middle"
                  style={{ animation: "blink 1s step-end infinite" }}
                />
                <style>{`
                  @keyframes blink {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0; }
                  }
                `}</style>
              </motion.h2>

              {/* Desc */}
              <motion.p variants={stagger.child} className="mt-4 text-base md:text-lg text-white/70 max-w-lg leading-relaxed">
                {settings?.description ||
                  "Government High School Babi Khel is committed to providing quality education and nurturing the future leaders of Pakistan."}
              </motion.p>

              {/* Buttons — whileHover + whileTap from reference */}
              <motion.div variants={stagger.child} className="mt-8 flex flex-wrap gap-4">
                <Link to="/results">
                  <motion.button
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    className="inline-flex items-center gap-2 gradient-accent text-primary-foreground font-semibold px-7 py-3.5 rounded-xl shadow-elevated transition-all duration-200"
                  >
                    View Results
                    <ArrowRight className="w-4 h-4" />
                  </motion.button>
                </Link>
                <Link to="/about">
                  <motion.button
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/25 text-white font-semibold px-7 py-3.5 rounded-xl hover:bg-white/20 transition-all duration-200"
                  >
                    Learn More
                  </motion.button>
                </Link>
                <Link to="/dashboard">
                  <motion.button
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    className="inline-flex items-center gap-2 bg-white text-[#042C53] font-bold px-7 py-3.5 rounded-xl shadow-xl transition-all duration-200"
                  >
                    Student Portal
                  </motion.button>
                </Link>
              </motion.div>
            </motion.div>

            {/* Right: animated stats cards — from reference */}
            <motion.div
              ref={statsRef}
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7, duration: 0.7 }}
              className="hidden lg:grid grid-cols-2 gap-4"
            >
              {[
                { icon: Users, label: "Total Students", value: settings?.total_students || 500, suffix: "+", from: "from-blue-400", to: "to-blue-600" },
                { icon: GraduationCap, label: "Qualified Teachers", value: settings?.total_teachers || 25, suffix: "+", from: "from-primary", to: "to-primary/70" },
                { icon: Trophy, label: "Pass Rate", value: settings?.pass_percentage || 98, suffix: "%", from: "from-amber-400", to: "to-orange-500" },
                { icon: BookOpen, label: "Years of Excellence", value: new Date().getFullYear() - (settings?.established_year || 2018), suffix: "", from: "from-purple-400", to: "to-purple-600" },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9 + i * 0.15, duration: 0.5 }}
                  whileHover={{ scale: 1.05, y: -5 }}
                  className="bg-white/15 backdrop-blur-xl rounded-3xl p-6 border border-white/20 hover:bg-white/25 transition-all shadow-2xl cursor-default"
                >
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${stat.from} ${stat.to} flex items-center justify-center mb-4 shadow-lg`}>
                    <stat.icon className="w-7 h-7 text-white" />
                  </div>
                  <p className="text-3xl sm:text-4xl font-bold text-white">
                    <AnimCounter value={stat.value} suffix={stat.suffix} isInView={statsInView} />
                  </p>
                  <p className="text-sm text-white/60 mt-2 font-medium">{stat.label}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </motion.div>

        {/* ── Scroll Indicator — animated scroll-down effect ── */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-3 select-none pointer-events-none">
          {/* "SCROLL" label — gentle pulse */}
          <motion.span
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="text-[11px] font-bold uppercase tracking-[0.3em] text-white/70"
          >
            Scroll
          </motion.span>

          {/* Mouse outline — STATIC shape, only dot moves */}
          <div className="w-7 h-12 rounded-full border-2 border-white/50 flex items-start justify-center pt-2 relative overflow-hidden">
            <motion.div
              animate={{ y: [0, 20, 0], opacity: [1, 0, 1] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
              className="w-1.5 h-3 rounded-full bg-white/80"
            />
          </div>

          {/* Chevron arrows — staggered fade-down, simulates "page turning up" */}
          <div className="flex flex-col items-center gap-0.5">
            {[0, 1, 2].map((i) => (
              <motion.svg
                key={i}
                xmlns="http://www.w3.org/2000/svg"
                width="16" height="10" viewBox="0 0 16 10" fill="none"
                animate={{ opacity: [0, 1, 0], y: [0, 4, 0] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut", delay: i * 0.25 }}
              >
                <path d="M1 1L8 8L15 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </motion.svg>
            ))}
          </div>
        </div>
      </section>

      {/* ════════ STATS BAR ════════ */}
      <motion.section initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.15 }} variants={sectionFadeUp} className="relative z-20 -mt-12">
        <div className="container mx-auto px-4">
          <div className="bg-card rounded-2xl shadow-elevated p-4 md:p-6 grid grid-cols-2 md:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-border">
            {settingsLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex flex-col items-center gap-2 py-3 px-4">
                  <Skeleton className="h-9 w-20" />
                  <Skeleton className="h-3 w-16" />
                </div>
              ))
            ) : (
              <>
                <CountStat value={settings?.total_students || 500} suffix="+" label="Students" />
                <CountStat value={settings?.total_teachers || 25} suffix="+" label="Teachers" />
                <CountStat value={settings?.pass_percentage || 98} suffix="%" label="Pass Rate" />
                <CountStat value={settings?.established_year || 2018} label="Established" />
                <CountStat value={10} label="Highest Class" />
              </>
            )}
          </div>
        </div>
      </motion.section>

      {/* ════════ QUICK LINKS — from reference ════════ */}
      <section className="py-8 bg-background relative z-10">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: FileText, title: "Notices", desc: "Latest announcements", to: "/notices", from: "from-amber-400", to2: "to-orange-500" },
              { icon: Bell, title: "News", desc: "School events", to: "/news", from: "from-emerald-400", to2: "to-teal-500" },
              { icon: Image, title: "Gallery", desc: "Photo gallery", to: "/gallery", from: "from-pink-400", to2: "to-rose-500" },
              { icon: BookOpen, title: "Library", desc: "Study resources", to: "/library", from: "from-violet-400", to2: "to-purple-500" },
            ].map((link, i) => (
              <ScrollReveal key={link.title} delay={i * 0.1}>
                <Link to={link.to}>
                  <motion.div
                    whileHover={{ scale: 1.05, y: -5 }}
                    whileTap={{ scale: 0.97 }}
                    className="group bg-card rounded-2xl p-5 sm:p-6 h-full text-center shadow-card hover:shadow-elevated transition-all border border-border hover:border-primary/20"
                  >
                    <div className={`w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br ${link.from} ${link.to2} flex items-center justify-center mb-4 shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all`}>
                      <link.icon className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="font-heading font-semibold text-foreground text-lg">{link.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{link.desc}</p>
                  </motion.div>
                </Link>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ════════ SCROLLING SUBJECTS MARQUEE ════════ */}
      <section className="py-4 bg-primary/5 overflow-hidden border-y border-border">
        <div className="relative flex overflow-hidden">
          <div
            className="flex gap-8 shrink-0 animate-none"
            style={{
              animation: "marqueeScroll 28s linear infinite",
              willChange: "transform",
            }}
          >
            {[
              { emoji: "📐", label: "Mathematics" },
              { emoji: "⚡", label: "Physics" },
              { emoji: "🧪", label: "Chemistry" },
              { emoji: "🌿", label: "Biology" },
              { emoji: "📖", label: "English" },
              { emoji: "✍️", label: "Urdu" },
              { emoji: "🗺️", label: "Pakistan Studies" },
              { emoji: "☪️", label: "Islamiyat" },
              { emoji: "💻", label: "Computer Science" },
              { emoji: "📐", label: "Mathematics" },
              { emoji: "⚡", label: "Physics" },
              { emoji: "🧪", label: "Chemistry" },
              { emoji: "🌿", label: "Biology" },
              { emoji: "📖", label: "English" },
              { emoji: "✍️", label: "Urdu" },
              { emoji: "🗺️", label: "Pakistan Studies" },
              { emoji: "☪️", label: "Islamiyat" },
              { emoji: "💻", label: "Computer Science" },
            ].map((s, i) => (
              <div key={i} className="flex items-center gap-2 shrink-0 px-3 py-1.5 rounded-full bg-card border border-border shadow-sm">
                <span className="text-lg">{s.emoji}</span>
                <span className="text-sm font-semibold text-foreground whitespace-nowrap">{s.label}</span>
              </div>
            ))}
          </div>
          {/* Gradient fades */}
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-background to-transparent z-10" />
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-background to-transparent z-10" />
        </div>
        <style>{`
          @keyframes marqueeScroll {
            0%   { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
        `}</style>
      </section>

      {/* ════════ TOP STUDENT (TOPPER) ════════ */}
      <TopperSection />

      {/* ════════ FEATURES ════════ */}
      <motion.section initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.15 }} variants={sectionFadeUp} className="py-20 cv-auto">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <ScrollReveal>
              <span className="text-sm font-semibold uppercase tracking-widest text-primary">Our Strengths</span>
              <h2 className="mt-2 text-3xl md:text-4xl font-heading font-bold text-foreground">
                Why Choose Us
              </h2>
              <p className="text-muted-foreground mt-2 max-w-xl mx-auto text-sm">We provide a comprehensive educational experience that nurtures young minds</p>
            </ScrollReveal>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger.parent}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            {features.map((f, idx) => (
              <ScrollReveal key={f.title} delay={idx * 0.08}>
                <motion.div
                  variants={stagger.child}
                  whileHover={{ y: -8, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="group bg-card rounded-2xl p-6 shadow-card hover:shadow-elevated transition-all duration-300 border border-transparent hover:border-primary/20 h-full"
                >
                  <div className="w-12 h-12 rounded-xl gradient-hero flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg">
                    <f.icon className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <h3 className="font-heading font-semibold text-foreground text-lg">{f.title}</h3>
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{f.desc}</p>
                </motion.div>
              </ScrollReveal>
            ))}
          </motion.div>
        </div>
      </motion.section>

      {/* ════════ DAILY QUOTE / HADITH ════════ */}
      <motion.section initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.15 }} variants={sectionFadeUp} className="py-10 cv-auto">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="mb-4 text-center">
            <span className="text-sm font-semibold uppercase tracking-widest text-primary">Thought of the Day</span>
          </div>
          <DailyQuoteCard />
          <div className="mt-4">
            <WeatherWidget />
          </div>
        </div>
      </motion.section>

      {/* ════════ ABOUT PREVIEW — dark gradient, 2-col, floating cards ════════ */}
      <motion.section initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.1 }} variants={sectionFadeUp} className="py-20 cv-auto relative overflow-hidden">
        <div className="absolute inset-0 gradient-hero" />
        {/* Rotating rings from reference */}
        <div className="absolute inset-0 opacity-10 pointer-events-none overflow-hidden">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
            className="absolute -top-20 -right-20 w-80 h-80 rounded-full border-4 border-white" />
          <motion.div animate={{ rotate: -360 }} transition={{ duration: 80, repeat: Infinity, ease: "linear" }}
            className="absolute -bottom-20 -left-20 w-96 h-96 rounded-full border-4 border-white" />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Left: school info */}
            <ScrollReveal direction="left">
              <div className="text-white">
                <span className="inline-block bg-white/20 text-white border border-white/30 backdrop-blur-sm text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full mb-4">About Us</span>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-heading font-bold mb-6 leading-tight">
                  Building Future Leaders Since {settings?.established_year || 2018}
                </h2>
                <p className="text-white/80 text-lg leading-relaxed mb-8">
                  {settings?.description || "Government High School Babi Khel has been serving the community of District Mohmand with dedication and excellence. We believe in nurturing every student's potential through quality education and modern teaching methodologies."}
                </p>
                {/* Contact info grid */}
                <div className="grid sm:grid-cols-2 gap-4 mb-8">
                  {[
                    { icon: MapPin, text: settings?.address || "Babi Khel, District Mohmand, KPK" },
                    { icon: Phone, text: settings?.phone || "+92 XXX XXXXXXX" },
                    { icon: Mail, text: settings?.email || "info@ghsbabikhel.edu.pk" },
                    { icon: Clock, text: "Mon–Fri, 8:00 AM – 3:00 PM" },
                  ].map((item, i) => (
                    <motion.div key={i}
                      initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                      className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl p-3"
                    >
                      <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                        <item.icon className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-sm text-white/90">{item.text}</span>
                    </motion.div>
                  ))}
                </div>
                <Link to="/about">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.97 }}
                    className="px-8 py-4 bg-white text-[#042C53] rounded-2xl font-bold shadow-xl flex items-center gap-2"
                  >
                    Learn More About Us
                    <ArrowRight className="w-5 h-5" />
                  </motion.button>
                </Link>
              </div>
            </ScrollReveal>

            {/* Right: decorative card with floating achievement badges */}
            <ScrollReveal direction="right" delay={0.2}>
              <div className="relative">
                <div className="aspect-square rounded-3xl bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-xl border border-white/20 p-2 shadow-2xl">
                  <div className="w-full h-full rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center overflow-hidden">
                    <GraduationCap className="w-40 h-40 text-white/30" />
                  </div>
                </div>
                {/* Floating card 1 — pass rate */}
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute -bottom-6 -left-6 bg-white rounded-2xl shadow-2xl p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
                      <Star className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-2xl font-black text-foreground">{settings?.pass_percentage || 98}%</p>
                      <p className="text-xs text-muted-foreground font-medium">Pass Rate</p>
                    </div>
                  </div>
                </motion.div>
                {/* Floating card 2 — board results */}
                <motion.div
                  animate={{ y: [0, 10, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute -top-4 -right-4 bg-white rounded-2xl shadow-2xl p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg">
                      <Award className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-2xl font-black text-foreground">A+</p>
                      <p className="text-xs text-muted-foreground font-medium">Board Results</p>
                    </div>
                  </div>
                </motion.div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </motion.section>

       {/* ════════ LATEST NOTICES ════════ */}
      <motion.section initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.15 }} variants={sectionFadeUp} className="py-16 bg-secondary/50 cv-auto">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <ScrollReveal direction="left">
              <div>
                <span className="text-sm font-semibold uppercase tracking-widest text-primary">Stay Updated</span>
                <h2 className="mt-1 text-2xl md:text-3xl font-heading font-bold text-foreground">Latest Notices</h2>
              </div>
            </ScrollReveal>
            <ScrollReveal direction="right" delay={0.1}>
              <Link to="/notices" className="text-sm font-medium text-primary hover:underline flex items-center gap-1">
                View All <ChevronRight className="w-4 h-4" />
              </Link>
            </ScrollReveal>
          </div>

          <div className="space-y-3">
            {noticesLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="bg-card rounded-xl p-5 flex gap-4">
                    <Skeleton className="h-16 w-1 rounded-full shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                  </div>
                ))
              : notices.length === 0
              ? (
                <div className="bg-card rounded-xl p-8 text-center text-muted-foreground shadow-card">
                  No notices published yet.
                </div>
              )
              : notices.map((notice) => (
                  <motion.div
                    key={notice.id}
                    initial={{ opacity: 0, x: -12 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    whileHover={{ x: 6 }}
                    className="bg-card rounded-xl p-5 flex gap-4 shadow-card hover:shadow-elevated transition-all duration-200 cursor-pointer group"
                  >
                    <div className={`w-1 rounded-full shrink-0 ${notice.is_urgent ? "bg-destructive" : "bg-primary"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-heading font-semibold text-foreground truncate">{notice.title}</h3>
                        {notice.is_urgent && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-destructive/10 text-destructive shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
                            Urgent
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(notice.created_at), "dd MMM yyyy")} · {notice.category}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 self-center" />
                  </motion.div>
                ))}
          </div>
        </div>
      </motion.section>

      {/* ════════ LATEST NEWS ════════ */}
      <motion.section initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.15 }} variants={sectionFadeUp} className="py-20 cv-auto">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <span className="text-sm font-semibold uppercase tracking-widest text-primary">What's Happening</span>
              <h2 className="mt-1 text-2xl md:text-3xl font-heading font-bold text-foreground">Latest News</h2>
            </div>
            <Link to="/news" className="text-sm font-medium text-primary hover:underline flex items-center gap-1">
              All News <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {newsLoading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="bg-card rounded-2xl overflow-hidden shadow-card">
                    <Skeleton className="h-48 w-full" />
                    <div className="p-5 space-y-2">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                      <Skeleton className="h-3 w-full" />
                    </div>
                  </div>
                ))
              : news.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="bg-card rounded-2xl overflow-hidden shadow-card hover:shadow-elevated transition-all duration-300 group"
                  >
                    <div className="h-48 overflow-hidden bg-secondary">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.title}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full gradient-hero flex items-center justify-center">
                          <Bell className="w-10 h-10 text-primary-foreground/50" />
                        </div>
                      )}
                    </div>
                    <div className="p-5">
                      <p className="text-xs text-muted-foreground mb-2">
                        {format(new Date(item.created_at), "dd MMM yyyy")}
                      </p>
                      <h3 className="font-heading font-semibold text-foreground line-clamp-2">{item.title}</h3>
                      {item.content && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{item.content}</p>
                      )}
                      <Link
                        to="/news"
                        className="inline-flex items-center gap-1 text-sm font-medium text-primary mt-3 hover:gap-2 transition-all"
                      >
                        Read More <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </motion.div>
                ))}
          </div>
        </div>
      </motion.section>

      {/* ════════ TEACHERS PREVIEW ════════ */}
      <motion.section initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.15 }} variants={sectionFadeUp} className="py-16 bg-secondary/50 cv-auto">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <span className="text-sm font-semibold uppercase tracking-widest text-primary">Our Faculty</span>
              <h2 className="mt-1 text-2xl md:text-3xl font-heading font-bold text-foreground">Meet Our Teachers</h2>
            </div>
            <Link to="/teachers" className="text-sm font-medium text-primary hover:underline flex items-center gap-1">
              All Teachers <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {teachersLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="bg-card rounded-2xl p-6 text-center shadow-card">
                    <Skeleton className="w-20 h-20 rounded-full mx-auto mb-4" />
                    <Skeleton className="h-5 w-2/3 mx-auto mb-2" />
                    <Skeleton className="h-3 w-1/2 mx-auto" />
                  </div>
                ))
              : teachers.map((teacher) => (
                  <motion.div
                    key={teacher.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    whileHover={{ y: -8 }}
                    className="bg-card rounded-2xl p-6 text-center shadow-card hover:shadow-elevated transition-all duration-300 group"
                  >
                    {teacher.photo_url ? (
                      <img
                        src={teacher.photo_url}
                        alt={teacher.full_name}
                        loading="lazy"
                        decoding="async"
                        className="w-20 h-20 rounded-full mx-auto mb-4 object-cover ring-4 ring-secondary group-hover:ring-primary/30 transition-all"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full mx-auto mb-4 gradient-hero flex items-center justify-center text-primary-foreground text-xl font-heading font-bold">
                        {teacher.full_name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                      </div>
                    )}
                    <h3 className="font-heading font-semibold text-foreground">{teacher.full_name}</h3>
                    {teacher.subject && (
                      <p className="text-sm text-primary font-medium mt-1">{teacher.subject}</p>
                    )}
                    {teacher.qualification && (
                      <p className="text-xs text-muted-foreground mt-1">{teacher.qualification}</p>
                    )}
                  </motion.div>
                ))}
          </div>
        </div>
      </motion.section>

      {/* ════════ ACHIEVEMENTS ════════ */}
      <motion.section initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.15 }} variants={sectionFadeUp} className="py-20 cv-auto">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <span className="text-sm font-semibold uppercase tracking-widest text-primary">Our Pride</span>
            <h2 className="mt-2 text-3xl md:text-4xl font-heading font-bold text-foreground">Achievements</h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {achievementsLoading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="bg-card rounded-2xl p-6 shadow-card">
                    <Skeleton className="w-12 h-12 rounded-xl mb-4" />
                    <Skeleton className="h-5 w-3/4 mb-2" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ))
              : achievements.map((a) => (
                  <motion.div
                    key={a.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    className="bg-card rounded-2xl p-6 shadow-card hover:shadow-elevated transition-all duration-300"
                  >
                    <div className="w-12 h-12 rounded-xl bg-warning/15 flex items-center justify-center mb-4">
                      <Trophy className="w-6 h-6 text-warning" />
                    </div>
                    <h3 className="font-heading font-semibold text-foreground">{a.title}</h3>
                    {a.student_name && (
                      <p className="text-sm text-primary font-medium mt-1">
                        {a.student_name} {a.class && `· Class ${a.class}`}
                      </p>
                    )}
                    {a.description && (
                      <p className="text-sm text-muted-foreground mt-2">{a.description}</p>
                    )}
                  </motion.div>
                ))}
          </div>
        </div>
      </motion.section>

      {/* ════════ QUICK ACCESS ════════ */}
      <motion.section initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.15 }} variants={sectionFadeUp} className="py-16 bg-secondary/50 cv-auto">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <span className="text-sm font-semibold uppercase tracking-widest text-primary">Explore</span>
            <h2 className="mt-2 text-2xl md:text-3xl font-heading font-bold text-foreground">Quick Access</h2>
            <p className="text-muted-foreground text-sm mt-2">Everything you need — one click away</p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger.parent}
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4"
          >
            {[
              { icon: BarChart3, label: "Results", to: "/results" },
              { icon: Calendar, label: "Timetable", to: "/dashboard" },
              { icon: Bell, label: "Notices", to: "/notices" },
              { icon: BookOpen, label: "Library", to: "/library" },
              { icon: Image, label: "Gallery", to: "/gallery" },
              { icon: Trophy, label: "Achievements", to: "/dashboard" },
              { icon: Globe, label: "🌤️ Weather", to: "/weather" },
            ].map((item) => (
              <motion.div key={item.label} variants={stagger.child}>
                <Link
                  to={item.to}
                  className="bg-card rounded-2xl p-5 shadow-card hover:shadow-elevated transition-all duration-300 text-center group block"
                >
                  <div className="w-12 h-12 rounded-xl gradient-hero flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                    <item.icon className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <span className="text-sm font-semibold text-foreground">{item.label}</span>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.section>

      {/* ════════ CTA ════════ */}
      <motion.section initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.15 }} variants={sectionFadeUp} className="py-20">
        <div className="container mx-auto px-4">
          <div className="gradient-hero rounded-3xl p-12 md:p-20 text-center relative overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="relative z-10"
            >
              <Sparkles className="w-8 h-8 text-primary-foreground/60 mx-auto mb-4" />
              <h2 className="text-3xl md:text-5xl font-heading font-bold text-primary-foreground">
                Explore GHS Babi Khel
              </h2>
              <p className="mt-4 text-primary-foreground/75 max-w-lg mx-auto text-lg">
                Check your results, browse the library, and stay updated with the latest news and notices.
              </p>
              <Link
                to="/results"
                className="inline-flex items-center gap-2 mt-8 bg-white text-primary-dark font-bold px-8 py-4 rounded-xl shadow-elevated hover:shadow-card hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 text-lg"
              >
                Check Results
                <ArrowRight className="w-5 h-5" />
              </Link>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* ════════ CTA — from reference ════════ */}
      <motion.section initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.15 }} variants={sectionFadeUp} className="py-20 cv-auto relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0 pointer-events-none">
          <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-0 left-0 w-96 h-96 bg-primary/5 rounded-full -translate-x-1/2 -translate-y-1/2" />
          <motion.div animate={{ scale: [1.2, 1, 1.2] }} transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            className="absolute bottom-0 right-0 w-96 h-96 bg-accent/5 rounded-full translate-x-1/2 translate-y-1/2" />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="gradient-hero rounded-3xl p-12 md:p-20 text-center relative overflow-hidden">
            {/* Inner glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/5 rounded-full blur-3xl pointer-events-none" />
            {/* Rotating ring */}
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 opacity-5 pointer-events-none">
              <div className="absolute top-4 right-4 w-32 h-32 rounded-full border-2 border-white" />
              <div className="absolute bottom-4 left-4 w-20 h-20 rounded-full border-2 border-white" />
            </motion.div>

            <ScrollReveal>
              <div className="relative z-10">
                <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} className="inline-block mb-4">
                  <Heart className="w-8 h-8 text-primary-foreground/60 mx-auto" />
                </motion.div>
                <div className="inline-flex items-center gap-2 bg-white/20 text-white border border-white/30 backdrop-blur-sm text-sm font-medium px-4 py-2 rounded-full mb-6">
                  <Heart className="w-4 h-4" /> Join Our Community
                </div>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-heading font-bold text-primary-foreground mb-6 leading-tight">
                  Ready to Begin Your{" "}
                  <span className="bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
                    Educational Journey?
                  </span>
                </h2>
                <p className="text-primary-foreground/75 text-lg mb-10 max-w-2xl mx-auto">
                  Access your student portal to view results, attendance, timetables, and stay connected with your academic progress.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link to="/auth/signin">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.97 }}
                      className="w-full sm:w-auto px-10 py-5 bg-white text-[#042C53] rounded-2xl font-bold shadow-2xl flex items-center justify-center gap-2 text-lg"
                    >
                      Sign In to Portal
                      <ArrowRight className="w-5 h-5" />
                    </motion.button>
                  </Link>
                  <Link to="/results">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.97 }}
                      className="w-full sm:w-auto px-10 py-5 bg-white/10 backdrop-blur-md text-white rounded-2xl font-semibold border border-white/30 hover:bg-white/20 transition-all flex items-center justify-center gap-2 text-lg"
                    >
                      Check Results
                    </motion.button>
                  </Link>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </motion.section>

    </PageLayout>
  );
};

export default Home;
