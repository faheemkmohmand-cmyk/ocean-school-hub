// src/hooks/usePageTracking.ts
// Tracks every page visit and sends to Supabase page_views table
import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./useAuth";

// ── Helpers ──────────────────────────────────────────────────────────────────
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
  if (/msie|trident/i.test(ua)) return "IE";
  return "Other";
}

function detectOS(): string {
  const ua = navigator.userAgent;
  if (/android/i.test(ua))  return "Android";
  if (/iphone|ipad|ipod/i.test(ua)) return "iOS";
  if (/windows/i.test(ua))  return "Windows";
  if (/mac os/i.test(ua))   return "macOS";
  if (/linux/i.test(ua))    return "Linux";
  return "Other";
}

function getPageLabel(pathname: string): string {
  const map: Record<string, string> = {
    "/":           "Home",
    "/notes":      "Notes",
    "/results":    "Results",
    "/about":      "About",
    "/contact":    "Contact",
    "/login":      "Login",
    "/dashboard":  "Dashboard",
    "/admin":      "Admin",
    "/gallery":    "Gallery",
    "/library":    "Library",
    "/notices":    "Notices",
    "/news":       "News",
  };
  // Match prefix
  for (const [path, label] of Object.entries(map)) {
    if (path !== "/" && pathname.startsWith(path)) return label;
  }
  return map[pathname] || pathname;
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function usePageTracking() {
  const location  = useLocation();
  const { user, profile } = useAuth();
  const rowIdRef  = useRef<number | null>(null);
  const startRef  = useRef<number>(Date.now());

  useEffect(() => {
    const sessionId = getOrCreateSessionId();
    startRef.current = Date.now();

    const payload = {
      page:       getPageLabel(location.pathname),
      session_id: sessionId,
      user_id:    user?.id ?? null,
      role:       profile?.role ?? "guest",
      device:     detectDevice(),
      browser:    detectBrowser(),
      os:         detectOS(),
      referrer:   document.referrer ? new URL(document.referrer).hostname : "direct",
      duration_sec: 0,
    };

    // Fire and forget — don't block render
    supabase.from("page_views").insert(payload).select("id").single()
      .then(({ data }) => {
        if (data?.id) rowIdRef.current = data.id;
      });

    // On leave: update duration
    const handleUnload = () => {
      const duration = Math.round((Date.now() - startRef.current) / 1000);
      if (rowIdRef.current && duration > 0) {
        // Use sendBeacon for reliable unload tracking
        const body = JSON.stringify({ duration_sec: duration });
        navigator.sendBeacon?.(
          `/api/ping`, // fallback — supabase direct update
          body
        );
        // Also try supabase directly (works if page unload is slow)
        supabase.from("page_views")
          .update({ duration_sec: duration })
          .eq("id", rowIdRef.current)
          .then(() => {});
      }
    };

    window.addEventListener("beforeunload", handleUnload);
    return () => {
      handleUnload();
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, [location.pathname, user?.id, profile?.role]);
}
