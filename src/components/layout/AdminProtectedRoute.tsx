import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

const AdminProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { user, profile, loading } = useAuth();

  // ✅ Wait for BOTH user AND profile to load before deciding
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  // ✅ Not logged in → go to sign in
  if (!user) return <Navigate to="/auth/signin" replace />;

  // ✅ Logged in but not admin → go to dashboard
  if (profile?.role !== "admin") return <Navigate to="/dashboard" replace />;

  // ✅ Is admin → show admin panel
  return <>{children}</>;
};

export default AdminProtectedRoute;
