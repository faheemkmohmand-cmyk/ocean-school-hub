// api/numbers.js
// Vercel Serverless Function — proxies numbersapi.com server-side.
// Browser calls /api/numbers?path=42/trivia → this fetches numbersapi.com/42/trivia
//
// ROOT CAUSES FIXED:
//   1. Removed Accept: "application/json" header → was causing 406 Not Acceptable.
//      numbersapi.com uses the ?json query param (already appended below), NOT the
//      Accept header, to switch response format. Sending that header makes it reject
//      the request entirely with 406.
//   2. Changed http:// → https:// for the upstream URL. Vercel serverless functions
//      on the Edge/Node runtime may block plain-HTTP outbound requests, and the site
//      already sets upgrade-insecure-requests in its CSP.
//   3. Increased timeout 8 s → 15 s to survive Vercel cold-start latency.
//   4. Hardened plain-text fallback: numbersapi sometimes returns text/plain even
//      with ?json (e.g. for unknown/edge-case numbers); we now always parse safely.

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const { path } = req.query;

  if (!path) {
    return res.status(400).json({ error: "Missing path parameter" });
  }

  // Allow digits, slashes, and lowercase letters only (prevents path injection)
  if (!/^[\d\/a-z]+$/.test(path)) {
    return res.status(400).json({ error: "Invalid path" });
  }

  // FIX #2: https:// not http:// — avoids Vercel blocking plain-HTTP outbound
  // FIX #1: ?json tells numbersapi to respond with JSON — do NOT also send
  //         Accept: application/json, that header causes a 406 from numbersapi.
  const url = `https://numbersapi.com/${path}?json`;

  try {
    const upstream = await fetch(url, {
      headers: {
        // FIX #1: Only User-Agent here — NO Accept header.
        // numbersapi uses the ?json query param, not the Accept header.
        // Sending Accept: application/json triggers a 406 Not Acceptable.
        "User-Agent": "GHS-BabiKhel-School/1.0",
      },
      // FIX #3: 15 s to cover Vercel cold starts (was 8 s)
      signal: AbortSignal.timeout(15000),
    });

    if (!upstream.ok) {
      return res
        .status(upstream.status)
        .json({ error: `Numbers API returned ${upstream.status}` });
    }

    const contentType = upstream.headers.get("content-type") || "";
    let body;

    if (contentType.includes("json")) {
      body = await upstream.json();
    } else {
      // FIX #4: numbersapi returns plain text for some edge-case numbers
      // even when ?json is present — wrap it into our standard shape.
      const text = await upstream.text();
      body = { text: text.trim(), found: true, type: "trivia", number: 0 };
    }

    return res.status(200).json(body);
  } catch (err) {
    console.error("Numbers API proxy error:", err);
    return res
      .status(500)
      .json({ error: "Failed to fetch from Numbers API", detail: err.message });
  }
}
