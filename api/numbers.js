// api/numbers.js
// Vercel Serverless Function — Vercel auto-routes this as /api/numbers (no rewrite needed).
// Browser → /api/numbers?path=42/trivia → this function → numbersapi.com/42/trivia

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

  // Allow digits, slashes, lowercase letters only
  if (!/^[\d\/a-z]+$/.test(path)) {
    return res.status(400).json({ error: "Invalid path" });
  }

  // FIX A: https:// not http:// — Vercel blocks plain-HTTP outbound requests
  const url = `https://numbersapi.com/${path}?json`;

  try {
    const upstream = await fetch(url, {
      headers: {
        // FIX B: NO Accept header — numbersapi uses Express res.format() with only
        // text/plain registered. Sending Accept: application/json returns 406.
        // The ?json query param (above) is the correct way to request JSON.
        "User-Agent": "GHS-BabiKhel-School/1.0",
      },
      // FIX C: 15s covers Vercel cold-start latency (was 8s)
      signal: AbortSignal.timeout(15000),
    });

    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: `Numbers API returned ${upstream.status}` });
    }

    const contentType = upstream.headers.get("content-type") || "";

    if (contentType.includes("json")) {
      const body = await upstream.json();
      return res.status(200).json(body);
    } else {
      // numbersapi falls back to plain text for some edge-case inputs
      const text = await upstream.text();
      return res.status(200).json({ text: text.trim(), found: true, type: "trivia", number: 0 });
    }
  } catch (err) {
    console.error("Numbers API proxy error:", err);
    return res.status(500).json({ error: "Failed to fetch from Numbers API", detail: err.message });
  }
}
