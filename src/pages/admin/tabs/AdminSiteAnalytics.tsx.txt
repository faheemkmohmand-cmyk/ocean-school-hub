// src/pages/admin/tabs/AdminSiteAnalytics.tsx
// Full SaaS-style visitor analytics dashboard — admin only
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import {
  Globe, Monitor, Smartphone, Tablet, TrendingUp, Users,
  Eye, Clock, ArrowUpRight, Chrome, Zap, Activity
} from "lucide-react";
import { format, subDays, startOfDay } from "date-fns";

// ── Types ────────────────────────────────────────────────────────────────────
interface PageView {
  id: number;
  page: string;
  session_id: string;
  user_id: string | null;
  role: string;
  device: string;
  browser: string;
  os: string;
  referrer: string;
  duration_sec: number;
  created_at: string;
}

// ── Colors ───────────────────────────────────────────────────────────────────
const COLORS = ["#6366f1","#10b981","#f59e0b","#ef4444","#8b5cf6","#06b6d4","#ec4899","#84cc16"];

// ── Fetch hook ───────────────────────────────────────────────────────────────
function useSiteAnalytics(days: number) {
  return useQuery<PageView[]>({
    queryKey: ["site-analytics", days],
    queryFn: async () => {
      const since = subDays(new Date(), days).toISOString();
      const { data, error } = await supabase
        .from("page_views")
        .select("*")
        .gte("created_at", since)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
    refetchInterval: 120_000,
  });
}

// ── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon: Icon, color, trend }:
  { label: string; value: string | number; sub?: string; icon: any; color: string; trend?: number }) {
  return (
    <div className="bg-card rounded-2xl border border-border p-4 flex items-start gap-3 shadow-sm">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: color + "20" }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground font-medium truncate">{label}</p>
        <p className="text-xl font-black text-foreground mt-0.5">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
      {trend !== undefined && (
        <div className={`flex items-center gap-0.5 text-xs font-bold ${trend >= 0 ? "text-emerald-500" : "text-red-500"}`}>
          <ArrowUpRight className={`w-3 h-3 ${trend < 0 ? "rotate-180" : ""}`} />
          {Math.abs(trend)}%
        </div>
      )}
    </div>
  );
}

// ── Section heading ───────────────────────────────────────────────────────────
function SectionTitle({ icon: Icon, title }: { icon: any; title: string }) {
  return (
    <h3 className="font-bold text-foreground flex items-center gap-2 text-sm mb-3">
      <Icon className="w-4 h-4 text-primary" /> {title}
    </h3>
  );
}

