import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, GraduationCap, LogIn, UserPlus, LayoutDashboard, LogOut, Shield, Moon, Sun } from "lucide-react";
import { useSchoolSettings } from "@/hooks/useSchoolSettings";
import { useAuth } from "@/hooks/useAuth";
import NotificationBell from "@/components/shared/NotificationBell";
import { useDarkMode } from "@/hooks/useDarkMode";

const navLinks = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/teachers", label: "Teachers" },
  { to: "/notices", label: "Notices" },
  { to: "/news", label: "News" },
  { to: "/results", label: "Results" },
  { to: "/result-card", label: "Result Card" },
  { to: "/gallery", label: "Gallery" },
  { to: "/library", label: "Library" },
  { to: "/notes", label: "📚 Notes" },
];

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const { data: settings } = useSchoolSettings();
  const { user, profile, loading: authLoading, signOut } = useAuth();
  const { isDark, toggle } = useDarkMode();

  const isAdmin = profile?.role === "admin";

  useEffect(() => {
    const sentinel = document.createElement("div");
    sentinel.style.position = "absolute";
    sentinel.style.top = "0";
    sentinel.style.height = "1px";
    sentinel.style.width = "1px";
    document.body.prepend(sentinel);

    const observer = new IntersectionObserver(
      ([entry]) => setScrolled(!entry.isIntersecting),
      { threshold: 1 }
    );
    observer.observe(sentinel);
    return () => {
      observer.disconnect();
      sentinel.remove();
    };
  }, []);

  return (
    <nav
      className={`sticky top-0 z-50 border-b transition-all duration-300 ${
        scrolled
          ? "bg-card/80 backdrop-blur-xl border-border shadow-card"
          : "bg-card/60 backdrop-blur-lg border-transparent"
      }`}
    >
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 shrink-0">
          {settings?.logo_url ? (
            <img src={settings.logo_url} alt="Logo" className="w-10 h-10 rounded-xl object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-xl gradient-hero flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-primary-foreground" />
            </div>
          )}
          <div className="hidden sm:block">
            <span className="font-heading font-bold text-lg text-foreground leading-tight block">
              {settings?.school_name || "GHS Babi Khel"}
            </span>
            <span className="text-xs text-muted-foreground leading-none">
              District Mohmand, KPK
            </span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden lg:flex items-center gap-0.5">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`relative px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
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

        {/* Right Side */}
        <div className="flex items-center gap-2">
          {!authLoading && (
            <>
              {user ? (
                <div className="hidden sm:flex items-center gap-2">
                  <NotificationBell />

                  <button
                    onClick={toggle}
                    className="p-2 rounded-lg hover:bg-secondary text-muted-foreground transition-colors"
                    title={isDark ? "Switch to light mode" : "Switch to dark mode"}
                  >
                    {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                  </button>

                  {isAdmin && (
                    <Link
                      to="/admin"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-amber-500 text-white shadow-card hover:bg-amber-600 transition-all duration-200"
                    >
                      <Shield className="w-4 h-4" />
                      Admin Panel
                    </Link>
                  )}

                  <Link
                    to="/dashboard"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium gradient-accent text-primary-foreground shadow-card hover:shadow-elevated transition-all duration-200"
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    Dashboard
                  </Link>
                  <button
                    onClick={signOut}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="hidden sm:flex items-center gap-2">
                  <button
                    onClick={toggle}
                    className="p-2 rounded-lg hover:bg-secondary text-muted-foreground transition-colors"
                    title={isDark ? "Switch to light mode" : "Switch to dark mode"}
                  >
                    {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                  </button>
                  <Link
                    to="/auth/signin"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  >
                    <LogIn className="w-4 h-4" />
                    Sign In
                  </Link>
                  <Link
                    to="/auth/signup"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium gradient-accent text-primary-foreground shadow-card hover:shadow-elevated transition-all duration-200"
                  >
                    <UserPlus className="w-4 h-4" />
                    Sign Up
                  </Link>
                </div>
              )}
            </>
          )}
          <button
            onClick={() => setOpen(!open)}
            className="lg:hidden p-2 rounded-lg text-foreground hover:bg-secondary transition-colors"
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="lg:hidden overflow-hidden border-t border-border bg-card/95 backdrop-blur-xl"
          >
            <div className="p-4 space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setOpen(false)}
                  className={`block px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    location.pathname === link.to
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-2 border-t border-border mt-2 space-y-1">
                <button
                  onClick={() => { toggle(); setOpen(false); }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-secondary w-full text-left"
                >
                  {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  {isDark ? "Light Mode" : "Dark Mode"}
                </button>
                {user ? (
                  <>
                    {isAdmin && (
                      <Link
                        to="/admin"
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-amber-500 text-white"
                      >
                        <Shield className="w-4 h-4" />
                        Admin Panel
                      </Link>
                    )}
                    <Link
                      to="/dashboard"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium gradient-accent text-primary-foreground"
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      Dashboard
                    </Link>
                    <button
                      onClick={() => { signOut(); setOpen(false); }}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-secondary w-full text-left"
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
                      className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-secondary"
                    >
                      <LogIn className="w-4 h-4" />
                      Sign In
                    </Link>
                    <Link
                      to="/auth/signup"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium gradient-accent text-primary-foreground"
                    >
                      <UserPlus className="w-4 h-4" />
                      Sign Up
                    </Link>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
                  
