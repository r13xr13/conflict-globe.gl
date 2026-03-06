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
  const [searchQuery, setSearchQuery] = useState("");
  const [darkMode, setDarkMode] = useState(true);
  const [pointSize, setPointSize] = useState(3);
  const [showArcs, setShowArcs] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [animationMode, setAnimationMode] = useState(false);
  const [animationIndex, setAnimationIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  const [filters, setFilters] = useState<Record<string, boolean>>({
    conflict: true, maritime: true, air: true, cyber: true,
    land: true, space: true, radio: true, weather: true,
    earthquakes: true, social: true
  });

  const loadData = async () => {
    try {
      const res = await fetch('/api/conflicts');
      const data = await res.json();
      setEvents(data.events || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(loadData, refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  useEffect(() => {
    if (notificationsEnabled && "Notification" in window) {
      Notification.requestPermission();
    }
  }, [notificationsEnabled]);

  const filteredEvents = useMemo(() => {
    return events
      .filter(e => filters[e.category])
      .filter(e => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
          e.type?.toLowerCase().includes(q) ||
          e.description?.toLowerCase().includes(q) ||
          e.category?.toLowerCase().includes(q) ||
          e.source?.toLowerCase().includes(q)
        );
      });
  }, [events, filters, searchQuery]);

  const filteredEventsRef = useRef(filteredEvents);
  filteredEventsRef.current = filteredEvents;

  useEffect(() => {
    if (!animationMode) return;
    const interval = setInterval(() => {
      setAnimationIndex(prev => {
        if (prev >= filteredEventsRef.current.length - 1) {
          setAnimationMode(false);
          return filteredEventsRef.current.length - 1;
        }
        return prev + 1;
      });
    }, 300);
    return () => clearInterval(interval);
  }, [animationMode]);

  const displayEvents = animationMode ? filteredEvents.slice(0, animationIndex + 1) : filteredEvents;

  const pointsData = useMemo(() => 
    displayEvents
      .filter(e => e.lat !== 0 || e.lon !== 0)
      .map(e => ({
        lat: e.lat,
        lng: e.lon,
        size: pointSize / 3,
        color: categoryColors[e.category] || "#e74c3c",
        ...e
      })), 
    [displayEvents, pointSize]
  );

  const heatmapData = useMemo(() => {
    if (!showHeatmap) return [];
    return displayEvents
      .filter(e => e.lat !== 0 || e.lon !== 0)
      .map(e => ({
        lat: e.lat,
        lng: e.lon,
        maxWeight: 1,
        color: categoryColors[e.category] || "#e74c3c"
      }));
  }, [displayEvents, showHeatmap]);

  const arcsData = useMemo(() => {
    if (!showArcs) return [];
    return displayEvents
      .filter(e => e.category === "conflict")
      .slice(0, 15)
      .map(c => ({
        startLat: 0, startLng: 0,
        endLat: c.lat, endLng: c.lon,
        color: [categoryColors.conflict, "#ffffff"]
      }));
  }, [displayEvents, showArcs]);

  const categoryCounts = useMemo(() => {
    const c: Record<string, number> = {};
    events.forEach(e => { c[e.category] = (c[e.category] || 0) + 1; });
    return c;
  }, [events]);

  const filteredCounts = useMemo(() => {
    const c: Record<string, number> = {};
    filteredEvents.forEach(e => { c[e.category] = (c[e.category] || 0) + 1; });
    return c;
  }, [filteredEvents]);

  const toggleFilter = (cat: string) => setFilters(f => ({ ...f, [cat]: !f[cat] }));

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(filteredEvents, null, 2)], { type: "application/json" });
    saveAs(blob, "osint-data.json");
  };

  const exportCSV = () => {
    const rows = filteredEvents.map(e => [e.id, e.type, e.category, e.lat, e.lon, e.date, (e.description || "").replace(/,/g, ";"), e.source].join(","));
    const blob = new Blob(["ID,Type,Category,Lat,Lng,Date,Description,Source\n", ...rows.join("\n")], { type: "text/csv" });
    saveAs(blob, "osint-data.csv");
  };

  const handlePointClick = (p: any) => {
    if (globeEl.current) {
      globeEl.current.pointOfView({ lat: p.lat, lng: p.lng, altitude: 1.5 }, 1000);
    }
    if (notificationsEnabled && "Notification" in window && Notification.permission === "granted") {
      new Notification(`${p.type}`, { body: p.description?.substring(0, 100), icon: "🗺️" });
    }
  };

  const startAnimation = () => {
    setAnimationMode(true);
    setAnimationIndex(0);
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
        backgroundImageUrl={darkMode ? "//unpkg.com/three-globe/example/img/night-sky.png" : "//unpkg.com/three-globe/example/img/starfield.jpg"}
        pointsData={pointsData}
        pointColor={() => "color"}
        pointAltitude={0.005}
        pointRadius={pointSize / 30}
        pointsMerge={true}
        ringsData={showHeatmap ? heatmapData : []}
        ringColor={() => "color"}
        ringMaxRadius={3}
        ringPropagationSpeed={1}
        ringRepeatPeriod={1000}
        ringMinRadius={0.5}
        pointLabel={(d: any) => `
          <div style="background: rgba(0,0,0,0.95); color: white; padding: 10px; border-radius: 6px; max-width: 280px; border: 1px solid ${categoryColors[d.category]}">
            <strong style="font-size:14px">${d.type}</strong><br/>
            <span style="color: ${categoryColors[d.category]}; font-weight:bold">${d.category.toUpperCase()}</span><br/>
            <small style="color:#aaa">${d.description?.substring(0, 100)}</small><br/>
            <small style="color:#666">Source: ${d.source}</small>
          </div>
        `}
        arcsData={arcsData}
        arcColor="color"
        arcDashLength={0.4}
        arcDashGap={0.2}
        arcDashAnimateTime={1500}
        arcsTransition={0}
        onPointClick={handlePointClick}
        enablePointerInteraction={true}
      />

      {/* Control Panel */}
      <div style={{
        position: "absolute", top: 10, left: 10,
        background: "rgba(0,0,0,0.9)", padding: "15px", borderRadius: "12px", color: "white",
        maxWidth: isMobile ? "calc(100% - 20px)" : "340px", maxHeight: isMobile ? "50vh" : "calc(100vh - 20px)",
        overflowY: "auto", zIndex: 1000,
        backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.15)"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <h2 style={{ margin: 0, fontSize: "18px" }}>🛰️ OSINT Globe 3D</h2>
          <button onClick={() => setDarkMode(!darkMode)} 
            style={{ background: darkMode ? "#f39c12" : "#2c3e50", border: "none", padding: "6px 10px", borderRadius: "4px", color: "white", cursor: "pointer" }}>
            {darkMode ? "☀️" : "🌙"}
          </button>
        </div>

        {/* Search */}
        <div style={{ marginBottom: "12px" }}>
          <input
            type="text"
            placeholder="🔍 Search events..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%", padding: "8px 12px", borderRadius: "6px", border: "none",
              background: "rgba(255,255,255,0.1)", color: "white", fontSize: "13px", boxSizing: "border-box"
            }}
          />
        </div>

        {/* Stats */}
        <div style={{ background: "rgba(255,255,255,0.1)", padding: "10px", borderRadius: "8px", marginBottom: "12px" }}>
          <div style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "8px" }}>
            📊 {filteredEvents.length} / {events.length} Events
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px", fontSize: "11px" }}>
            {Object.keys(categoryColors).map(cat => (
              <div key={cat} style={{ display: "flex", justifyContent: "space-between" }}>
                <span>{categoryEmoji[cat]} {cat}</span>
                <span style={{ color: categoryColors[cat], fontWeight: "bold" }}>{filteredCounts[cat] || 0}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div style={{ marginBottom: "12px" }}>
          <div style={{ fontSize: "12px", marginBottom: "6px", color: "#aaa" }}>FILTERS</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {Object.keys(filters).map(cat => (
              <button key={cat} onClick={() => toggleFilter(cat)}
                style={{
                  background: filters[cat] ? categoryColors[cat] : "rgba(255,255,255,0.1)",
                  border: "none", padding: "4px 10px", borderRadius: "12px", color: "white",
                  fontSize: "10px", cursor: "pointer", opacity: filters[cat] ? 1 : 0.5,
                  position: "relative"
                }}>
                {categoryEmoji[cat]} {cat.toUpperCase()}
                {categoryCounts[cat] > 0 && (
                  <span style={{
                    position: "absolute", top: -6, right: -6, background: "white", color: categoryColors[cat],
                    borderRadius: "10px", padding: "0 4px", fontSize: "9px", fontWeight: "bold"
                  }}>{categoryCounts[cat]}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Auto Refresh */}
        <div style={{ marginBottom: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
            <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} />
            <span style={{ fontSize: "12px" }}>Auto-refresh</span>
            <select value={refreshInterval} onChange={e => setRefreshInterval(Number(e.target.value))}
              disabled={!autoRefresh} style={{ background: "#333", color: "white", border: "none", padding: "2px 6px", borderRadius: "4px" }}>
              <option value={10}>10s</option>
              <option value={30}>30s</option>
              <option value={60}>1m</option>
              <option value={300}>5m</option>
            </select>
          </div>
        </div>

        {/* Options */}
        <div style={{ marginBottom: "12px", fontSize: "12px" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", marginBottom: "4px" }}>
            <input type="checkbox" checked={showArcs} onChange={e => setShowArcs(e.target.checked)} />
            Show origin arcs
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", marginBottom: "4px" }}>
            <input type="checkbox" checked={showHeatmap} onChange={e => setShowHeatmap(e.target.checked)} />
            Show heatmap rings
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
            <input type="checkbox" checked={notificationsEnabled} onChange={e => setNotificationsEnabled(e.target.checked)} />
            Enable notifications
          </label>
        </div>

        {/* Point Size */}
        <div style={{ marginBottom: "12px" }}>
          <span style={{ fontSize: "12px", marginRight: "8px" }}>Point size:</span>
          <input type="range" min="1" max="25" value={pointSize} onChange={e => setPointSize(Number(e.target.value))} style={{ width: "100px" }} />
        </div>

        {/* Animation */}
        <button onClick={startAnimation} disabled={animationMode}
          style={{ background: "#9b59b6", border: "none", padding: "8px 16px", borderRadius: "6px", color: "white", cursor: animationMode ? "not-allowed" : "pointer", width: "100%", marginBottom: "12px" }}>
          ▶️ Play Timeline
        </button>

        {/* Actions */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button onClick={loadData} disabled={loading}
            style={{ background: "#3498db", border: "none", padding: "8px 12px", borderRadius: "6px", color: "white", cursor: loading ? "not-allowed" : "pointer", flex: "1 1 auto" }}>
            {loading ? "⏳" : "🔄"} Refresh
          </button>
          <button onClick={exportJSON} style={{ background: "#27ae60", border: "none", padding: "8px 12px", borderRadius: "6px", color: "white", cursor: "pointer", flex: "1 1 auto" }}>
            📥 JSON
          </button>
          <button onClick={exportCSV} style={{ background: "#e67e22", border: "none", padding: "8px 12px", borderRadius: "6px", color: "white", cursor: "pointer", flex: "1 1 auto" }}>
            📥 CSV
          </button>
        </div>

        {/* Legend */}
        <div style={{ marginTop: "12px", fontSize: "10px", color: "#666" }}>
          <div>🛰️ OSINT Globe 3D v2.0</div>
          <div>📡 Data: ADS-B, MarineTraffic, Shodan, RSS</div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", color: "white", fontSize: "24px", background: "rgba(0,0,0,0.7)", padding: "20px", borderRadius: "12px" }}>
          🛰️ Loading OSINT Data...
        </div>
      )}
    </div>
  );
}