// ── Custom tooltip ────────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl p-3 shadow-lg text-xs">
      <p className="font-bold text-foreground mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }}>{p.name}: <strong>{p.value}</strong></p>
      ))}
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
const AdminSiteAnalytics = () => {
  const [days, setDays] = useState(7);
  const { data: views = [], isLoading, refetch } = useSiteAnalytics(days);

  // ── Compute stats ──────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    if (!views.length) return null;

    const totalViews = views.length;
    const uniqueSessions = new Set(views.map(v => v.session_id)).size;
    const uniqueUsers    = new Set(views.filter(v => v.user_id).map(v => v.user_id)).size;
    const avgDuration    = Math.round(views.reduce((s, v) => s + (v.duration_sec || 0), 0) / totalViews);
    const bounceRate     = Math.round((views.filter(v => (v.duration_sec || 0) < 10).length / totalViews) * 100);

    // Daily views (last N days)
    const dayMap: Record<string, { views: number; sessions: number }> = {};
    for (let i = days - 1; i >= 0; i--) {
      const d = format(subDays(new Date(), i), "MMM d");
      dayMap[d] = { views: 0, sessions: 0 };
    }
    const sessionsByDay: Record<string, Set<string>> = {};
    views.forEach(v => {
      const d = format(new Date(v.created_at), "MMM d");
      if (dayMap[d]) {
        dayMap[d].views++;
        if (!sessionsByDay[d]) sessionsByDay[d] = new Set();
        sessionsByDay[d].add(v.session_id);
      }
    });
    Object.keys(dayMap).forEach(d => {
      dayMap[d].sessions = sessionsByDay[d]?.size || 0;
    });
    const dailyData = Object.entries(dayMap).map(([date, vals]) => ({ date, ...vals }));

    // Top pages
    const pageMap: Record<string, number> = {};
    views.forEach(v => { pageMap[v.page] = (pageMap[v.page] || 0) + 1; });
    const topPages = Object.entries(pageMap).sort((a, b) => b[1] - a[1]).slice(0, 8)
      .map(([page, count]) => ({ page, count }));

    // Device breakdown
    const deviceMap: Record<string, number> = {};
    views.forEach(v => { const d = v.device || "desktop"; deviceMap[d] = (deviceMap[d] || 0) + 1; });
    const deviceData = Object.entries(deviceMap).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }));

    // Browser breakdown
    const browserMap: Record<string, number> = {};
    views.forEach(v => { const b = v.browser || "Other"; browserMap[b] = (browserMap[b] || 0) + 1; });
    const browserData = Object.entries(browserMap).sort((a, b) => b[1] - a[1]).slice(0, 6)
      .map(([name, value]) => ({ name, value }));

    // OS breakdown
    const osMap: Record<string, number> = {};
    views.forEach(v => { const o = v.os || "Other"; osMap[o] = (osMap[o] || 0) + 1; });
    const osData = Object.entries(osMap).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));

    // Referrers
    const refMap: Record<string, number> = {};
    views.forEach(v => { const r = v.referrer || "direct"; refMap[r] = (refMap[r] || 0) + 1; });
    const referrerData = Object.entries(refMap).sort((a, b) => b[1] - a[1]).slice(0, 6)
      .map(([name, value]) => ({ name, value }));

    // Roles
    const roleMap: Record<string, number> = {};
    views.forEach(v => { const r = v.role || "guest"; roleMap[r] = (roleMap[r] || 0) + 1; });
    const roleData = Object.entries(roleMap).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1), value
    }));

    // Hourly heatmap (avg per hour of day)
    const hourMap: number[] = new Array(24).fill(0);
    const hourCount: number[] = new Array(24).fill(0);
    views.forEach(v => {
      const h = new Date(v.created_at).getHours();
      hourMap[h]++;
    });
    const hourData = hourMap.map((count, h) => ({
      hour: `${h.toString().padStart(2,"0")}:00`,
      visits: count
    }));

    // Recent visitors table (last 20)
    const recent = [...views].reverse().slice(0, 20);

    return {
      totalViews, uniqueSessions, uniqueUsers, avgDuration, bounceRate,
      dailyData, topPages, deviceData, browserData, osData, referrerData, roleData, hourData, recent
    };
  }, [views, days]);

  const deviceIcon = (d: string) => {
    if (d === "Mobile")  return <Smartphone className="w-3 h-3" />;
    if (d === "Tablet")  return <Tablet className="w-3 h-3" />;
    return <Monitor className="w-3 h-3" />;
  };

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-foreground flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" /> Site Analytics
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">Real-time visitor insights — admin only</p>
        </div>
        <div className="flex items-center gap-2">
          {[7, 14, 30].map(d => (
            <button key={d} onClick={() => setDays(d)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${days === d ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
              {d}d
            </button>
          ))}
          <button onClick={() => refetch()} className="p-1.5 rounded-xl bg-secondary hover:bg-secondary/70 transition-colors">
            <Zap className="w-4 h-4 text-primary" />
          </button>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      )}

      {/* No data */}
      {!isLoading && !stats && (
        <div className="text-center py-16 bg-card rounded-2xl border border-border">
          <Globe className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="font-semibold text-foreground">No visits yet in the last {days} days</p>
          <p className="text-xs text-muted-foreground mt-1">Data appears here as students and visitors browse the website</p>
        </div>
      )}

      {stats && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <StatCard label="Total Page Views" value={stats.totalViews.toLocaleString()} icon={Eye} color="#6366f1" />
            <StatCard label="Unique Sessions" value={stats.uniqueSessions.toLocaleString()} icon={Users} color="#10b981" sub="distinct visitors" />
            <StatCard label="Logged-in Users" value={stats.uniqueUsers.toLocaleString()} icon={TrendingUp} color="#f59e0b" />
            <StatCard label="Avg Time on Page" value={`${Math.floor(stats.avgDuration/60)}m ${stats.avgDuration%60}s`} icon={Clock} color="#8b5cf6" />
            <StatCard label="Bounce Rate" value={`${stats.bounceRate}%`} icon={Activity} color="#ef4444" sub="< 10s visits" />
          </div>

          {/* Daily Traffic Chart */}
          <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
            <SectionTitle icon={TrendingUp} title={`Daily Traffic — Last ${days} Days`} />
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={stats.dailyData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gViews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gSessions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.5} />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="views"    name="Page Views"   stroke="#6366f1" strokeWidth={2} fill="url(#gViews)"    dot={false} />
                <Area type="monotone" dataKey="sessions" name="Unique Sessions" stroke="#10b981" strokeWidth={2} fill="url(#gSessions)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Top Pages + Device split */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Top Pages */}
            <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
              <SectionTitle icon={Globe} title="Most Visited Pages" />
              <div className="space-y-2">
                {stats.topPages.map((p, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="w-5 text-[10px] font-black text-muted-foreground text-right">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-semibold text-foreground truncate">{p.page}</span>
                        <span className="text-xs font-bold text-primary ml-2 shrink-0">{p.count}</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${(p.count / stats.topPages[0].count) * 100}%`, background: COLORS[i % COLORS.length] }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Device Breakdown */}
            <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
              <SectionTitle icon={Smartphone} title="Device Breakdown" />
              <div className="flex items-center gap-4">
                <ResponsiveContainer width={140} height={140}>
                  <PieChart>
                    <Pie data={stats.deviceData} dataKey="value" cx="50%" cy="50%" outerRadius={60} innerRadius={35} strokeWidth={2} stroke="var(--background)">
                      {stats.deviceData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {stats.deviceData.map((d, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i] }} />
                        <div className="flex items-center gap-1 text-xs text-foreground">
                          {deviceIcon(d.name)} {d.name}
                        </div>
                      </div>
                      <div className="text-xs font-bold text-foreground">
                        {d.value} <span className="text-muted-foreground font-normal">
                          ({Math.round(d.value / stats.totalViews * 100)}%)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Browser + OS + Referrers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Browser */}
            <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
              <SectionTitle icon={Chrome} title="Browsers" />
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={stats.browserData} layout="vertical" margin={{ left: -10, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" strokeOpacity={0.4} />
                  <XAxis type="number" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} tickLine={false} width={52} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" name="Visits" radius={[0, 4, 4, 0]}>
                    {stats.browserData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* OS */}
            <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
              <SectionTitle icon={Monitor} title="Operating Systems" />
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={stats.osData} layout="vertical" margin={{ left: -10, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" strokeOpacity={0.4} />
                  <XAxis type="number" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} tickLine={false} width={52} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" name="Visits" radius={[0, 4, 4, 0]}>
                    {stats.osData.map((_, i) => <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Referrers */}
            <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
              <SectionTitle icon={Globe} title="Traffic Sources" />
              <div className="space-y-2.5 mt-1">
                {stats.referrerData.map((r, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="text-xs text-foreground truncate max-w-[110px]">{r.name}</span>
                    </div>
                    <span className="text-xs font-bold text-foreground">{r.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Hourly heatmap */}
          <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
            <SectionTitle icon={Clock} title="Visits by Hour of Day (all days combined)" />
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={stats.hourData} margin={{ top: 0, right: 5, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" strokeOpacity={0.4} />
                <XAxis dataKey="hour" tick={{ fontSize: 8 }} tickLine={false} interval={2} />
                <YAxis tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="visits" name="Visits" radius={[3, 3, 0, 0]}>
                  {stats.hourData.map((d, i) => (
                    <Cell key={i} fill={`hsl(${245 + (d.visits / (Math.max(...stats.hourData.map(x=>x.visits)) || 1)) * 40}, 80%, ${55 + (d.visits / (Math.max(...stats.hourData.map(x=>x.visits)) || 1)) * 20}%)`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* User Roles Pie */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
              <SectionTitle icon={Users} title="Visitor Roles" />
              <div className="flex items-center gap-4">
                <ResponsiveContainer width={120} height={120}>
                  <PieChart>
                    <Pie data={stats.roleData} dataKey="value" cx="50%" cy="50%" outerRadius={55} innerRadius={28} strokeWidth={2} stroke="var(--background)">
                      {stats.roleData.map((_, i) => <Cell key={i} fill={COLORS[(i + 3) % COLORS.length]} />)}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {stats.roleData.map((r, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[(i + 3) % COLORS.length] }} />
                        <span className="text-xs text-foreground">{r.name}</span>
                      </div>
                      <span className="text-xs font-bold">{r.value} ({Math.round(r.value/stats.totalViews*100)}%)</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent Visitors */}
            <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
              <SectionTitle icon={Activity} title="Recent Visits" />
              <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                {stats.recent.map((v, i) => (
                  <div key={i} className="flex items-center justify-between text-[11px] py-1 border-b border-border/50 last:border-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        v.role === "admin" ? "bg-red-500" : v.role === "student" ? "bg-blue-500" : v.role === "teacher" ? "bg-green-500" : "bg-gray-400"
                      }`} />
                      <span className="font-semibold text-foreground truncate">{v.page}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2 text-muted-foreground">
                      <span>{v.device === "mobile" ? "📱" : v.device === "tablet" ? "📊" : "🖥️"}</span>
                      <span>{format(new Date(v.created_at), "HH:mm")}</span>
                      {v.duration_sec > 0 && <span className="text-primary font-medium">{v.duration_sec}s</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminSiteAnalytics;
