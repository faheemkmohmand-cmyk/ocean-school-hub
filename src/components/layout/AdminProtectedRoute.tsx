import { ReactNode, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";

const AdminProtectedRoute = ({ children }: { children: ReactNode }) => {
  const [status, setStatus] = useState<"loading" | "admin" | "not-admin" | "not-logged-in">("loading");

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        setStatus("not-logged-in");
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single();

      setStatus(data?.role === "admin" ? "admin" : "not-admin");
    };

    check();
  }, []);

  // Blank screen while checking — no spinner delay
  if (status === "loading") return null;

  if (status === "not-logged-in") return <Navigate to="/auth/signin" replace />;
  if (status === "not-admin") return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
};

export default AdminProtectedRoute;
