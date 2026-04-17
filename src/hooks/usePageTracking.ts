// src/hooks/usePageTracking.ts
import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./useAuth";

function getOrCreateSessionId(): string {
  const key = "ghs_session_id";
  let sid = sessionStorage.getItem(key);
  if (!sid) {
    sid = crypto.randomUUID();
    sessionStorage.setItem(key, sid);
  }
  return sid;
}

function detectDevice(): string {
  const ua = navigator.userAgent;
  if (/tablet|ipad|playbook|silk/i.test(ua)) return "tablet";
  if (/mobile|android|iphone|ipod|blackberry|opera mini|iemobile/i.test(ua)) return "mobile";
  return "desktop";
}

function detectBrowser(): string {
  const ua = navigator.userAgent;
  if (/edg\//i.test(ua))    return "Edge";
  if (/opr\//i.test(ua))    return "Opera";
  if (/chrome/i.test(ua))   return "Chrome";
  if (/safari/i.test(ua))   return "Safari";
  if (/firefox/i.test(ua))  return "Firefox";
  return "Other";
}

function detectOS(): string {
  const ua = navigator.userAgent;
  if (/android/i.test(ua))         return "Android";
  if (/iphone|ipad|ipod/i.test(ua)) return "iOS";
  if (/windows/i.test(ua))         return "Windows";
  if (/mac os/i.test(ua))          return "macOS";
  if (/linux/i.test(ua))           return "Linux";
  return "Other";
}

function getPageLabel(pathname: string): string {
  const map: Record<string, string> = {
    "/":          "Home",
    "/notes":     "Notes",
    "/results":   "Results",
    "/about":     "About",
    "/contact":   "Contact",
    "/login":     "Login",
    "/dashboard": "Dashboard",
    "/admin":     "Admin",
    "/gallery":   "Gallery",
    "/library":   "Library",
    "/notices":   "Notices",
    "/news":      "News",
  };
  for (const [path, label] of Object.entries(map)) {
    if (path !== "/" && pathname.startsWith(path)) return label;
  }
  return map[pathname] || pathname;
}

export function usePageTracking() {
  const location = useLocation();
  const { user, profile } = useAuth();
  const rowIdRef = useRef<number | null>(null);
  const startRef = useRef<number>(Date.now());

  // ✅ FIXED: Only depends on pathname — NOT on profile or user
  // This prevents infinite re-render loops when profile fails to load
  useEffect(() => {
    // ✅ FIXED: Don't track until auth state is settled
    // If user exists but profile is still null, wait — don't fire yet
    if (user !== undefined && user !== null && profile === null) {
      return; // profile still loading, skip this render
    }

    const sessionId = getOrCreateSessionId();
    startRef.current = Date.now();

    const payload = {
      page:         getPageLabel(location.pathname),
      session_id:   sessionId,
      user_id:      user?.id ?? null,
      role:         profile?.role ?? "guest",
      device:       detectDevice(),
      browser:      detectBrowser(),
      os:           detectOS(),
      referrer:     document.referrer
                      ? new URL(document.referrer).hostname
                      : "direct",
      duration_sec: 0,
    };

    // ✅ FIXED: Wrapped in try/catch — analytics failure must NEVER crash the app
    (async () => {
      try {
        const { data } = await supabase
          .from("page_views")
          .insert(payload)
          .select("id")
          .single();
        if (data?.id) rowIdRef.current = data.id;
      } catch {
        // Silently ignore — analytics is non-critical
      }
    })();

    const handleUnload = () => {
      const duration = Math.round((Date.now() - startRef.current) / 1000);
      if (rowIdRef.current && duration > 0) {
        supabase
          .from("page_views")
          .update({ duration_sec: duration })
          .eq("id", rowIdRef.current)
          .then(() => {})
          .catch(() => {}); // ✅ Never throw on unload
      }
    };

    window.addEventListener("beforeunload", handleUnload);
    return () => {
      handleUnload();
      window.removeEventListener("beforeunload", handleUnload);
    };
  // ✅ FIXED: Removed profile?.role and user?.id from deps — stops the loop
  }, [location.pathname]);
}
