/**
 * WeatherWidget.tsx — Compact Weather Card for Dashboard Overview
 * ================================================================
 * Shows current weather for auto-detected location with a link
 * to the full /weather page. Designed to match the school hub UI.
 */

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Wind, Droplets, ArrowRight, MapPin, Thermometer } from "lucide-react";

// ─── API Config ───────────────────────────────────────────────────────────────
const API_KEY = "7b65a0e9302a64320622c0973e306e18";
const BASE_URL = "https://api.openweathermap.org/data/2.5";

// ─── Weather emoji map ────────────────────────────────────────────────────────
const weatherEmoji: Record<string, string> = {
  "01d": "☀️", "01n": "🌙",
  "02d": "⛅", "02n": "☁️",
  "03d": "☁️", "03n": "☁️",
  "04d": "☁️", "04n": "☁️",
  "09d": "🌧️", "09n": "🌧️",
  "10d": "🌦️", "10n": "🌧️",
  "11d": "⛈️", "11n": "⛈️",
  "13d": "❄️", "13n": "❄️",
  "50d": "🌫️", "50n": "🌫️",
};

// ─── Background gradient per condition ────────────────────────────────────────
const bgGradient = (id: number, isNight: boolean) => {
  if (id >= 200 && id < 300) return "linear-gradient(135deg,#1a1a2e,#2d3561)";
  if (id >= 300 && id < 600) return "linear-gradient(135deg,#1e3a5f,#2d6a8c)";
  if (id >= 600 && id < 700) return "linear-gradient(135deg,#c5dff8,#a3c4f0)";
  if (id >= 700 && id < 800) return "linear-gradient(135deg,#b0bec5,#90a4ae)";
  if (id === 800) return isNight
    ? "linear-gradient(135deg,#0a0a2e,#1a1a4e)"
    : "linear-gradient(135deg,#1a6dff,#00d4ff)";
  return "linear-gradient(135deg,#4a5568,#718096)";
};

interface WeatherData {
  name: string;
  sys: { country: string; sunrise: number; sunset: number };
  main: { temp: number; humidity: number };
  weather: Array<{ id: number; icon: string; description: string }>;
  wind: { speed: number };
  dt: number;
}

const WeatherWidget = () => {
  const [data, setData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWeather = async (lat: number, lon: number) => {
      try {
        const res = await fetch(`${BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&_=${Math.floor(Date.now()/60000)}`);
        if (res.ok) setData(await res.json());
      } catch { /* silent fail — widget is non-critical */ }
      finally { setLoading(false); }
    };

    const fetchByIP = async () => {
      try {
        const res = await fetch("https://ipapi.co/json/");
        const ipData = await res.json();
        if (ipData.latitude && ipData.longitude) return fetchWeather(ipData.latitude, ipData.longitude);
      } catch { /* silent */ }
      // Final fallback: Ghallanai, Pakistan
      fetchWeather(34.4907, 71.5275);
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          // If accuracy is wildly off (>200km), use IP instead
          if (pos.coords.accuracy > 200000) {
            fetchByIP();
          } else {
            fetchWeather(pos.coords.latitude, pos.coords.longitude);
          }
        },
        () => fetchByIP(),
        { timeout: 8000, maximumAge: 0, enableHighAccuracy: true }
      );
    } else {
      fetchByIP();
    }
  }, []);

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="rounded-2xl h-36 bg-muted/40 animate-pulse flex items-center justify-center">
        <span className="text-3xl">🌤️</span>
      </div>
    );
  }

  if (!data) return null;

  const temp = Math.round(data.main.temp); // API returns Celsius (units=metric)
  const icon = data.weather[0].icon;
  const id   = data.weather[0].id;
  const isNight = data.dt < data.sys.sunrise || data.dt > data.sys.sunset;
  const gradient = bgGradient(id, isNight);
  const emoji = weatherEmoji[icon] || "🌤️";
  const windKmh = Math.round(data.wind.speed * 3.6);
  const desc = data.weather[0].description.replace(/\b\w/g, c => c.toUpperCase());

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{ background: gradient, borderRadius: "20px", overflow: "hidden", position: "relative" }}
      className="shadow-lg"
    >
      {/* Decorative blur circle */}
      <div style={{
        position: "absolute", top: "-30px", right: "-30px",
        width: "120px", height: "120px",
        background: "rgba(255,255,255,0.08)",
        borderRadius: "50%", filter: "blur(20px)",
      }} />

      <div style={{ padding: "20px", position: "relative", zIndex: 1 }}>
        {/* Header row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
              <MapPin size={12} color="rgba(255,255,255,0.7)" />
              <span style={{ color: "rgba(255,255,255,0.8)", fontSize: "12px", fontWeight: 600 }}>
                {data.name}, {data.sys.country}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
              <span style={{ fontSize: "44px", fontWeight: 800, color: "white", lineHeight: 1, letterSpacing: "-2px", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {temp}°C
              </span>
            </div>
            <p style={{ color: "rgba(255,255,255,0.75)", fontSize: "13px", marginTop: "4px" }}>{desc}</p>
          </div>
          {/* Big weather emoji */}
          <div style={{ fontSize: "52px", lineHeight: 1, filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.3))", animation: "weatherFloat 3s ease-in-out infinite" }}>
            {emoji}
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: "flex", gap: "16px", marginTop: "14px", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: "14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <Droplets size={13} color="rgba(255,255,255,0.7)" />
              <span style={{ color: "rgba(255,255,255,0.8)", fontSize: "12px" }}>{data.main.humidity}%</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <Wind size={13} color="rgba(255,255,255,0.7)" />
              <span style={{ color: "rgba(255,255,255,0.8)", fontSize: "12px" }}>{windKmh} km/h</span>
            </div>
          </div>
          <Link to="/weather" style={{
            display: "flex", alignItems: "center", gap: "4px",
            color: "white", fontSize: "12px", fontWeight: 700,
            background: "rgba(255,255,255,0.18)",
            border: "1px solid rgba(255,255,255,0.25)",
            borderRadius: "50px", padding: "5px 12px",
            textDecoration: "none",
            transition: "all 0.3s",
          }}>
            Full Forecast <ArrowRight size={11} />
          </Link>
        </div>
      </div>

      {/* Float animation */}
      <style>{`@keyframes weatherFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }`}</style>
    </motion.div>
  );
};

export default WeatherWidget;
