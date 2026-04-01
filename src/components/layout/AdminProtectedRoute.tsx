import { ReactNode, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

const AdminProtectedRoute = ({ children }: { children: ReactNode }) => {
  const [status, setStatus] = useState<"loading" | "admin" | "not-admin" | "not-logged-in">("loading");

  useEffect(() => {
    const check = async () => {
      try {
        // Get current session
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.user) {
          setStatus("not-logged-in");
          return;
        }

        // Direct query — no RPC, no cache, always fresh
        const { data, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .single();

        if (error || !data) {
          console.warn("AdminProtectedRoute: profile fetch failed", error?.message);
          setStatus("not-admin");
          return;
        }

        console.log("AdminProtectedRoute: role =", data.role);
        setStatus(data.role === "admin" ? "admin" : "not-admin");

      } catch (e) {
        console.warn("AdminProtectedRoute error:", e);
        setStatus("not-admin");
      }
    };

    check();

    // Also re-check when auth state changes (e.g. after sign in)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      setStatus("loading");
      check();
    });

    return () => subscription.unsubscribe();
  }, []);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  if (status === "not-logged-in") return <Navigate to="/auth/signin" replace />;
  if (status === "not-admin") return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
};

export default AdminProtectedRoute;
