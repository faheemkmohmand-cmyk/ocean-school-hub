import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  ArrowRight, Bell, Users, GraduationCap,
  Trophy, ChevronRight, Microscope, FileText, Laptop,
  BookOpen, Sparkles, BarChart3, Calendar, Image
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
import DailyQuoteCard from "@/components/shared/DailyQuoteCard";

/* ─── Stagger helpers ─── */
const stagger = {
  parent: { hidden: {}, visible: { transition: { staggerChildren: 0.1 } } },
  child: {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
  },
};

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
/* ─── TopperSection — fetches #1 student from leaderboard ─── */
const TopperSection = () => {
  const { data: leaderboard = [] } = useLeaderboard();
  const topper = leaderboard[0];

  if (!topper) return null;

  // Generate initials avatar
  const name = topper.full_name || "Top Student";
  const initials = name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();

  // Anonymous nickname logic
  const nicknames = ["Math Wizard", "Science Star", "Study Champion", "Knowledge King", "Quiz Master"];
  const nickname = nicknames[Math.abs(topper.user_id?.charCodeAt(0) || 0) % nicknames.length];

  const badges: Record<string, string> = {
    first_step: "🌟", bookworm: "📚", quiz_master: "🏆",
    on_fire: "🔥", legend: "👑", top_student: "⭐", subject_done: "💯",
  };

  return (
    <section className="py-16 cv-auto">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <span className="text-sm font-semibold uppercase tracking-widest text-primary">Hall of Fame</span>
          <h2 className="mt-2 text-3xl md:text-4xl font-heading font-bold text-foreground">Top Student This Week</h2>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-sm mx-auto"
        >
          <div className="relative bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 dark:from-amber-900/20 dark:via-yellow-900/20 dark:to-orange-900/20 border-2 border-amber-300 dark:border-amber-600 rounded-3xl p-8 text-center shadow-elevated overflow-hidden">
            {/* Background glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/10 to-orange-400/10 pointer-events-none" />

            {/* Rank badge */}
            <div className="absolute top-4 left-4 w-10 h-10 rounded-full bg-amber-400 flex items-center justify-center">
              <span className="text-white font-black text-base">#1</span>
            </div>

            {/* Crown */}
            <div className="text-4xl mb-1">👑</div>

            {/* Avatar */}
            <div className="w-24 h-24 rounded-full mx-auto mb-4 bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white text-3xl font-heading font-black shadow-lg ring-4 ring-amber-300 ring-offset-2">
              {initials}
            </div>

            {/* Name */}
            <h3 className="text-xl font-heading font-black text-foreground">{name}</h3>
            <p className="text-sm text-muted-foreground mt-0.5 italic">"{nickname}"</p>

            {/* Points + streak */}
            <div className="flex items-center justify-center gap-4 mt-4">
              <div className="bg-amber-100 dark:bg-amber-900/30 rounded-2xl px-4 py-2">
                <p className="text-2xl font-black text-amber-600">⭐ {topper.total_points}</p>
                <p className="text-xs text-amber-700 dark:text-amber-400 font-semibold">Points</p>
              </div>
              <div className="bg-orange-100 dark:bg-orange-900/30 rounded-2xl px-4 py-2">
                <p className="text-2xl font-black text-orange-500">🔥 {topper.streak_days}</p>
                <p className="text-xs text-orange-600 dark:text-orange-400 font-semibold">Day Streak</p>
              </div>
            </div>

            {/* Badges */}
            {topper.badges?.length > 0 && (
              <div className="flex items-center justify-center gap-1.5 mt-4 flex-wrap">
                {topper.badges.slice(0, 5).map((b: string, i: number) => (
                  <span key={i} title={b} className="text-xl">{badges[b] || "🏅"}</span>
                ))}
              </div>
            )}

            <p className="text-xs text-muted-foreground mt-4">Based on study points earned this week</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

const Home = () => {
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
      <section className="relative min-h-[100vh] flex items-center overflow-hidden" style={{ contentVisibility: 'auto', containIntrinsicSize: '0 100vh' }}>
        {/* Background */}
        {settings?.banner_url ? (
          <img
            src={settings.banner_url}
            alt="School banner"
            className="absolute inset-0 w-full h-full object-cover will-change-transform"
            loading="eager"
            decoding="async"
            fetchPriority="high"
          />
        ) : (
          <div className="absolute inset-0 gradient-hero" />
        )}
        <div className="absolute inset-0 bg-gradient-to-br from-[#042C53]/80 via-[#042C53]/50 to-transparent" />

        {/* Blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
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
        </div>

        {/* Content */}
        <div className="container mx-auto px-4 relative z-10 py-24">
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

            {/* Buttons */}
            <motion.div variants={stagger.child} className="mt-8 flex flex-wrap gap-4">
              <Link
                to="/results"
                className="inline-flex items-center gap-2 gradient-accent text-primary-foreground font-semibold px-7 py-3.5 rounded-xl shadow-elevated hover:shadow-card hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
              >
                View Results
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/about"
                className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/25 text-white font-semibold px-7 py-3.5 rounded-xl hover:bg-white/20 transition-all duration-200"
              >
                Learn More
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ════════ STATS BAR ════════ */}
      <section className="relative z-20 -mt-12">
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
      <section className="py-20 cv-auto">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <span className="text-sm font-semibold uppercase tracking-widest text-primary">Our Strengths</span>
            <h2 className="mt-2 text-3xl md:text-4xl font-heading font-bold text-foreground">
              Why Choose Us
            </h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger.parent}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            {features.map((f) => (
              <motion.div
                key={f.title}
                variants={stagger.child}
                whileHover={{ y: -8 }}
                className="group bg-card rounded-2xl p-6 shadow-card hover:shadow-elevated transition-all duration-300 border border-transparent hover:border-primary/20"
              >
                <div className="w-12 h-12 rounded-xl gradient-hero flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <f.icon className="w-6 h-6 text-primary-foreground" />
                </div>
                <h3 className="font-heading font-semibold text-foreground text-lg">{f.title}</h3>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ════════ DAILY QUOTE / HADITH ════════ */}
      <section className="py-10 cv-auto">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="mb-4 text-center">
            <span className="text-sm font-semibold uppercase tracking-widest text-primary">Thought of the Day</span>
          </div>
          <DailyQuoteCard />
        </div>
      </section>

       {/* ════════ LATEST NOTICES ════════ */}
      <section className="py-16 bg-secondary/50 cv-auto">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <span className="text-sm font-semibold uppercase tracking-widest text-primary">Stay Updated</span>
              <h2 className="mt-1 text-2xl md:text-3xl font-heading font-bold text-foreground">Latest Notices</h2>
            </div>
            <Link to="/notices" className="text-sm font-medium text-primary hover:underline flex items-center gap-1">
              View All <ChevronRight className="w-4 h-4" />
            </Link>
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
      </section>

      {/* ════════ LATEST NEWS ════════ */}
      <section className="py-20 cv-auto">
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
      </section>

      {/* ════════ TEACHERS PREVIEW ════════ */}
      <section className="py-16 bg-secondary/50 cv-auto">
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
      </section>

      {/* ════════ ACHIEVEMENTS ════════ */}
      <section className="py-20 cv-auto">
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
      </section>

      {/* ════════ QUICK ACCESS ════════ */}
      <section className="py-16 bg-secondary/50 cv-auto">
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
      </section>

      {/* ════════ CTA ════════ */}
      <section className="py-20">
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
      </section>

    </PageLayout>
  );
};

export default Home;
