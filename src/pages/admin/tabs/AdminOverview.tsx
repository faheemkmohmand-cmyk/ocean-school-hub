import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users, GraduationCap, Bell, Newspaper, BookOpen, Image, Trophy, UserCog,
  Plus, ExternalLink, LayoutDashboard,
} from "lucide-react";

const useAdminStats = () =>
  useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [students, teachers, notices, news, library, albums, users, achievements] =
        await Promise.all([
          supabase.from("students").select("id", { count: "exact", head: true }),
          supabase.from("teachers").select("id", { count: "exact", head: true }),
          supabase.from("notices").select("id", { count: "exact", head: true }),
          supabase.from("news").select("id", { count: "exact", head: true }),
          supabase.from("library_files").select("id", { count: "exact", head: true }),
          supabase.from("gallery_albums").select("id", { count: "exact", head: true }),
          supabase.from("profiles").select("id", { count: "exact", head: true }),
          supabase.from("achievements").select("id", { count: "exact", head: true }),
        ]);
      return {
        students: students.count ?? 0,
        teachers: teachers.count ?? 0,
        notices: notices.count ?? 0,
        news: news.count ?? 0,
        library: library.count ?? 0,
        albums: albums.count ?? 0,
        users: users.count ?? 0,
        achievements: achievements.count ?? 0,
      };
    },
    staleTime: 60_000,
  });

const statCards = [
  { key: "students"     as const, label: "Students",         icon: GraduationCap },
  { key: "teachers"     as const, label: "Teachers",         icon: Users         },
  { key: "notices"      as const, label: "Notices",          icon: Bell          },
  { key: "news"         as const, label: "News",             icon: Newspaper     },
  { key: "library"      as const, label: "Library Files",    icon: BookOpen      },
  { key: "albums"       as const, label: "Gallery Albums",   icon: Image         },
  { key: "users"        as const, label: "Registered Users", icon: UserCog       },
  { key: "achievements" as const, label: "Achievements",     icon: Trophy        },
];

const AdminOverview = () => {
  const { data: stats, isLoading } = useAdminStats();

  return (
    <div className="space-y-6">

      {/* ── Header row with navigation buttons ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="text-2xl font-heading font-bold text-foreground">Dashboard Overview</h2>

        <div className="flex items-center gap-2">
          {/* Go to User Dashboard */}
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground bg-secondary hover:bg-secondary/80 px-3 py-2 rounded-lg transition-colors"
          >
            <LayoutDashboard className="w-4 h-4" />
            User Dashboard
          </Link>

          {/* Visit Main Website */}
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-primary hover:bg-primary/90 px-4 py-2 rounded-lg shadow-sm transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Visit Website
          </Link>
        </div>
      </div>

      {/* ── Stats grid ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <Card key={s.key} className="border-border hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <s.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                {isLoading ? (
                  <Skeleton className="h-7 w-12 mb-1" />
                ) : (
                  <p className="text-2xl font-bold text-primary">{stats?.[s.key] ?? 0}</p>
                )}
                <p className="text-xs text-muted-foreground font-medium">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Quick Actions ── */}
      <div>
        <h3 className="text-lg font-heading font-semibold text-foreground mb-3">Quick Actions</h3>
        <div className="flex flex-wrap gap-3">
          <Button size="sm" className="gap-1.5">
            <Plus className="w-4 h-4" /> Add Notice
          </Button>
          <Button size="sm" className="gap-1.5">
            <Plus className="w-4 h-4" /> Add News
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5">
            <Plus className="w-4 h-4" /> Upload File
          </Button>
        </div>
      </div>

    </div>
  );
};

export default AdminOverview;
