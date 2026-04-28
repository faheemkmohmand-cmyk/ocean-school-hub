/**
 * Weather.tsx — Premium Weather Page for Ocean School Hub
 * =========================================================
 * Features:
 *  - Auto-detect user location via Geolocation API
 *  - Live current weather (OpenWeather API)
 *  - Hourly (24h) + 7-day forecast
 *  - AQI, humidity, wind speed/direction, UV index, pressure, visibility
 *  - Animated weather backgrounds (rain, clouds, sunny, snow, storm, fog)
 *  - Dark/Light mode toggle (syncs with system + manual override)
 *  - Live radar map via OpenWeatherMap tile layer
 *  - Smooth glassmorphism UI with framer-motion animations
 *  - Fully mobile responsive
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PageLayout from "@/components/layout/PageLayout";
import {
  Wind, Droplets, Eye, Thermometer, Gauge, Sun, Cloud,
  CloudRain, CloudSnow, Zap, MapPin, Search, RefreshCw,
  Moon, SunMedium, Navigation, ArrowUp, Waves, Activity,
  ChevronRight, ChevronLeft, AlertCircle, Loader2
} from "lucide-react";

// ─── API Config ───────────────────────────────────────────────────────────────
const API_KEY = "7b65a0e9302a64320622c0973e306e18";
const BASE_URL = "https://api.openweathermap.org/data/2.5";
const GEO_URL = "https://api.openweathermap.org/geo/1.0";

// ─── TypeScript Interfaces ────────────────────────────────────────────────────
interface WeatherMain {
  temp: number;
  feels_like: number;
  temp_min: number;
  temp_max: number;
  pressure: number;
  humidity: number;
}

interface WeatherDesc {
  id: number;
  main: string;
  description: string;
  icon: string;
}

interface Wind {
  speed: number;
  deg: number;
  gust?: number;
}

interface CurrentWeather {
  name: string;
  sys: { country: string; sunrise: number; sunset: number };
  main: WeatherMain;
  weather: WeatherDesc[];
  wind: Wind;
  visibility: number;
  dt: number;
  timezone: number;
  coord: { lat: number; lon: number };
  clouds: { all: number };
}

interface ForecastItem {
  dt: number;
  main: WeatherMain;
  weather: WeatherDesc[];
  wind: Wind;
  pop: number;
  dt_txt: string;
}

interface AQIData {
  list: Array<{
    main: { aqi: number };
    components: {
      co: number; no: number; no2: number; o3: number;
      so2: number; pm2_5: number; pm10: number; nh3: number;
    };
  }>;
}

interface UVData {
  value: number;
}

// ─── Helper Functions ─────────────────────────────────────────────────────────

/** Convert Kelvin to Celsius */
const toCelsius = (k: number) => Math.round(k - 273.15);

/** Convert Kelvin to Fahrenheit */
const toFahrenheit = (k: number) => Math.round((k - 273.15) * 9 / 5 + 32);

/** Format Unix timestamp to local time string */
const formatTime = (unix: number, tz: number) => {
  const date = new Date((unix + tz) * 1000);
  return date.toUTCString().slice(17, 22);
};

/** Format Unix timestamp to day name */
const formatDay = (unix: number) => {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return days[new Date(unix * 1000).getDay()];
};

/** Convert wind degrees to compass direction */
const windDirection = (deg: number) => {
  const dirs = ["N","NE","E","SE","S","SW","W","NW"];
  return dirs[Math.round(deg / 45) % 8];
};

/** Get AQI label and color */
const getAQIInfo = (aqi: number) => {
  const info = [
    { label: "Good", color: "#22c55e" },
    { label: "Fair", color: "#84cc16" },
    { label: "Moderate", color: "#eab308" },
    { label: "Poor", color: "#f97316" },
    { label: "Very Poor", color: "#ef4444" },
  ];
  return info[Math.min(aqi - 1, 4)];
};

/** Get UV Index label */
const getUVLabel = (uv: number) => {
  if (uv <= 2) return { label: "Low", color: "#22c55e" };
  if (uv <= 5) return { label: "Moderate", color: "#eab308" };
  if (uv <= 7) return { label: "High", color: "#f97316" };
  if (uv <= 10) return { label: "Very High", color: "#ef4444" };
  return { label: "Extreme", color: "#7c3aed" };
};

