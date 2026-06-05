// src/pages/dashboard/tabs/ISSTracker.tsx
import { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface ISSPosition {
  latitude: number;
  longitude: number;
  timestamp: number;
}

interface AstronautData {
  number: number;
  people: { name: string; craft: string }[];
}

// Pulsing ISS icon
const issIcon = L.divIcon({
  html: `
    <div style="position:relative;width:48px;height:48px;">
      <div style="
        position:absolute;inset:0;border-radius:50%;
        background:rgba(239,68,68,0.25);
        animation:iss-ping 1.5s cubic-bezier(0,0,0.2,1) infinite;
      "></div>
      <div style="
        position:absolute;inset:6px;border-radius:50%;
        background:rgba(239,68,68,0.4);
        animation:iss-ping 1.5s cubic-bezier(0,0,0.2,1) infinite 0.3s;
      "></div>
      <div style="
        position:absolute;inset:0;display:flex;align-items:center;
        justify-content:center;font-size:26px;filter:drop-shadow(0 2px 6px rgba(0,0,0,0.5));
      ">🛸</div>
    </div>
    <style>
      @keyframes iss-ping {
        0%{transform:scale(0.8);opacity:0.8}
        70%{transform:scale(1.6);opacity:0}
        100%{transform:scale(1.6);opacity:0}
      }
    </style>
  `,
  className: "",
  iconSize: [48, 48],
  iconAnchor: [24, 24],
  popupAnchor: [0, -28],
});

// Auto-pan map to ISS when it moves
function ISSMapController({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      map.setView([lat, lng], 3);
      firstRun.current = false;
    } else {
      map.panTo([lat, lng], { animate: true, duration: 1.2 });
    }
  }, [lat, lng, map]);
  return null;
}

export default function ISSTracker() {
  const [position, setPosition] = useState<ISSPosition | null>(null);
  const [astronauts, setAstronauts] = useState<AstronautData | null>(null);
  const [trail, setTrail] = useState<[number, number][]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [showAstronauts, setShowAstronauts] = useState(false);
  const trailRef = useRef<[number, number][]>([]);

  // Fetch ISS position
  const fetchISS = async () => {
    try {
      const res = await fetch("https://api.wheretheiss.at/v1/satellites/25544");
      if (!res.ok) throw new Error("ISS API unavailable");
      const data = await res.json();
      const newPos: ISSPosition = {
        latitude: data.latitude,
        longitude: data.longitude,
        timestamp: data.timestamp,
      };
      setPosition(newPos);
      setLastUpdated(new Date());
      setError(null);
      // Keep last 20 trail points
      trailRef.current = [[newPos.latitude, newPos.longitude], ...trailRef.current.slice(0, 19)];
      setTrail([...trailRef.current]);
    } catch {
      // fallback to Open Notify
      try {
        const res2 = await fetch("https://api.open-notify.org/iss-now.json");
        const data2 = await res2.json();
        const newPos: ISSPosition = {
          latitude: parseFloat(data2.iss_position.latitude),
          longitude: parseFloat(data2.iss_position.longitude),
          timestamp: data2.timestamp,
        };
        setPosition(newPos);
        setLastUpdated(new Date());
        setError(null);
        trailRef.current = [[newPos.latitude, newPos.longitude], ...trailRef.current.slice(0, 19)];
        setTrail([...trailRef.current]);
      } catch {
        setError("Could not reach ISS tracking API. Check your connection.");
      }
    }
  };

  // Fetch astronauts
  const fetchAstronauts = async () => {
    try {
      const res = await fetch("https://api.open-notify.org/astros.json");
      const data = await res.json();
      setAstronauts(data);
    } catch {
      // silently fail
    }
  };

  useEffect(() => {
    fetchISS();
    fetchAstronauts();
    const interval = setInterval(fetchISS, 5000);
    return () => clearInterval(interval);
  }, []);

  const issAstronauts = astronauts?.people.filter((p) => p.craft === "ISS") ?? [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-lg font-heading font-bold text-foreground flex items-center gap-2">
            🛸 ISS Live Tracker
          </h3>
          <p className="text-xs text-muted-foreground">
            International Space Station • updates every 5 seconds
          </p>
        </div>
        {lastUpdated && (
          <span className="flex items-center gap-1.5 text-[11px] font-medium bg-red-500/10 text-red-500 px-3 py-1.5 rounded-full border border-red-500/20">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse inline-block" />
            LIVE · {lastUpdated.toLocaleTimeString()}
          </span>
        )}
      </div>

      {/* Stats row */}
      {position && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="bg-card border border-border rounded-xl p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">Latitude</p>
            <p className="text-lg font-black text-foreground font-mono">{position.latitude.toFixed(4)}°</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">Longitude</p>
            <p className="text-lg font-black text-foreground font-mono">{position.longitude.toFixed(4)}°</p>
          </div>
          <div
            className="bg-card border border-border rounded-xl p-3 text-center col-span-2 sm:col-span-1 cursor-pointer hover:bg-secondary transition-colors"
            onClick={() => setShowAstronauts(!showAstronauts)}
          >
            <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">Humans in Space</p>
            <p className="text-lg font-black text-blue-500">{astronauts?.number ?? "…"} 👨‍🚀</p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-center">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Astronauts expandable */}
      {showAstronauts && astronauts && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5">
            <p className="text-white font-bold text-sm">
              🌍 There are {astronauts.number} humans orbiting Earth at this moment
            </p>
          </div>
          <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {astronauts.people.map((p, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className="text-base">{p.craft === "ISS" ? "🛸" : "🚀"}</span>
                <div>
                  <p className="font-semibold text-foreground text-xs">{p.name}</p>
                  <p className="text-[10px] text-muted-foreground">{p.craft}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Map */}
      <div className="rounded-2xl overflow-hidden border border-border shadow-sm" style={{ height: 380 }}>
        {position ? (
          <MapContainer
            center={[position.latitude, position.longitude]}
            zoom={3}
            style={{ height: "100%", width: "100%" }}
            zoomControl={true}
            scrollWheelZoom={false}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            <ISSMapController lat={position.latitude} lng={position.longitude} />
            <Marker position={[position.latitude, position.longitude]} icon={issIcon}>
              <Popup>
                <div className="text-center p-1">
                  <p className="font-bold text-sm">🛸 ISS is HERE</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {position.latitude.toFixed(4)}°, {position.longitude.toFixed(4)}°
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {issAstronauts.length} astronauts aboard
                  </p>
                </div>
              </Popup>
            </Marker>
          </MapContainer>
        ) : (
          <div className="h-full bg-card flex items-center justify-center">
            <div className="text-center">
              <div className="text-4xl mb-3 animate-bounce">🛸</div>
              <p className="text-sm text-muted-foreground">Connecting to ISS tracking…</p>
            </div>
          </div>
        )}
      </div>

      <p className="text-[10px] text-muted-foreground text-center">
        Data from Open Notify & WhereTheISS.at APIs · The ISS orbits Earth at ~28,000 km/h
      </p>
    </div>
  );
}
