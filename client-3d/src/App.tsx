import { useEffect, useState, useRef, useMemo } from "react";
import Globe from "react-globe.gl";
import { saveAs } from "file-saver";

interface ConflictEvent {
  id: string;
  lat: number;
  lon: number;
  date: string;
  type: string;
  description: string;
  source?: string;
  category: string;
}

const categoryColors: Record<string, string> = {
  conflict: "#e74c3c",
  maritime: "#3498db",
  air: "#27ae60",
  cyber: "#9b59b6",
  land: "#e67e22",
  space: "#1abc9c",
  radio: "#f39c12",
  weather: "#3498db",
  earthquakes: "#8e44ad",
  social: "#e91e63"
};

const categoryEmoji: Record<string, string> = {
  conflict: "⚔️",
  maritime: "🚢",
  air: "✈️",
  cyber: "💻",
  land: "🏗️",
  space: "🛰️",
  radio: "📡",
  weather: "🌤",
  earthquakes: "🌍",
  social: "📱"
};

interface GlobeEl {
  pointOfView: (coords: { lat: number; lng: number; altitude: number }, duration: number) => void;
}

export default function App() {
  const globeEl = useRef<GlobeEl>(null);
  const [events, setEvents] = useState<ConflictEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [pointSize, setPointSize] = useState(3);
  const [showArcs, setShowArcs] = useState(false);
  const [filters, setFilters] = useState<Record<string, boolean>>({
    conflict: true, maritime: true, air: true, cyber: true,
    land: true, space: true, radio: true, weather: true,
    earthquakes: true, social: true
  });

  useEffect(() => {
    fetch('/api/conflicts')
      .then(res => res.json())
      .then(data => {
        setEvents(data.events || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filteredEvents = useMemo(() => 
    events.filter(e => filters[e.category] && (e.lat !== 0 || e.lon !== 0)), 
    [events, filters]
  );

  const pointsData = useMemo(() => 
    filteredEvents.map(e => ({
      lat: e.lat,
      lng: e.lon,
      size: pointSize / 3,
      color: categoryColors[e.category] || "#e74c3c",
      ...e
    })), 
    [filteredEvents, pointSize]
  );

  const arcsData = useMemo(() => {
    if (!showArcs) return [];
    return filteredEvents
      .filter(e => e.category === "conflict")
      .slice(0, 10)
      .map(c => ({
        startLat: 0, startLng: 0,
        endLat: c.lat, endLng: c.lon,
        color: [categoryColors.conflict, "#ffffff"]
      }));
  }, [filteredEvents, showArcs]);

  const categoryCounts = useMemo(() => {
    const c: Record<string, number> = {};
    events.forEach(e => { c[e.category] = (c[e.category] || 0) + 1; });
    return c;
  }, [events]);

  const toggleFilter = (cat: string) => setFilters(f => ({ ...f, [cat]: !f[cat] }));

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(filteredEvents, null, 2)], { type: "application/json" });
    saveAs(blob, "osint-data.json");
  };

  const exportCSV = () => {
    const rows = filteredEvents.map(e => [e.id, e.type, e.category, e.lat, e.lon, e.date, e.description, e.source].join(","));
    const blob = new Blob(["ID,Type,Category,Lat,Lng,Date,Description,Source\n", ...rows.join("\n")], { type: "text/csv" });
    saveAs(blob, "osint-data.csv");
  };

  const globeImage = darkMode 
    ? "//unpkg.com/three-globe/example/img/earth-night.jpg"
    : "//unpkg.com/three-globe/example/img/earth-day.jpg";

  useEffect(() => {
    if (globeEl.current) globeEl.current.pointOfView({ altitude: 2.5 }, 4000);
  }, []);

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#000", position: "relative", overflow: "hidden" }}>
      <Globe
        ref={globeEl}
        globeImageUrl={globeImage}
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
        pointsData={pointsData}
        pointColor={() => "color"}
        pointAltitude={0.01}
        pointRadius={pointSize / 25}
        pointsMerge={true}
        pointLabel={(d: any) => `
          <div style="background: rgba(0,0,0,0.9); color: white; padding: 8px; border-radius: 4px; max-width: 250px;">
            <strong>${d.type}</strong><br/>
            <span style="color: ${categoryColors[d.category]}">${d.category.toUpperCase()}</span><br/>
            <small>${d.description?.substring(0, 80)}</small>
          </div>
        `}
        arcsData={arcsData}
        arcColor="color"
        arcDashLength={0.4}
        arcDashGap={0.2}
        arcDashAnimateTime={1500}
        onPointClick={(p: any) => {
          if (globeEl.current) globeEl.current.pointOfView({ lat: p.lat, lng: p.lng, altitude: 1.5 }, 1000);
        }}
        enablePointerInteraction={true}
      />

      <div style={{
        position: "absolute", top: 10, left: 10,
        background: "rgba(0,0,0,0.85)", padding: "15px", borderRadius: "12px", color: "white",
        maxWidth: "320px", maxHeight: "calc(100vh - 20px)", overflowY: "auto", zIndex: 1000
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <h2 style={{ margin: 0 }}>🛰️ OSINT Globe 3D</h2>
          <button onClick={() => setDarkMode(!darkMode)} style={{ background: darkMode ? "#f39c12" : "#2c3e50", border: "none", padding: "6px 10px", borderRadius: "4px", color: "white", cursor: "pointer" }}>
            {darkMode ? "☀️" : "🌙"}
          </button>
        </div>

        <div style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "8px" }}>
          📊 {filteredEvents.length} Events
        </div>

        <div style={{ marginBottom: "12px" }}>
          <div style={{ fontSize: "12px", marginBottom: "6px", color: "#aaa" }}>FILTERS</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {Object.keys(filters).map(cat => (
              <button key={cat} onClick={() => toggleFilter(cat)}
                style={{
                  background: filters[cat] ? categoryColors[cat] : "rgba(255,255,255,0.1)",
                  border: "none", padding: "4px 10px", borderRadius: "12px", color: "white",
                  fontSize: "11px", cursor: "pointer", opacity: filters[cat] ? 1 : 0.5
                }}>
                {categoryEmoji[cat]} {cat.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: "12px" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", cursor: "pointer" }}>
            <input type="checkbox" checked={showArcs} onChange={e => setShowArcs(e.target.checked)} />
            Show origin arcs
          </label>
        </div>

        <div style={{ marginBottom: "12px" }}>
          <span style={{ fontSize: "12px", marginRight: "8px" }}>Point size:</span>
          <input type="range" min="1" max="20" value={pointSize} onChange={e => setPointSize(Number(e.target.value))} style={{ width: "80px" }} />
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={exportJSON} style={{ background: "#27ae60", border: "none", padding: "8px 12px", borderRadius: "6px", color: "white", cursor: "pointer", flex: 1 }}>
            📥 JSON
          </button>
          <button onClick={exportCSV} style={{ background: "#e67e22", border: "none", padding: "8px 12px", borderRadius: "6px", color: "white", cursor: "pointer", flex: 1 }}>
            📥 CSV
          </button>
        </div>
      </div>

      {loading && (
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", color: "white", fontSize: "24px" }}>
          🛰️ Loading...
        </div>
      )}
    </div>
  );
}