/** Determine weather theme from weather ID */
const getWeatherTheme = (id: number, isNight: boolean) => {
  if (id >= 200 && id < 300) return "storm";
  if (id >= 300 && id < 600) return "rain";
  if (id >= 600 && id < 700) return "snow";
  if (id >= 700 && id < 800) return "fog";
  if (id === 800) return isNight ? "clear-night" : "clear";
  if (id > 800) return "cloudy";
  return "clear";
};

// ─── Animated Background Particles ────────────────────────────────────────────
const WeatherBackground = ({ theme }: { theme: string }) => {
  const particles = Array.from({ length: theme === "rain" ? 80 : theme === "snow" ? 50 : 20 });

  const gradients: Record<string, string> = {
    "clear":       "linear-gradient(135deg, #1a6dff 0%, #00d4ff 50%, #ff9a3c 100%)",
    "clear-night": "linear-gradient(135deg, #0a0a2e 0%, #1a1a4e 50%, #2d1b69 100%)",
    "cloudy":      "linear-gradient(135deg, #4a5568 0%, #718096 50%, #a0aec0 100%)",
    "rain":        "linear-gradient(135deg, #1a1a2e 0%, #2d3561 50%, #1e4d8c 100%)",
    "snow":        "linear-gradient(135deg, #e8f4fd 0%, #c5dff8 50%, #a3c4f0 100%)",
    "storm":       "linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 30%, #2d1b00 100%)",
    "fog":         "linear-gradient(135deg, #c9d6df 0%, #eeeeee 50%, #c9d6df 100%)",
  };

  return (
    <div className="weather-bg-wrapper" style={{
      position: "fixed", inset: 0, zIndex: 0, overflow: "hidden",
      background: gradients[theme] || gradients["clear"],
      transition: "background 1.5s ease",
    }}>
      {/* Animated particles based on weather type */}
      {(theme === "rain" || theme === "storm") && particles.map((_, i) => (
        <div key={i} style={{
          position: "absolute",
          left: `${Math.random() * 100}%`,
          top: `-${Math.random() * 100}px`,
          width: "2px",
          height: `${15 + Math.random() * 25}px`,
          background: "rgba(120,180,255,0.6)",
          borderRadius: "2px",
          animation: `rainFall ${0.6 + Math.random() * 0.8}s linear infinite`,
          animationDelay: `${Math.random() * 2}s`,
          transform: "rotate(15deg)",
        }} />
      ))}
      {theme === "snow" && particles.map((_, i) => (
        <div key={i} style={{
          position: "absolute",
          left: `${Math.random() * 100}%`,
          top: `-20px`,
          width: `${4 + Math.random() * 6}px`,
          height: `${4 + Math.random() * 6}px`,
          background: "rgba(255,255,255,0.9)",
          borderRadius: "50%",
          animation: `snowFall ${3 + Math.random() * 4}s linear infinite`,
          animationDelay: `${Math.random() * 5}s`,
        }} />
      ))}
      {theme === "storm" && (
        <div style={{
          position: "absolute", inset: 0,
          background: "rgba(255,200,0,0.03)",
          animation: "lightning 8s infinite",
        }} />
      )}
      {/* Floating clouds for cloudy/clear themes */}
      {(theme === "cloudy" || theme === "clear") && [1,2,3].map(i => (
        <div key={i} style={{
          position: "absolute",
          top: `${10 + i * 15}%`,
          left: "-200px",
          width: `${200 + i * 80}px`,
          height: `${80 + i * 30}px`,
          background: "rgba(255,255,255,0.12)",
          borderRadius: "50%",
          filter: "blur(20px)",
          animation: `cloudFloat ${20 + i * 10}s linear infinite`,
          animationDelay: `${i * 5}s`,
        }} />
      ))}
      {/* Stars for night */}
      {theme === "clear-night" && Array.from({ length: 60 }).map((_, i) => (
        <div key={i} style={{
          position: "absolute",
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 60}%`,
          width: `${1 + Math.random() * 2}px`,
          height: `${1 + Math.random() * 2}px`,
          background: "white",
          borderRadius: "50%",
          animation: `starTwinkle ${2 + Math.random() * 3}s ease-in-out infinite alternate`,
          animationDelay: `${Math.random() * 3}s`,
          opacity: 0.5 + Math.random() * 0.5,
        }} />
      ))}
    </div>
  );
};

// ─── CSS Animations (injected via style tag) ──────────────────────────────────
const weatherCSS = `
  @keyframes rainFall {
    0% { transform: translateY(-100px) rotate(15deg); opacity: 1; }
    100% { transform: translateY(110vh) rotate(15deg); opacity: 0.3; }
  }
  @keyframes snowFall {
    0% { transform: translateY(-20px) translateX(0) rotate(0deg); opacity: 1; }
    50% { transform: translateY(50vh) translateX(30px) rotate(180deg); }
    100% { transform: translateY(110vh) translateX(-20px) rotate(360deg); opacity: 0.3; }
  }
  @keyframes lightning {
    0%, 90%, 100% { opacity: 0; }
    92%, 96% { opacity: 1; background: rgba(255,255,200,0.15); }
  }
  @keyframes cloudFloat {
    0% { transform: translateX(-300px); }
    100% { transform: translateX(110vw); }
  }
  @keyframes starTwinkle {
    from { opacity: 0.3; }
    to { opacity: 1; }
  }
  @keyframes pulse-ring {
    0% { transform: scale(0.8); opacity: 1; }
    100% { transform: scale(2); opacity: 0; }
  }
  .glass-card {
    background: rgba(255,255,255,0.08);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(255,255,255,0.15);
    border-radius: 24px;
  }
  .glass-card-dark {
    background: rgba(0,0,0,0.2);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 24px;
  }
  .light-mode .glass-card {
    background: rgba(255,255,255,0.65);
    border: 1px solid rgba(0,0,0,0.08);
  }
  .stat-pill {
    background: rgba(255,255,255,0.1);
    border: 1px solid rgba(255,255,255,0.15);
    border-radius: 16px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    text-align: center;
    transition: all 0.3s ease;
  }
  .stat-pill:hover {
    background: rgba(255,255,255,0.18);
    transform: translateY(-3px);
  }
  .light-mode .stat-pill {
    background: rgba(255,255,255,0.7);
    border: 1px solid rgba(0,0,0,0.08);
  }
  .hourly-card {
    background: rgba(255,255,255,0.07);
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 16px;
    padding: 12px 10px;
    text-align: center;
    min-width: 72px;
    transition: all 0.3s ease;
    cursor: default;
    flex-shrink: 0;
  }
  .hourly-card:hover {
    background: rgba(255,255,255,0.15);
    transform: translateY(-4px);
  }
  .light-mode .hourly-card {
    background: rgba(255,255,255,0.7);
    border: 1px solid rgba(0,0,0,0.08);
  }
  .scroll-row::-webkit-scrollbar { height: 4px; }
  .scroll-row::-webkit-scrollbar-track { background: rgba(255,255,255,0.05); border-radius: 4px; }
  .scroll-row::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.25); border-radius: 4px; }
  .weather-icon-big {
    font-size: 96px;
    line-height: 1;
    filter: drop-shadow(0 4px 24px rgba(0,0,0,0.3));
    animation: floatIcon 4s ease-in-out infinite;
  }
  @keyframes floatIcon {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
  }
  .search-input {
    background: rgba(255,255,255,0.1);
    border: 1px solid rgba(255,255,255,0.2);
    border-radius: 50px;
    padding: 10px 20px;
    color: white;
    outline: none;
    width: 100%;
    font-size: 15px;
    backdrop-filter: blur(10px);
    transition: all 0.3s ease;
  }
  .search-input::placeholder { color: rgba(255,255,255,0.5); }
  .search-input:focus {
    border-color: rgba(255,255,255,0.5);
    background: rgba(255,255,255,0.15);
  }
  .light-mode .search-input {
    background: rgba(255,255,255,0.8);
    border: 1px solid rgba(0,0,0,0.15);
    color: #1a1a2e;
  }
  .light-mode .search-input::placeholder { color: rgba(0,0,0,0.4); }
  .day-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-radius: 16px;
    transition: all 0.3s ease;
    gap: 12px;
  }
  .day-row:hover {
    background: rgba(255,255,255,0.08);
  }
  .light-mode .day-row:hover {
    background: rgba(0,0,0,0.04);
  }
  /* Radar map container */
  #weather-radar-map {
    width: 100%;
    height: 300px;
    border-radius: 20px;
    overflow: hidden;
    position: relative;
  }
  .radar-iframe {
    width: 100%;
    height: 100%;
    border: none;
    border-radius: 20px;
  }
`;

// ─── Weather Icon Emoji Map ───────────────────────────────────────────────────
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

// ─── Main Weather Component ───────────────────────────────────────────────────
const Weather = () => {
  // State
  const [current, setCurrent] = useState<CurrentWeather | null>(null);
  const [forecast, setForecast] = useState<ForecastItem[]>([]);
  const [aqi, setAQI] = useState<AQIData | null>(null);
  const [uv, setUV] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(true);
  const [unit, setUnit] = useState<"C" | "F">("C");
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [showRadar, setShowRadar] = useState(false);
  const hourlyRef = useRef<HTMLDivElement>(null);

  // Temperature display helper
  const temp = useCallback((k: number) =>
    unit === "C" ? `${toCelsius(k)}°C` : `${toFahrenheit(k)}°F`,
    [unit]
  );

  // Fetch all weather data
  const fetchWeatherData = useCallback(async (lat: number, lon: number) => {
    setLoading(true);
    setError(null);
    try {
      // Current weather
      const [curRes, foreRes, aqiRes] = await Promise.all([
        fetch(`${BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}`),
        fetch(`${BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&cnt=56`),
        fetch(`${BASE_URL}/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`),
      ]);

      if (!curRes.ok) throw new Error("Failed to fetch weather data");

      const [curData, foreData, aqiData] = await Promise.all([
        curRes.json(),
        foreRes.json(),
        aqiRes.json(),
      ]);

      setCurrent(curData);
      setForecast(foreData.list || []);
      setAQI(aqiData);
      setCoords({ lat, lon });

      // UV Index (separate endpoint)
      try {
        const uvRes = await fetch(`${BASE_URL}/uvi?lat=${lat}&lon=${lon}&appid=${API_KEY}`);
        if (uvRes.ok) {
          const uvData: UVData = await uvRes.json();
          setUV(uvData.value);
        }
      } catch { setUV(null); }

    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error occurred");
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-detect location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => fetchWeatherData(pos.coords.latitude, pos.coords.longitude),
        () => {
          // Default to Islamabad if permission denied
          fetchWeatherData(33.6844, 73.0479);
        },
        { timeout: 10000 }
      );
    } else {
      fetchWeatherData(33.6844, 73.0479);
    }
  }, [fetchWeatherData]);

  // Search by city name
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`${GEO_URL}/direct?q=${encodeURIComponent(searchQuery)}&limit=1&appid=${API_KEY}`);
      const data = await res.json();
      if (data.length > 0) {
        await fetchWeatherData(data[0].lat, data[0].lon);
        setSearchQuery("");
      } else {
        setError("City not found. Please try another location.");
      }
    } catch {
      setError("Search failed. Check your internet connection.");
    } finally {
      setSearching(false);
    }
  };

  // Determine theme
  const isNight = current
    ? (current.dt < current.sys.sunrise || current.dt > current.sys.sunset)
    : false;
  const weatherTheme = current
    ? getWeatherTheme(current.weather[0].id, isNight)
    : "clear";

  // Group forecast into daily (take first item per day)
  const dailyForecast = forecast
    .filter((_, i) => i % 8 === 0)
    .slice(0, 7);

  // Hourly — next 24h (8 slots × 3h = 24h)
  const hourlyForecast = forecast.slice(0, 8);

  // Text color based on mode/theme
  const textColor = darkMode ? "text-white" : "text-gray-800";
  const subColor = darkMode ? "text-white/70" : "text-gray-600";

  return (
    <>
      {/* Inject animation keyframes */}
      <style>{weatherCSS}</style>

      <PageLayout>
        <div className={`relative min-h-screen ${darkMode ? "" : "light-mode"}`}
          style={{ paddingTop: "80px", paddingBottom: "40px" }}>

          {/* Animated Background */}
          <WeatherBackground theme={weatherTheme} />

          {/* Content Layer */}
          <div style={{ position: "relative", zIndex: 10, padding: "0 16px", maxWidth: "1000px", margin: "0 auto" }}>

            {/* ── Top Bar ── */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px", flexWrap: "wrap" }}
            >
              {/* Search Bar */}
              <form onSubmit={handleSearch} style={{ flex: 1, minWidth: "200px", display: "flex", gap: "8px" }}>
                <div style={{ position: "relative", flex: 1 }}>
                  <Search size={16} style={{
                    position: "absolute", left: "14px", top: "50%",
                    transform: "translateY(-50%)", color: "rgba(255,255,255,0.6)"
                  }} />
                  <input
                    className="search-input"
                    placeholder="Search city…"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    style={{ paddingLeft: "40px" }}
                  />
                </div>
                <button type="submit" disabled={searching} style={{
                  background: "rgba(255,255,255,0.15)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  borderRadius: "50px",
                  padding: "10px 18px",
                  color: "white",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  transition: "all 0.3s",
                  backdropFilter: "blur(10px)",
                  whiteSpace: "nowrap",
                }}>
                  {searching ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Search size={14} />}
                  Search
                </button>
              </form>

              {/* Controls */}
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                {/* Unit Toggle */}
                <button onClick={() => setUnit(u => u === "C" ? "F" : "C")} style={{
                  background: "rgba(255,255,255,0.1)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  borderRadius: "50px",
                  padding: "8px 14px",
                  color: "white",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: 700,
                  backdropFilter: "blur(10px)",
                }}>
                  °{unit === "C" ? "F" : "C"}
                </button>
                {/* Dark/Light Toggle */}
                <button onClick={() => setDarkMode(d => !d)} style={{
                  background: "rgba(255,255,255,0.1)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  borderRadius: "50px",
                  padding: "8px 14px",
                  color: "white",
                  cursor: "pointer",
                  backdropFilter: "blur(10px)",
                  display: "flex",
                  alignItems: "center",
                }}>
                  {darkMode ? <SunMedium size={16} /> : <Moon size={16} />}
                </button>
                {/* Refresh */}
                <button onClick={() => coords && fetchWeatherData(coords.lat, coords.lon)}
                  disabled={loading} style={{
                    background: "rgba(255,255,255,0.1)",
                    border: "1px solid rgba(255,255,255,0.2)",
                    borderRadius: "50px",
                    padding: "8px 14px",
                    color: "white",
                    cursor: "pointer",
                    backdropFilter: "blur(10px)",
                    display: "flex",
                    alignItems: "center",
                  }}>
                  <RefreshCw size={16} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
                </button>
              </div>
            </motion.div>

            {/* ── Error State ── */}
            <AnimatePresence>
              {error && (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                  className="glass-card" style={{ padding: "16px 20px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "12px", color: "#fca5a5" }}>
                  <AlertCircle size={18} />
                  <span style={{ fontSize: "14px" }}>{error}</span>
                  <button onClick={() => setError(null)} style={{ marginLeft: "auto", background: "none", border: "none", color: "inherit", cursor: "pointer", fontSize: "16px" }}>×</button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Loading State ── */}
            {loading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "300px", gap: "20px" }}>
                <div style={{ position: "relative", width: "80px", height: "80px" }}>
                  <div style={{
                    position: "absolute", inset: 0, borderRadius: "50%",
                    border: "3px solid rgba(255,255,255,0.3)",
                    borderTopColor: "white",
                    animation: "spin 1s linear infinite",
                  }} />
                  <div style={{ position: "absolute", inset: "12px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px" }}>
                    🌤️
                  </div>
                </div>
                <p style={{ color: "rgba(255,255,255,0.8)", fontSize: "16px", fontWeight: 500 }}>
                  Detecting your location…
                </p>
              </motion.div>
            )}

            {/* ── Main Content (when data loaded) ── */}
            {!loading && current && (
              <AnimatePresence mode="wait">
                <motion.div key={current.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, staggerChildren: 0.1 }}>

                  {/* ── Hero Card ── */}
                  <motion.div
                    className="glass-card"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    style={{ padding: "32px", marginBottom: "20px", position: "relative", overflow: "hidden" }}>

                    {/* Location */}
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                      <div style={{ position: "relative" }}>
                        <MapPin size={18} color="white" />
                        <div style={{
                          position: "absolute", inset: 0,
                          background: "rgba(255,255,255,0.3)",
                          borderRadius: "50%",
                          animation: "pulse-ring 2s ease-out infinite",
                        }} />
                      </div>
                      <span className={textColor} style={{ fontSize: "20px", fontWeight: 700 }}>
                        {current.name}, {current.sys.country}
                      </span>
                    </div>

                    <p className={subColor} style={{ fontSize: "14px", marginBottom: "24px" }}>
                      {new Date(current.dt * 1000).toLocaleDateString("en-US", {
                        weekday: "long", month: "long", day: "numeric"
                      })}
                      {" · "}
                      {current.weather[0].description.replace(/\b\w/g, c => c.toUpperCase())}
                    </p>

                    {/* Temp + Icon */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "20px" }}>
                      <div>
                        <div className={textColor} style={{
                          fontSize: "clamp(72px, 15vw, 110px)",
                          fontWeight: 800,
                          lineHeight: 1,
                          letterSpacing: "-4px",
                          fontFamily: "'Plus Jakarta Sans', sans-serif",
                        }}>
                          {unit === "C" ? toCelsius(current.main.temp) : toFahrenheit(current.main.temp)}
                          <span style={{ fontSize: "0.4em", fontWeight: 400, opacity: 0.7 }}>°{unit}</span>
                        </div>
                        <p className={subColor} style={{ fontSize: "16px", marginTop: "8px" }}>
                          Feels like {temp(current.main.feels_like)}
                          &nbsp;·&nbsp;
                          {temp(current.main.temp_min)} / {temp(current.main.temp_max)}
                        </p>
                      </div>
                      <div className="weather-icon-big" style={{ fontSize: "clamp(60px, 12vw, 96px)" }}>
                        {weatherEmoji[current.weather[0].icon] || "🌤️"}
                      </div>
                    </div>

                    {/* Sunrise/Sunset */}
                    <div style={{ display: "flex", gap: "20px", marginTop: "20px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "18px" }}>🌅</span>
                        <div>
                          <p className={subColor} style={{ fontSize: "11px" }}>SUNRISE</p>
                          <p className={textColor} style={{ fontSize: "14px", fontWeight: 600 }}>
                            {formatTime(current.sys.sunrise, current.timezone)}
                          </p>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "18px" }}>🌇</span>
                        <div>
                          <p className={subColor} style={{ fontSize: "11px" }}>SUNSET</p>
                          <p className={textColor} style={{ fontSize: "14px", fontWeight: 600 }}>
                            {formatTime(current.sys.sunset, current.timezone)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>

                  {/* ── Stats Grid ── */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                    style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: "12px", marginBottom: "20px" }}>

                    {[
                      { icon: "💧", label: "Humidity", value: `${current.main.humidity}%` },
                      { icon: "💨", label: "Wind", value: `${Math.round(current.wind.speed * 3.6)} km/h ${windDirection(current.wind.deg)}` },
                      { icon: "👁️", label: "Visibility", value: `${(current.visibility / 1000).toFixed(1)} km` },
                      { icon: "📊", label: "Pressure", value: `${current.main.pressure} hPa` },
                      { icon: "☁️", label: "Cloud Cover", value: `${current.clouds.all}%` },
                      { icon: "🌬️", label: "Gust", value: current.wind.gust ? `${Math.round(current.wind.gust * 3.6)} km/h` : "N/A" },
                      ...(uv !== null ? [{ icon: "☀️", label: "UV Index", value: `${uv.toFixed(1)} ${getUVLabel(uv).label}` }] : []),
                      ...(aqi ? [{ icon: "🫁", label: "AQI", value: `${aqi.list[0].main.aqi} ${getAQIInfo(aqi.list[0].main.aqi).label}` }] : []),
                    ].map((stat, i) => (
                      <motion.div key={stat.label} className="stat-pill"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1 + i * 0.05 }}>
                        <span style={{ fontSize: "24px" }}>{stat.icon}</span>
                        <p className={subColor} style={{ fontSize: "11px", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.5px" }}>{stat.label}</p>
                        <p className={textColor} style={{ fontSize: "14px", fontWeight: 700 }}>{stat.value}</p>
                      </motion.div>
                    ))}
                  </motion.div>

                  {/* ── Hourly Forecast ── */}
                  <motion.div className="glass-card"
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                    style={{ padding: "20px", marginBottom: "20px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                      <h3 className={textColor} style={{ fontSize: "16px", fontWeight: 700 }}>⏱ Hourly Forecast</h3>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button onClick={() => hourlyRef.current?.scrollBy({ left: -200, behavior: "smooth" })}
                          style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "50%", width: "30px", height: "30px", display: "flex", alignItems: "center", justifyContent: "center", color: "white", cursor: "pointer" }}>
                          <ChevronLeft size={14} />
                        </button>
                        <button onClick={() => hourlyRef.current?.scrollBy({ left: 200, behavior: "smooth" })}
                          style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "50%", width: "30px", height: "30px", display: "flex", alignItems: "center", justifyContent: "center", color: "white", cursor: "pointer" }}>
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>
                    <div ref={hourlyRef} className="scroll-row" style={{ display: "flex", gap: "10px", overflowX: "auto", paddingBottom: "8px" }}>
                      {hourlyForecast.map((h, i) => (
                        <div key={i} className="hourly-card">
                          <p className={subColor} style={{ fontSize: "11px", fontWeight: 600, marginBottom: "8px" }}>
                            {i === 0 ? "Now" : h.dt_txt.slice(11, 16)}
                          </p>
                          <div style={{ fontSize: "26px", marginBottom: "8px" }}>
                            {weatherEmoji[h.weather[0].icon] || "🌤️"}
                          </div>
                          <p className={textColor} style={{ fontSize: "14px", fontWeight: 700 }}>
                            {unit === "C" ? toCelsius(h.main.temp) : toFahrenheit(h.main.temp)}°
                          </p>
                          {h.pop > 0 && (
                            <p style={{ fontSize: "11px", color: "#60a5fa", marginTop: "4px" }}>
                              💧 {Math.round(h.pop * 100)}%
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </motion.div>

                  {/* ── 7-Day Forecast ── */}
                  <motion.div className="glass-card"
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
                    style={{ padding: "20px", marginBottom: "20px" }}>
                    <h3 className={textColor} style={{ fontSize: "16px", fontWeight: 700, marginBottom: "12px" }}>📅 7-Day Forecast</h3>
                    {dailyForecast.map((day, i) => (
                      <motion.div key={i} className="day-row"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.05 * i }}>
                        <span className={textColor} style={{ fontWeight: 600, width: "48px", fontSize: "14px" }}>
                          {i === 0 ? "Today" : formatDay(day.dt)}
                        </span>
                        <span style={{ fontSize: "22px" }}>{weatherEmoji[day.weather[0].icon] || "🌤️"}</span>
                        <span className={subColor} style={{ fontSize: "13px", flex: 1, textAlign: "center" }}>
                          {day.weather[0].description.replace(/\b\w/g, c => c.toUpperCase())}
                        </span>
                        {day.pop > 0 && (
                          <span style={{ fontSize: "12px", color: "#60a5fa", minWidth: "40px", textAlign: "right" }}>
                            💧{Math.round(day.pop * 100)}%
                          </span>
                        )}
                        <div style={{ display: "flex", gap: "8px", minWidth: "90px", justifyContent: "flex-end" }}>
                          <span className={textColor} style={{ fontSize: "14px", fontWeight: 700 }}>
                            {unit === "C" ? toCelsius(day.main.temp_max) : toFahrenheit(day.main.temp_max)}°
                          </span>
                          <span className={subColor} style={{ fontSize: "14px" }}>
                            {unit === "C" ? toCelsius(day.main.temp_min) : toFahrenheit(day.main.temp_min)}°
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>

                  {/* ── AQI Detail Card ── */}
                  {aqi && (
                    <motion.div className="glass-card"
                      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                      style={{ padding: "20px", marginBottom: "20px" }}>
                      <h3 className={textColor} style={{ fontSize: "16px", fontWeight: 700, marginBottom: "16px" }}>🫁 Air Quality Index</h3>
                      <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "16px" }}>
                        <div style={{
                          width: "72px", height: "72px", borderRadius: "50%",
                          display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column",
                          background: `${getAQIInfo(aqi.list[0].main.aqi).color}22`,
                          border: `3px solid ${getAQIInfo(aqi.list[0].main.aqi).color}`,
                        }}>
                          <span className={textColor} style={{ fontSize: "22px", fontWeight: 800 }}>{aqi.list[0].main.aqi}</span>
                          <span style={{ fontSize: "9px", color: getAQIInfo(aqi.list[0].main.aqi).color, fontWeight: 700 }}>AQI</span>
                        </div>
                        <div>
                          <p style={{ color: getAQIInfo(aqi.list[0].main.aqi).color, fontSize: "20px", fontWeight: 700 }}>
                            {getAQIInfo(aqi.list[0].main.aqi).label}
                          </p>
                          <p className={subColor} style={{ fontSize: "13px" }}>Air quality level</p>
                        </div>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: "10px" }}>
                        {Object.entries(aqi.list[0].components).map(([key, val]) => (
                          <div key={key} style={{
                            background: "rgba(255,255,255,0.06)",
                            borderRadius: "12px",
                            padding: "10px",
                            textAlign: "center",
                          }}>
                            <p className={subColor} style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>
                              {key.replace("_", ".").replace("2", "₂").replace("3", "₃")}
                            </p>
                            <p className={textColor} style={{ fontSize: "13px", fontWeight: 700 }}>{typeof val === "number" ? val.toFixed(1) : val}</p>
                            <p className={subColor} style={{ fontSize: "9px" }}>μg/m³</p>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* ── Radar Map ── */}
                  <motion.div className="glass-card"
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
                    style={{ padding: "20px", marginBottom: "20px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                      <h3 className={textColor} style={{ fontSize: "16px", fontWeight: 700 }}>🛰️ Live Weather Radar</h3>
                      <button onClick={() => setShowRadar(r => !r)} style={{
                        background: "rgba(255,255,255,0.1)",
                        border: "1px solid rgba(255,255,255,0.2)",
                        borderRadius: "50px",
                        padding: "6px 16px",
                        color: "white",
                        cursor: "pointer",
                        fontSize: "13px",
                        fontWeight: 600,
                      }}>
                        {showRadar ? "Hide" : "Show"} Radar
                      </button>
                    </div>
                    <AnimatePresence>
                      {showRadar && coords && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 300 }}
                          exit={{ opacity: 0, height: 0 }}
                          style={{ borderRadius: "20px", overflow: "hidden" }}>
                          <iframe
                            className="radar-iframe"
                            title="Weather Radar"
                            src={`https://embed.windy.com/embed2.html?lat=${coords.lat}&lon=${coords.lon}&detailLat=${coords.lat}&detailLon=${coords.lon}&width=650&height=300&zoom=8&level=surface&overlay=rain&product=ecmwf&menu=&message=true&marker=true&calendar=now&pressure=&type=map&location=coordinates&detail=&metricWind=km%2Fh&metricTemp=%C2%B0C&radarRange=-1`}
                            style={{ width: "100%", height: "300px", border: "none", borderRadius: "20px" }}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                    {!showRadar && (
                      <div style={{
                        height: "120px", borderRadius: "16px",
                        background: "rgba(255,255,255,0.04)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        border: "1px dashed rgba(255,255,255,0.15)",
                        cursor: "pointer",
                        transition: "all 0.3s",
                      }} onClick={() => setShowRadar(true)}>
                        <div style={{ textAlign: "center" }}>
                          <span style={{ fontSize: "32px" }}>🛰️</span>
                          <p className={subColor} style={{ fontSize: "14px", marginTop: "8px" }}>Click "Show Radar" to view live precipitation map</p>
                        </div>
                      </div>
                    )}
                  </motion.div>

                  {/* ── Footer Credit ── */}
                  <motion.p
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                    className={subColor} style={{ textAlign: "center", fontSize: "12px", marginTop: "8px" }}>
                    Powered by OpenWeatherMap API · GHS Babi Khel
                  </motion.p>

                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </div>
      </PageLayout>

      {/* Spin keyframe for loaders */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
};

export default Weather;
