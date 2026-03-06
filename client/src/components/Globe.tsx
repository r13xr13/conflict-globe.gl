import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import { scaleOrdinal } from "d3-scale";
import { format } from "date-fns";
import { saveAs } from "file-saver";
import { fetchConflicts, ConflictEvent, Summary } from "../services/api";

import "leaflet/dist/leaflet.css";

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

function createIcon(color: string) {
  return L.divIcon({
    className: "custom-marker",
    html: `<div style="
      background: ${color};
      width: 12px;
      height: 12px;
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6]
  });
}

function MapEvents({ events, pointSize, showArcs, onEventClick }: { 
  events: any[], 
  pointSize: number, 
  showArcs: boolean,
  onEventClick: (e: any) => void
}) {
  const map = useMap();
  
  const arcs = useMemo(() => {
    if (!showArcs) return [];
    const conflicts = events.filter(e => e.category === "conflict").slice(0, 10);
    return conflicts.map(c => ({
      positions: [[0, 0], [c.lat, c.lon]] as [number, number][],
      color: categoryColors.conflict
    }));
  }, [events, showArcs]);

  return (
    <>
      {events.map((event, idx) => (
        <Marker
          key={event.id || idx}
          position={[event.lat, event.lon]}
          icon={createIcon(categoryColors[event.category] || categoryColors.conflict)}
          eventHandlers={{
            click: () => onEventClick(event)
          }}
        >
          <Popup>
            <div style={{ minWidth: 200 }}>
              <strong>{event.type}</strong><br/>
              <span style={{ color: categoryColors[event.category] }}>{event.category.toUpperCase()}</span><br/>
              <small>{event.description?.substring(0, 80)}</small><br/>
              <small style={{ color: "#888" }}>Source: {event.source}</small>
            </div>
          </Popup>
        </Marker>
      ))}
      {arcs.map((arc, idx) => (
        <Polyline
          key={`arc-${idx}`}
          positions={arc.positions}
          pathOptions={{ color: arc.color, weight: 2, opacity: 0.6, dashArray: "5, 10" }}
        />
      ))}
    </>
  );
}

export default function Globe() {
  const [events, setEvents] = useState<ConflictEvent[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<ConflictEvent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Record<string, boolean>>({
    conflict: true,
    maritime: true,
    air: true,
    cyber: true,
    land: true,
    space: true,
    radio: true,
    weather: true,
    earthquakes: true,
    social: true
  });
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30);
  const [darkMode, setDarkMode] = useState(true);
  const [showArcs, setShowArcs] = useState(false);
  const [pointSize, setPointSize] = useState(3);
  const [clustering, setClustering] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [timeFilter, setTimeFilter] = useState<[Date, Date]>([new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), new Date()]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchConflicts();
      setEvents(data);
      
      const s = data.reduce((acc, e) => {
        acc[e.category] = (acc[e.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      setSummary({
        total: data.length,
        conflicts: s.conflict || 0,
        maritime: s.maritime || 0,
        air: s.air || 0,
        cyber: s.cyber || 0,
        land: s.land || 0,
        space: s.space || 0,
        radio: s.radio || 0,
        weather: s.weather || 0,
        earthquakes: s.earthquakes || 0,
        social: s.social || 0
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(loadData, refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, loadData]);

  const filteredEvents = useMemo(() => 
    events.filter(e => filters[e.category]).filter(e => {
      if (!showTimeline) return true;
      const eventDate = new Date(e.date);
      return eventDate >= timeFilter[0] && eventDate <= timeFilter[1];
    }), 
    [events, filters, timeFilter, showTimeline]
  );

  const toggleFilter = (cat: string) => {
    setFilters(f => ({ ...f, [cat]: !f[cat] }));
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify(filteredEvents, null, 2)], { 
      type: "application/json" 
    });
    saveAs(blob, `osint-data-${format(new Date(), "yyyy-MM-dd-HH-mm")}.json`);
  };

  const tileUrl = darkMode
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "sans-serif" }}>
      <div style={{ flex: 1, position: "relative" }}>
        <MapContainer
          center={[20, 0]}
          zoom={2}
          style={{ height: "100%", width: "100%" }}
          worldCopyJump={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url={tileUrl}
          />
          <MapEvents 
            events={filteredEvents} 
            pointSize={pointSize}
            showArcs={showArcs}
            onEventClick={setSelectedEvent}
          />
        </MapContainer>

        {/* Control Panel */}
        <div style={{
          position: "absolute",
          top: 10,
          left: 10,
          background: "rgba(0,0,0,0.85)",
          padding: "15px",
          borderRadius: "12px",
          color: "white",
          maxWidth: "320px",
          maxHeight: "calc(100vh - 20px)",
          overflowY: "auto",
          backdropFilter: "blur(10px)",
          border: "1px solid rgba(255,255,255,0.1)",
          zIndex: 1000
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <h2 style={{ margin: 0, fontSize: "18px" }}>🗺️ OSINT Map</h2>
            <button 
              onClick={() => setDarkMode(!darkMode)}
              style={{
                background: darkMode ? "#f39c12" : "#2c3e50",
                border: "none",
                padding: "6px 12px",
                borderRadius: "4px",
                color: "white",
                cursor: "pointer"
              }}
            >
              {darkMode ? "☀️" : "🌙"}
            </button>
          </div>

          {/* Stats */}
          <div style={{ 
            background: "rgba(255,255,255,0.1)", 
            padding: "10px", 
            borderRadius: "8px",
            marginBottom: "12px"
          }}>
            <div style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "8px" }}>
              📊 {summary?.total || 0} Events
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px", fontSize: "12px" }}>
              {Object.keys(categoryColors).map(cat => (
                <div key={cat} style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>{categoryEmoji[cat]} {cat}</span>
                  <span style={{ color: categoryColors[cat], fontWeight: "bold" }}>
                    {summary?.[cat as keyof Summary] || 0}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Filters */}
          <div style={{ marginBottom: "12px" }}>
            <div style={{ fontSize: "12px", marginBottom: "6px", color: "#aaa" }}>FILTERS</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {Object.keys(filters).map(cat => (
                <button
                  key={cat}
                  onClick={() => toggleFilter(cat)}
                  style={{
                    background: filters[cat] ? categoryColors[cat] : "rgba(255,255,255,0.1)",
                    border: "none",
                    padding: "4px 10px",
                    borderRadius: "12px",
                    color: "white",
                    fontSize: "11px",
                    cursor: "pointer",
                    opacity: filters[cat] ? 1 : 0.5
                  }}
                >
                  {categoryEmoji[cat]} {cat.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Auto Refresh */}
          <div style={{ marginBottom: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <input 
                type="checkbox" 
                checked={autoRefresh} 
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
              <span style={{ fontSize: "12px" }}>Auto-refresh</span>
              <select 
                value={refreshInterval} 
                onChange={(e) => setRefreshInterval(Number(e.target.value))}
                disabled={!autoRefresh}
                style={{ background: "#333", color: "white", border: "none", padding: "2px 6px", borderRadius: "4px" }}
              >
                <option value={10}>10s</option>
                <option value={30}>30s</option>
                <option value={60}>1m</option>
                <option value={300}>5m</option>
              </select>
            </div>
          </div>

          {/* Options */}
          <div style={{ marginBottom: "12px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", cursor: "pointer" }}>
              <input 
                type="checkbox" 
                checked={showArcs} 
                onChange={(e) => setShowArcs(e.target.checked)}
              />
              Show origin arcs
            </label>
          </div>

          <div style={{ marginBottom: "12px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", cursor: "pointer" }}>
              <input 
                type="checkbox" 
                checked={showTimeline} 
                onChange={(e) => setShowTimeline(e.target.checked)}
              />
              Filter by time
            </label>
          </div>

          {showTimeline && (
            <div style={{ marginBottom: "12px", padding: "8px", background: "rgba(255,255,255,0.05)", borderRadius: "6px" }}>
              <div style={{ fontSize: "10px", color: "#888", marginBottom: "4px" }}>Past 7 days</div>
              <input 
                type="range" 
                min="0" 
                max="7" 
                value={Math.min(7, Math.floor((Date.now() - new Date(timeFilter[0]).getTime()) / (24 * 60 * 60 * 1000)))} 
                onChange={(e) => {
                  const days = Number(e.target.value);
                  setTimeFilter([new Date(Date.now() - days * 24 * 60 * 60 * 1000), new Date()]);
                }}
                style={{ width: "100%" }}
              />
            </div>
          )}

          <div style={{ marginBottom: "12px" }}>
            <span style={{ fontSize: "12px", marginRight: "8px" }}>Point size:</span>
            <input 
              type="range" 
              min="1" 
              max="10" 
              value={pointSize} 
              onChange={(e) => setPointSize(Number(e.target.value))}
              style={{ width: "80px" }}
            />
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: "8px" }}>
            <button 
              onClick={loadData}
              disabled={loading}
              style={{
                background: "#3498db",
                border: "none",
                padding: "8px 16px",
                borderRadius: "6px",
                color: "white",
                cursor: loading ? "not-allowed" : "pointer",
                flex: 1
              }}
            >
              {loading ? "⏳" : "🔄"} Refresh
            </button>
            <button 
              onClick={exportData}
              style={{
                background: "#27ae60",
                border: "none",
                padding: "8px 16px",
                borderRadius: "6px",
                color: "white",
                cursor: "pointer",
                flex: 1
              }}
            >
              📥 Export
            </button>
          </div>

          {error && (
            <div style={{ 
              marginTop: "12px", 
              padding: "8px", 
              background: "rgba(231,76,60,0.2)", 
              borderRadius: "4px",
              fontSize: "12px",
              color: "#e74c3c"
            }}>
              {error}
            </div>
          )}

          {/* Legend */}
          <div style={{ marginTop: "12px", fontSize: "10px", color: "#666" }}>
            <div>🗺️ OSINT Visualization</div>
            <div>📡 Data: ADS-B, MarineTraffic, Shodan, RSS</div>
          </div>
        </div>

        {/* Selected Event Panel */}
        {selectedEvent && (
          <div style={{
            position: "absolute",
            bottom: 20,
            left: 20,
            background: "rgba(0,0,0,0.9)",
            padding: "16px",
            borderRadius: "12px",
            color: "white",
            maxWidth: "350px",
            borderLeft: `4px solid ${categoryColors[selectedEvent.category]}`,
            backdropFilter: "blur(10px)",
            zIndex: 1000
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
              <span style={{ fontSize: "24px" }}>{categoryEmoji[selectedEvent.category]}</span>
              <button 
                onClick={() => setSelectedEvent(null)}
                style={{ background: "transparent", border: "none", color: "white", cursor: "pointer", fontSize: "18px" }}
              >
                ✕
              </button>
            </div>
            <div style={{ fontWeight: "bold", fontSize: "16px", marginBottom: "4px" }}>
              {selectedEvent.type}
            </div>
            <div style={{ 
              display: "inline-block", 
              background: categoryColors[selectedEvent.category], 
              padding: "2px 8px", 
              borderRadius: "4px",
              fontSize: "10px",
              fontWeight: "bold",
              marginBottom: "8px"
            }}>
              {selectedEvent.category.toUpperCase()}
            </div>
            <div style={{ fontSize: "12px", color: "#aaa", marginBottom: "8px" }}>
              📅 {selectedEvent.date}
            </div>
            <div style={{ fontSize: "13px", marginBottom: "8px" }}>
              {selectedEvent.description}
            </div>
            <div style={{ fontSize: "11px", color: "#666", marginBottom: "8px" }}>
              📍 {selectedEvent.lat.toFixed(4)}, {selectedEvent.lon.toFixed(4)}
            </div>
            <div style={{ fontSize: "11px", color: "#888", marginBottom: "12px" }}>
              Source: {selectedEvent.source}
            </div>
            {selectedEvent.lat !== 0 && (
              <a
                href={`https://www.openstreetmap.org/#map=15/${selectedEvent.lat}/${selectedEvent.lon}`}
                target="_blank"
                rel="noreferrer"
                style={{ 
                  display: "block", 
                  background: "#3498db", 
                  padding: "8px", 
                  borderRadius: "6px",
                  textAlign: "center",
                  color: "white",
                  textDecoration: "none",
                  fontSize: "12px"
                }}
              >
                🗺️ View on Map
              </a>
            )}
          </div>
        )}

        {/* Loading overlay */}
        {loading && (
          <div style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            color: "white",
            fontSize: "24px",
            textAlign: "center",
            background: "rgba(0,0,0,0.7)",
            padding: "20px",
            borderRadius: "12px",
            zIndex: 1001
          }}>
            <div>🗺️ Loading OSINT Data...</div>
          </div>
        )}
      </div>
    </div>
  );
}
