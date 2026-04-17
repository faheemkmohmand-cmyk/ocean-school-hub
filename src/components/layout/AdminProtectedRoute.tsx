import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

const AdminProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { user, profile, loading } = useAuth();

  // Show spinner while auth loads — same as ProtectedRoute
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not logged in → sign in page
  if (!user) {
    return <Navigate to="/auth/signin" replace />;
  }

  // Not admin → back to user dashboard
  if (profile?.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default AdminProtectedRoute;
