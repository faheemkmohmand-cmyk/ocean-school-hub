import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu, X, GraduationCap, LogIn, UserPlus,
  LayoutDashboard, LogOut, Shield
} from "lucide-react";
import { useSchoolSettings } from "@/hooks/useSchoolSettings";
import { useAuth } from "@/hooks/useAuth";
import NotificationBell from "@/components/shared/NotificationBell";
import ThemeSwitcher from "@/components/shared/ThemeSwitcher";

const navLinks = [
  { to: "/",               label: "Home" },
  { to: "/about",          label: "About" },
  { to: "/teachers",       label: "Teachers" },
  { to: "/notices",        label: "Notices" },
  { to: "/news",           label: "News" },
  { to: "/results",        label: "Results" },
  { to: "/gallery",        label: "Gallery" },
  { to: "/library",        label: "Library" },
  { to: "/notes",          label: "📚 Notes" },
  { to: "/weather",        label: "🌤️ Weather" },
  { to: "/online-classes", label: "📹 Online Classes" },
];

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const { data: settings } = useSchoolSettings();
  const { user, profile, loading: authLoading, signOut } = useAuth();

  const isAdmin = profile?.role === "admin";

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav className={`sticky top-0 z-50 border-b transition-all duration-300 ${
      scrolled
        ? "bg-card/90 backdrop-blur-xl border-border shadow-card"
        : "bg-card/70 backdrop-blur-lg border-transparent"
    }`}>
      <div className="container mx-auto flex items-center justify-between h-16 px-4">

        {/* ── Logo ── */}
        <Link to="/" className="flex items-center gap-2.5 shrink-0">
          {settings?.logo_url ? (
            <img src={settings.logo_url} alt="Logo" className="w-10 h-10 rounded-xl object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-xl gradient-hero flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-primary-foreground" />
            </div>
          )}
          <div className="hidden sm:block">
            <span className="font-heading font-bold text-base text-foreground leading-tight block">
              {settings?.school_name || "GHS Babi Khel"}
            </span>
            <span className="text-[11px] text-muted-foreground leading-none">
              District Mohmand, KPK
            </span>
          </div>
        </Link>

        {/* ── Desktop Nav Links ── */}
        <div className="hidden lg:flex items-center gap-0.5 overflow-x-auto">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`relative px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                {link.label}
                {isActive && (
                  <motion.div
                    layoutId="nav-underline"
                    className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-primary"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}
        </div>

        {/* ── Desktop Right Side ── */}
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          {!authLoading && (
            <>
              {user ? (
                <>
                  <NotificationBell />
                  <ThemeSwitcher />
                  {isAdmin && (
                    <Link to="/admin"
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold bg-amber-500 text-white hover:bg-amber-600 transition-all">
                      <Shield className="w-4 h-4" /> Admin
                    </Link>
                  )}
                  <Link to="/dashboard"
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold gradient-accent text-primary-foreground shadow-card hover:shadow-elevated transition-all">
                    <LayoutDashboard className="w-4 h-4" /> Dashboard
                  </Link>
                  <button onClick={signOut}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                    <LogOut className="w-4 h-4" />
                    <span className="hidden xl:inline">Sign Out</span>
                  </button>
                </>
              ) : (
                <>
                  <ThemeSwitcher />
                  <Link to="/auth/signin"
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors">
                    <LogIn className="w-4 h-4" /> Sign In
                  </Link>
                  <Link to="/auth/signup"
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold gradient-accent text-primary-foreground shadow-card hover:shadow-elevated transition-all">
                    <UserPlus className="w-4 h-4" /> Sign Up
                  </Link>
                </>
              )}
            </>
          )}
        </div>

        {/* ── Hamburger ── */}
        <button
          onClick={() => setOpen(!open)}
          className="lg:hidden p-2 rounded-lg text-foreground hover:bg-secondary transition-colors shrink-0 ml-2"
          aria-label="Toggle menu"
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* ════════ MOBILE MENU ════════ */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className="lg:hidden border-t border-border bg-card/98 backdrop-blur-xl"
            style={{ overflow: "hidden" }}
          >
            {/* Scrollable inner — so Sign Out is ALWAYS reachable */}
            <div
              className="overflow-y-auto"
              style={{ maxHeight: "calc(100vh - 64px)" }}
            >
              <div className="p-4 space-y-1">

                {/* Nav links */}
                {navLinks.map((link) => {
                  const isActive = location.pathname === link.to;
                  return (
                    <Link
                      key={link.to}
                      to={link.to}
                      onClick={() => setOpen(false)}
                      className={`flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                      }`}
                    >
                      {link.label}
                    </Link>
                  );
                })}

                {/* Divider */}
                <div className="pt-2 pb-1">
                  <div className="h-px bg-border" />
                </div>

                {/* Theme row */}
                <div className="flex items-center justify-between px-4 py-2 rounded-xl hover:bg-secondary transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🎨</span>
                    <span className="text-sm font-medium text-foreground">Theme</span>
                  </div>
                  <ThemeSwitcher compact={false} />
                </div>

                {/* Auth buttons */}
                {!authLoading && (
                  <div className="space-y-1 pt-1">
                    {user ? (
                      <>
                        {isAdmin && (
                          <Link
                            to="/admin"
                            onClick={() => setOpen(false)}
                            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold bg-amber-500 text-white w-full"
                          >
                            <Shield className="w-4 h-4" />
                            Admin Panel
                          </Link>
                        )}
                        <Link
                          to="/dashboard"
                          onClick={() => setOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold gradient-accent text-primary-foreground w-full"
                        >
                          <LayoutDashboard className="w-4 h-4" />
                          Dashboard
                        </Link>
                        {/* ── SIGN OUT — always visible, full width, red ── */}
                        <button
                          onClick={() => { signOut(); setOpen(false); }}
                          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold w-full transition-colors"
                          style={{
                            color: "hsl(var(--destructive))",
                            backgroundColor: "hsl(var(--destructive) / 0.08)",
                          }}
                        >
                          <LogOut className="w-4 h-4" />
                          Sign Out
                        </button>
                      </>
                    ) : (
                      <>
                        <Link
                          to="/auth/signin"
                          onClick={() => setOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:bg-secondary w-full transition-colors"
                        >
                          <LogIn className="w-4 h-4" />
                          Sign In
                        </Link>
                        <Link
                          to="/auth/signup"
                          onClick={() => setOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold gradient-accent text-primary-foreground w-full"
                        >
                          <UserPlus className="w-4 h-4" />
                          Sign Up
                        </Link>
                      </>
                    )}
                  </div>
                )}

                {/* Safe bottom spacing */}
                <div className="h-4" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
