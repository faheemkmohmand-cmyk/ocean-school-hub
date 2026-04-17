// src/hooks/usePageTracker.ts
// Records a page visit to site_visits table.
// SAFE: all errors are swallowed — tracking never breaks the page.

import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabase";

/** Detect device type from user agent string */
function getDeviceType(): "mobile" | "tablet" | "desktop" {
  const ua = navigator.userAgent;
  if (/Mobi|Android|iPhone|iPod/i.test(ua)) return "mobile";
  if (/iPad|Tablet/i.test(ua)) return "tablet";
  return "desktop";
}

/** Get or create a session id stored in sessionStorage */
function getSessionId(): string {
  try {
    const key = "ghs_sid";
    let sid = sessionStorage.getItem(key);
    if (!sid) {
      sid = crypto.randomUUID();
      sessionStorage.setItem(key, sid);
    }
    return sid;
  } catch {
    return "unknown";
  }
}

export function usePageTracker() {
  const location = useLocation();
  const lastTracked = useRef<string>("");

  useEffect(() => {
    const path = location.pathname;

    // Don't double-track the same path in same render cycle
    if (lastTracked.current === path) return;
    lastTracked.current = path;

    // Skip admin panel — no need to track admin's own visits
    if (path.startsWith("/admin")) return;

    const track = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from("site_visits").insert({
          page:        path,
          referrer:    document.referrer || null,
          user_agent:  navigator.userAgent,
          device_type: getDeviceType(),
          session_id:  getSessionId(),
          user_id:     user?.id ?? null,
        });
      } catch {
        // Silently ignore — tracking must never break the site
      }
    };

    track();
  }, [location.pathname]);
}
