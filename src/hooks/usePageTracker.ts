// src/hooks/usePageTracker.ts
//
// Dual-layer page tracking:
//   1. Plausible Analytics  — proper pageview (geography, bounce rate, session depth)
//      Fires automatically when VITE_PLAUSIBLE_DOMAIN is set.
//   2. Supabase site_visits — school-specific metrics (logged-in user, device type,
//      session id) that Plausible's privacy model intentionally omits.
//
// SAFE: all errors are swallowed — tracking never breaks the page.

import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { usePlausible } from "./usePlausible";

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
  const location    = useLocation();
  const lastTracked = useRef<string>("");
  // usePlausible injects the <script> tag and returns trackEvent
  const { trackEvent } = usePlausible();

  useEffect(() => {
    const path = location.pathname;

    // Don't double-track the same path in the same render cycle
    if (lastTracked.current === path) return;
    lastTracked.current = path;

    // Skip admin panel — no need to track admin's own visits
    if (path.startsWith("/admin")) return;

    // ── Layer 1: Plausible pageview ──────────────────────────────────────
    // Plausible auto-tracks "pageview" on its own script load, but for SPA
    // route changes we fire a named event so it registers every navigation.
    trackEvent("pageview");

    // ── Layer 2: Supabase site_visits (school-specific) ──────────────────
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
  }, [location.pathname, trackEvent]);
}
  
