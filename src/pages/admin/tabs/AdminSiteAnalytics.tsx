// src/pages/admin/tabs/AdminSiteAnalytics.tsx
import { lazy, Suspense, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line,
} from "recharts";
import {
  Users, Eye, Smartphone, Monitor, Tablet,
  TrendingUp, Globe, BarChart3, Clock, ArrowUpRight, ArrowDownRight,
  Minus, RefreshCw, Activity, Layers, MousePointerClick,
} from "lucide-react";
import { format, subDays, startOfDay, startOfWeek, parseISO, differenceInDays } from "date-fns";

const AdminPendingRequests = lazy(() => import("./AdminPendingRequests"));

// ── Types ─────────────────────────────────────────────────────────────────────
interface Visit {
  id: string;
  page: string;
  device_type: string;
  session_id: string;
  visited_at: string;
  referrer?: string | null;
  user_id?: string | null;
}

type Range = "7" | "14" | "30";

// ── Data fetching ──────────────────────────────────────────────────────────────
function useSiteVisits(days: number) {
  return useQuery<Visit[]>({
    queryKey: ["site-visits", days],
    queryFn: async () => {
      const since = subDays(new Date(), days).toISOString();
      const { data, error } = await supabase
        .from("site_visits")
        .select("id, page, device_type, session_id, visited_at, referrer, user_id")
        .gte("visited_at", since)
        .order("visited_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 2 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function buildDailyData(visits: Visit[], days: number) {
  const map: Record<string, { date: string; views: number; visitors: Set<string>; signedIn: number }> = {};
  for (let i = days - 1; i >= 0; i--) {
    const d = format(subDays(new Date(), i), days <= 14 ? "MMM d" : "MMM d");
    map[d] = { date: d, views: 0, visitors: new Set(), signedIn: 0 };
  }
  visits.forEach((v) => {
    const d = format(parseISO(v.visited_at), "MMM d");
    if (map[d]) {
      map[d].views += 1;
      map[d].visitors.add(v.session_id);
      if (v.user_id) map[d].signedIn += 1;
    }
  });
  return Object.values(map).map((d) => ({
    date: d.date,
    views: d.views,
    visitors: d.visitors.size,
    signedIn: d.signedIn,
  }));
}

function buildHourlyData(visits: Visit[]) {
  const hours: Record<number, number> = {};
  for (let h = 0; h < 24; h++) hours[h] = 0;
  visits
    .filter((v) => parseISO(v.visited_at) >= startOfDay(subDays(new Date(), 6)))
    .forEach((v) => {
      const h = parseISO(v.visited_at).getHours();
      hours[h] += 1;
    });
  return Array.from({ length: 24 }, (_, h) => ({
    hour: h === 0 ? "12am" : h < 12 ? `${h}am` : h === 12 ? "12pm" : `${h - 12}pm`,
    visits: hours[h],
  }));
}

function buildTopPages(visits: Visit[]) {
  const counts: Record<string, { views: number; sessions: Set<string> }> = {};
  visits.forEach((v) => {
    if (!counts[v.page]) counts[v.page] = { views: 0, sessions: new Set() };
    counts[v.page].views += 1;
    counts[v.page].sessions.add(v.session_id);
  });
  return Object.entries(counts)
    .sort((a, b) => b[1].views - a[1].views)
    .slice(0, 8)
    .map(([page, d]) => ({
      page: page === "/" ? "Home" : page.replace(/^\//, "").replace(/-/g, " "),
      views: d.views,
      visitors: d.sessions.size,
    }));
}

function buildDeviceData(visits: Visit[]) {
  const counts: Record<string, number> = { mobile: 0, tablet: 0, desktop: 0 };
  visits.forEach((v) => { counts[v.device_type] = (counts[v.device_type] ?? 0) + 1; });
  return [
    { name: "Mobile",  value: counts.mobile,  color: "#3b82f6" },
    { name: "Desktop", value: counts.desktop, color: "#8b5cf6" },
    { name: "Tablet",  value: counts.tablet,  color: "#10b981" },
  ].filter((d) => d.value > 0);
}

function buildReferrerData(visits: Visit[]) {
  const counts: Record<string, number> = {};
  visits.forEach((v) => {
    const ref = v.referrer
      ? (v.referrer.includes("google") ? "Google" :
         v.referrer.includes("facebook") ? "Facebook" :
         v.referrer.includes("youtube") ? "YouTube" :
         v.referrer.includes("twitter") || v.referrer.includes("x.com") ? "Twitter/X" :
         "Other")
      : "Direct";
    counts[ref] = (counts[ref] ?? 0) + 1;
  });
  const colors: Record<string, string> = {
    Direct: "#3b82f6", Google: "#10b981", Facebook: "#f59e0b",
    YouTube: "#ef4444", "Twitter/X": "#6366f1", Other: "#94a3b8",
  };
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value, color: colors[name] ?? "#94a3b8" }));
}

function buildWeeklyData(visits: Visit[]) {
  const weeks: Record<string, { label: string; views: number; visitors: Set<string> }> = {};
  for (let w = 3; w >= 0; w--) {
    const start = startOfWeek(subDays(new Date(), w * 7));
    const label = `Wk ${format(start, "MMM d")}`;
    weeks[label] = { label, views: 0, visitors: new Set() };
  }
  visits.forEach((v) => {
    const start = startOfWeek(parseISO(v.visited_at));
    const label = `Wk ${format(start, "MMM d")}`;
    if (weeks[label]) {
      weeks[label].views += 1;
      weeks[label].visitors.add(v.session_id);
    }
  });
  return Object.values(weeks).map((w) => ({
    week: w.label,
    views: w.views,
    visitors: w.visitors.size,
  }));
}

// ── Trend calculation ──────────────────────────────────────────────────────────
function getTrend(visits: Visit[], days: number) {
  const mid = subDays(new Date(), Math.floor(days / 2));
  const current  = visits.filter((v) => parseISO(v.visited_at) >= mid).length;
  const previous = visits.filter((v) => parseISO(v.visited_at) <  mid).length;
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

// ── Trend badge ────────────────────────────────────────────────────────────────
function TrendBadge({ pct }: { pct: number | null }) {
  if (pct === null) return null;
  if (pct > 0)  return <span className="flex items-center gap-0.5 text-xs text-emerald-600 font-semibold"><ArrowUpRight className="w-3 h-3" />{pct}%</span>;
  if (pct < 0)  return <span className="flex items-center gap-0.5 text-xs text-red-500 font-semibold"><ArrowDownRight className="w-3 h-3" />{Math.abs(pct)}%</span>;
  return <span className="flex items-center gap-0.5 text-xs text-muted-foreground font-semibold"><Minus className="w-3 h-3" />0%</span>;
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({
  label, value, icon: Icon, color, sub, trend,
}: {
  label: string; value: number | string; icon: React.ElementType;
  color: string; sub?: string; trend?: number | null;
}) {
  return (
    <Card className="border-border hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="p-2 rounded-xl" style={{ backgroundColor: `${color}18` }}>
            <Icon className="w-4 h-4" style={{ color }} />
          </div>
          {trend !== undefined && <TrendBadge pct={trend ?? null} />}
        </div>
        <p className="text-2xl font-bold text-foreground tracking-tight">
          {typeof value === "number" ? value.toLocaleString() : value}
        </p>
        <p className="text-xs font-medium text-foreground/70 mt-0.5">{label}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

// ── Custom Tooltip ─────────────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl p-3 shadow-xl text-xs min-w-[120px]">
      <p className="font-semibold text-foreground mb-2">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: p.color }} />
            {p.name}
          </span>
          <span className="font-bold text-foreground">{p.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
};

// ── Skeleton loader ────────────────────────────────────────────────────────────
const AnalyticsSkeleton = () => (
  <div className="space-y-5">
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
    </div>
    <Skeleton className="h-72 rounded-xl" />
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Skeleton className="h-64 rounded-xl" />
      <Skeleton className="h-64 rounded-xl" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Skeleton className="h-56 rounded-xl" />
      <Skeleton className="h-56 rounded-xl" />
      <Skeleton className="h-56 rounded-xl" />
    </div>
  </div>
);

// ── Main Component ─────────────────────────────────────────────────────────────
const AdminSiteAnalytics = () => {
  const [range, setRange] = useState<Range>("14");
  const days = parseInt(range);

  const { data: visits = [], isLoading, error, refetch, isFetching } = useSiteVisits(days);

  const dailyData    = buildDailyData(visits, days);
  const hourlyData   = buildHourlyData(visits);
  const topPages     = buildTopPages(visits);
  const deviceData   = buildDeviceData(visits);
  const referrerData = buildReferrerData(visits);
  const weeklyData   = buildWeeklyData(visits);

  const totalViews     = visits.length;
  const uniqueSessions = new Set(visits.map((v) => v.session_id)).size;
  const todayViews     = visits.filter((v) => parseISO(v.visited_at) >= startOfDay(new Date())).length;
  const signedInViews  = visits.filter((v) => v.user_id).length;
  const mobileCount    = visits.filter((v) => v.device_type === "mobile").length;
  const mobilePct      = totalViews ? Math.round((mobileCount / totalViews) * 100) : 0;
  const avgPerDay      = days > 0 ? Math.round(totalViews / days) : 0;
  const viewsTrend     = getTrend(visits, days);
  const sessionsTrend  = getTrend(visits, days);

  if (isLoading) return <AnalyticsSkeleton />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
        <BarChart3 className="w-12 h-12 text-muted-foreground/30" />
        <p className="font-semibold text-foreground">Could not load analytics</p>
        <p className="text-xs text-muted-foreground max-w-xs">
          Make sure the <code className="bg-muted px-1 rounded">site_visits</code> table exists in your database.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-heading font-bold text-foreground flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Site Analytics
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">Real-time visitor insights</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Range picker */}
          <div className="flex rounded-lg border border-border overflow-hidden text-xs">
            {(["7", "14", "30"] as Range[]).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1.5 font-medium transition-colors ${
                  range === r
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {r}d
              </button>
            ))}
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <Badge variant="outline" className="text-xs gap-1.5 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block animate-pulse" />
            Live
          </Badge>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Page Views"    value={totalViews}      icon={Eye}              color="#3b82f6" sub={`Last ${days} days`}       trend={viewsTrend} />
        <StatCard label="Unique Sessions"     value={uniqueSessions}  icon={Users}            color="#8b5cf6" sub="Unique browsers"            trend={sessionsTrend} />
        <StatCard label="Today's Views"       value={todayViews}      icon={TrendingUp}       color="#10b981" sub="Since midnight" />
        <StatCard label="Avg Views / Day"     value={avgPerDay}       icon={BarChart3}        color="#f59e0b" sub={`Over ${days} days`} />
      </div>

      {/* ── Secondary KPIs ── */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-border">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/10"><Smartphone className="w-4 h-4 text-blue-500" /></div>
            <div>
              <p className="text-lg font-bold text-foreground">{mobilePct}%</p>
              <p className="text-xs text-muted-foreground">Mobile Traffic</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-violet-500/10"><MousePointerClick className="w-4 h-4 text-violet-500" /></div>
            <div>
              <p className="text-lg font-bold text-foreground">{signedInViews.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Logged-in Views</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10"><Layers className="w-4 h-4 text-emerald-500" /></div>
            <div>
              <p className="text-lg font-bold text-foreground">
                {uniqueSessions > 0 ? (totalViews / uniqueSessions).toFixed(1) : "0"}
              </p>
              <p className="text-xs text-muted-foreground">Pages / Session</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Daily Traffic Area Chart ── */}
      <Card className="border-border">
        <CardHeader className="pb-2 pt-4 px-5">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Daily Traffic — Last {days} Days
          </CardTitle>
        </CardHeader>
        <CardContent className="px-2 pb-4">
          {totalViews === 0 ? (
            <div className="flex flex-col items-center justify-center h-52 gap-2">
              <Clock className="w-8 h-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No visits recorded yet</p>
              <p className="text-xs text-muted-foreground">Browse a few pages to see data appear here</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={dailyData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="viewsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="visitorsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#8b5cf6" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="signedInGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="views"    name="Page Views"    stroke="#3b82f6" fill="url(#viewsGrad)"    strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="visitors" name="Unique Sessions" stroke="#8b5cf6" fill="url(#visitorsGrad)" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="signedIn" name="Logged-in"     stroke="#10b981" fill="url(#signedInGrad)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* ── Row: Top Pages + Device Breakdown ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top Pages */}
        <Card className="border-border">
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              Top Pages
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-4">
            {topPages.length === 0 ? (
              <div className="flex items-center justify-center h-48">
                <p className="text-sm text-muted-foreground">No data yet</p>
              </div>
            ) : (
              <div className="space-y-2 px-3">
                {topPages.map((p, i) => {
                  const pct = totalViews > 0 ? Math.round((p.views / totalViews) * 100) : 0;
                  return (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-foreground capitalize truncate max-w-[55%]">
                          {p.page}
                        </span>
                        <div className="flex items-center gap-2 text-muted-foreground shrink-0">
                          <span>{p.views.toLocaleString()} views</span>
                          <span className="text-foreground font-semibold">{pct}%</span>
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: i === 0 ? "#3b82f6" : i === 1 ? "#8b5cf6" : i === 2 ? "#10b981" : "#f59e0b" }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Device breakdown — donut + detail */}
        <Card className="border-border">
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-primary" />
              Device Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            {deviceData.length === 0 ? (
              <div className="flex items-center justify-center h-48">
                <p className="text-sm text-muted-foreground">No data yet</p>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="55%" height={160}>
                  <PieChart>
                    <Pie data={deviceData} cx="50%" cy="50%" innerRadius={42} outerRadius={68} paddingAngle={3} dataKey="value" strokeWidth={0}>
                      {deviceData.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => [`${v} visits`, ""]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-col gap-3 flex-1">
                  {[
                    { icon: Smartphone, label: "Mobile",  count: visits.filter(v => v.device_type === "mobile").length,  color: "#3b82f6" },
                    { icon: Monitor,    label: "Desktop", count: visits.filter(v => v.device_type === "desktop").length, color: "#8b5cf6" },
                    { icon: Tablet,     label: "Tablet",  count: visits.filter(v => v.device_type === "tablet").length,  color: "#10b981" },
                  ].map(({ icon: Icon, label, count, color }) => {
                    const pct = totalViews > 0 ? Math.round((count / totalViews) * 100) : 0;
                    return (
                      <div key={label} className="flex items-center gap-2">
                        <Icon className="w-3.5 h-3.5 shrink-0" style={{ color }} />
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between text-xs mb-0.5">
                            <span className="text-muted-foreground">{label}</span>
                            <span className="font-semibold text-foreground">{pct}%</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Row: Hourly Heatmap + Traffic Sources + Weekly Bar ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Hourly activity */}
        <Card className="border-border">
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              Hourly Activity
            </CardTitle>
            <p className="text-xs text-muted-foreground">Last 7 days</p>
          </CardHeader>
          <CardContent className="px-2 pb-4">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={hourlyData} margin={{ top: 0, right: 5, left: -28, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="hour" tick={{ fontSize: 9 }} tickLine={false} axisLine={false}
                  interval={5} />
                <YAxis tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="visits" name="Visits" fill="#3b82f6" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Traffic sources */}
        <Card className="border-border">
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Globe className="w-4 h-4 text-primary" />
              Traffic Sources
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {referrerData.length === 0 ? (
              <div className="flex items-center justify-center h-40">
                <p className="text-sm text-muted-foreground">No data yet</p>
              </div>
            ) : (
              <div className="space-y-3 mt-1">
                {referrerData.map((r, i) => {
                  const pct = totalViews > 0 ? Math.round((r.value / totalViews) * 100) : 0;
                  return (
                    <div key={i}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="flex items-center gap-1.5 font-medium text-foreground">
                          <span className="w-2 h-2 rounded-full inline-block shrink-0" style={{ backgroundColor: r.color }} />
                          {r.name}
                        </span>
                        <span className="text-muted-foreground">{r.value} <span className="font-semibold text-foreground">({pct}%)</span></span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: r.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Weekly comparison */}
        <Card className="border-border">
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              Weekly Comparison
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-4">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={weeklyData} margin={{ top: 0, right: 5, left: -28, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="week" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="views"    name="Views"    fill="#3b82f6" radius={[3, 3, 0, 0]} />
                <Bar dataKey="visitors" name="Sessions" fill="#8b5cf6" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* ── Engagement line chart ── */}
      <Card className="border-border">
        <CardHeader className="pb-2 pt-4 px-5">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            Engagement Trend — Views vs Unique Sessions
          </CardTitle>
        </CardHeader>
        <CardContent className="px-2 pb-4">
          {totalViews === 0 ? (
            <div className="flex items-center justify-center h-40">
              <p className="text-sm text-muted-foreground">No data yet</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={dailyData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Line type="monotone" dataKey="views"    name="Page Views"      stroke="#3b82f6" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="visitors" name="Unique Sessions"  stroke="#8b5cf6" strokeWidth={2} dot={false} strokeDasharray="4 4" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* ── Summary footer ── */}
      <Card className="border-border bg-muted/30">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center divide-x divide-border">
            {[
              { label: "Avg Daily Views",       value: avgPerDay.toLocaleString() },
              { label: "Total Unique Sessions",  value: uniqueSessions.toLocaleString() },
              { label: "Pages per Session",      value: uniqueSessions > 0 ? (totalViews / uniqueSessions).toFixed(1) : "–" },
              { label: "Mobile Share",           value: `${mobilePct}%` },
            ].map(({ label, value }) => (
              <div key={label} className="px-2">
                <p className="text-lg font-bold text-foreground">{value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSiteAnalytics;

// ─── WRAPPER with Pending Requests tab ────────────────────────────────────────
export const AdminAnalyticsHub = () => (
  <div className="space-y-4">
    <div>
      <h2 className="text-xl font-heading font-bold text-foreground flex items-center gap-2">
        <Globe className="w-5 h-5 text-primary" /> Analytics & Requests
      </h2>
      <p className="text-sm text-muted-foreground mt-0.5">Site analytics and pending user requests</p>
    </div>
    <Tabs defaultValue="analytics" className="w-full">
      <TabsList className="w-full grid grid-cols-2 sm:inline-flex sm:w-auto">
        <TabsTrigger value="analytics" className="gap-1.5 text-xs sm:text-sm">
          <Globe className="w-3.5 h-3.5" />
          <span>Site Analytics</span>
        </TabsTrigger>
        <TabsTrigger value="pending" className="gap-1.5 text-xs sm:text-sm">
          <Clock className="w-3.5 h-3.5" />
          <span>Pending Requests</span>
        </TabsTrigger>
      </TabsList>
      <TabsContent value="analytics" className="mt-4">
        <AdminSiteAnalytics />
      </TabsContent>
      <TabsContent value="pending" className="mt-4">
        <Suspense fallback={<div className="space-y-2">{[...Array(4)].map((_,i)=><div key={i} className="h-12 rounded-lg bg-muted animate-pulse"/>)}</div>}>
          <AdminPendingRequests />
        </Suspense>
      </TabsContent>
    </Tabs>
  </div>
);
