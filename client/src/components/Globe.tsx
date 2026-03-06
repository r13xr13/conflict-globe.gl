import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
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

function createIcon(color: string, size: number = 12) {
  return L.divIcon({
    className: "custom-marker",
    html: `<div style="
      background: ${color};
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [size, size],
    iconAnchor: [size/2, size/2]
  });
}

function MapClickHandler({ onEventClick }: { onEventClick: (e: any) => void }) {
  useMapEvents({
    click: (e) => {
      console.log("Map clicked at:", e.latlng);
    }
  });
  return null;
}

function MapEvents({ 
  events, 
  pointSize, 
  showArcs, 
  showHeatmap,
  showRoutes,
  onEventClick,
  zoomToEvent,
  animationMode,
  animationIndex
}: { 
  events: any[], 
  pointSize: number, 
  showArcs: boolean,
  showHeatmap: boolean,
  showRoutes: boolean,
  onEventClick: (e: any) => void,
  zoomToEvent: { lat: number, lng: number } | null,
  animationMode: boolean,
  animationIndex: number
}) {
  const map = useMap();
  
  useEffect(() => {
    if (zoomToEvent) {
      map.flyTo([zoomToEvent.lat, zoomToEvent.lng], 8, { duration: 1 });
    }
  }, [zoomToEvent, map]);

  const arcs = useMemo(() => {
    if (!showArcs) return [];
    const conflicts = events.filter(e => e.category === "conflict").slice(0, 10);
    return conflicts.map(c => ({
      positions: [[0, 0], [c.lat, c.lon]] as [number, number][],
      color: categoryColors.conflict
    }));
  }, [events, showArcs]);

  const routes = useMemo(() => {
    if (!showRoutes) return [];
    const airEvents = events.filter(e => e.category === "air").slice(0, 5);
    const maritimeEvents = events.filter(e => e.category === "maritime").slice(0, 5);
    
    const routeLines: { positions: [number, number][], color: string }[] = [];
    
    airEvents.forEach(e => {
      if (e.routeStart && e.routeEnd) {
        routeLines.push({
          positions: [e.routeStart, e.routeEnd],
          color: categoryColors.air
        });
      }
    });
    
    maritimeEvents.forEach(e => {
      if (e.routeStart && e.routeEnd) {
        routeLines.push({
          positions: [e.routeStart, e.routeEnd],
          color: categoryColors.maritime
        });
      }
    });
    
    return routeLines;
  }, [events, showRoutes]);

  const displayEvents = animationMode ? events.slice(0, animationIndex + 1) : events;

  return (
    <>
      {displayEvents.map((event, idx) => (
        <Marker
          key={event.id || idx}
          position={[event.lat, event.lon]}
          icon={createIcon(
            categoryColors[event.category] || categoryColors.conflict, 
            pointSize
          )}
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
      
      {showHeatmap && events.map((event, idx) => (
        <Circle
          key={`heat-${idx}`}
          center={[event.lat, event.lon]}
          radius={50000}
          pathOptions={{
            color: categoryColors[event.category],
            fillColor: categoryColors[event.category],
            fillOpacity: 0.3,
            weight: 1
          }}
        />
      ))}
      
      {arcs.map((arc, idx) => (
        <Polyline
          key={`arc-${idx}`}
          positions={arc.positions}
          pathOptions={{ color: arc.color, weight: 2, opacity: 0.6, dashArray: "5, 10" }}
        />
      ))}
      
      {routes.map((route, idx) => (
        <Polyline
          key={`route-${idx}`}
          positions={route.positions}
          pathOptions={{ color: route.color, weight: 3, opacity: 0.8 }}
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
  const [searchQuery, setSearchQuery] = useState("");
  const [zoomToEvent, setZoomToEvent] = useState<{ lat: number, lng: number } | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  
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
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showRoutes, setShowRoutes] = useState(false);
  const [pointSize, setPointSize] = useState(3);
  const [showTimeline, setShowTimeline] = useState(false);
  const [timeFilter, setTimeFilter] = useState<[Date, Date]>([new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), new Date()]);
  const [animationMode, setAnimationMode] = useState(false);
  const [animationIndex, setAnimationIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchConflicts();
      
      const enrichedData = data.map((e, idx) => ({
        ...e,
        routeStart: e.category === "air" ? [Math.random() * 60 - 30, Math.random() * 360 - 180] as [number, number] : undefined,
        routeEnd: e.category === "air" ? [e.lat, e.lon] as [number, number] : undefined
      }));
      
      setEvents(enrichedData);
      
      const s = enrichedData.reduce((acc, e) => {
        acc[e.category] = (acc[e.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      setSummary({
        total: enrichedData.length,
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
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(loadData, refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, loadData]);

  useEffect(() => {
    if (notificationsEnabled && "Notification" in window) {
      Notification.requestPermission();
    }
  }, [notificationsEnabled]);

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
    }, 500);
    
    return () => clearInterval(interval);
  }, [animationMode]);

  const filteredEvents = useMemo(() => 
    events
      .filter(e => filters[e.category])
      .filter(e => {
        if (!showTimeline) return true;
        const eventDate = new Date(e.date);
        return eventDate >= timeFilter[0] && eventDate <= timeFilter[1];
      })
      .filter(e => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
          e.type?.toLowerCase().includes(query) ||
          e.description?.toLowerCase().includes(query) ||
          e.category?.toLowerCase().includes(query) ||
          e.source?.toLowerCase().includes(query)
        );
      }), 
    [events, filters, timeFilter, showTimeline, searchQuery]
  );

  const filteredEventsRef = React.useRef(filteredEvents);
  filteredEventsRef.current = filteredEvents;

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    events.forEach(e => {
      if (filters[e.category]) {
        counts[e.category] = (counts[e.category] || 0) + 1;
      }
    });
    return counts;
  }, [events, filters]);

  const toggleFilter = (cat: string) => {
    setFilters(f => ({ ...f, [cat]: !f[cat] }));
  };

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(filteredEvents, null, 2)], { 
      type: "application/json" 
    });
    saveAs(blob, `osint-data-${format(new Date(), "yyyy-MM-dd-HH-mm")}.json`);
  };

  const exportCSV = () => {
    const headers = ["ID", "Type", "Category", "Latitude", "Longitude", "Date", "Description", "Source"];
    const rows = filteredEvents.map(e => [
      e.id,
      e.type,
      e.category,
      e.lat.toString(),
      e.lon.toString(),
      e.date,
      e.description?.replace(/,/g, ";"),
      e.source
    ]);
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    saveAs(blob, `osint-data-${format(new Date(), "yyyy-MM-dd-HH-mm")}.csv`);
  };

  const handleEventClick = (event: any) => {
    setSelectedEvent(event);
    setZoomToEvent({ lat: event.lat, lng: event.lon });
    
    if (notificationsEnabled && "Notification" in window && Notification.permission === "granted") {
      new Notification(`${event.type}`, {
        body: event.description?.substring(0, 100),
        icon: "🗺️"
      });
    }
  };

  const startAnimation = () => {
    setAnimationMode(true);
    setAnimationIndex(0);
  };

  const tileUrl = darkMode
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "sans-serif", flexDirection: isMobile ? "column" : "row" }}>
      <div style={{ flex: 1, position: "relative", minHeight: isMobile ? "50vh" : "100%" }}>
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
            showHeatmap={showHeatmap}
            showRoutes={showRoutes}
            onEventClick={handleEventClick}
            zoomToEvent={zoomToEvent}
            animationMode={animationMode}
            animationIndex={animationIndex}
          />
          <MapClickHandler onEventClick={handleEventClick} />
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
          maxWidth: isMobile ? "calc(100% - 20px)" : "320px",
          maxHeight: isMobile ? "40vh" : "calc(100vh - 20px)",
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

          {/* Search */}
          <div style={{ marginBottom: "12px" }}>
            <input
              type="text"
              placeholder="🔍 Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "6px",
                border: "none",
                background: "rgba(255,255,255,0.1)",
                color: "white",
                fontSize: "13px",
                boxSizing: "border-box"
              }}
            />
          </div>

          {/* Stats */}
          <div style={{ 
            background: "rgba(255,255,255,0.1)", 
            padding: "10px", 
            borderRadius: "8px",
            marginBottom: "12px"
          }}>
            <div style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "8px" }}>
              📊 {filteredEvents.length} / {summary?.total || 0} Events
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px", fontSize: "12px" }}>
              {Object.keys(categoryColors).map(cat => (
                <div key={cat} style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>{categoryEmoji[cat]} {cat}</span>
                  <span style={{ color: categoryColors[cat], fontWeight: "bold" }}>
                    {categoryCounts[cat] || 0}
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
                    opacity: filters[cat] ? 1 : 0.5,
                    position: "relative"
                  }}
                >
                  {categoryEmoji[cat]} {cat.toUpperCase()}
                  {categoryCounts[cat] > 0 && (
                    <span style={{
                      position: "absolute",
                      top: -6,
                      right: -6,
                      background: "white",
                      color: categoryColors[cat],
                      borderRadius: "10px",
                      padding: "0 4px",
                      fontSize: "9px",
                      fontWeight: "bold"
                    }}>
                      {categoryCounts[cat]}
                    </span>
                  )}
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
            <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", cursor: "pointer", marginBottom: "4px" }}>
              <input type="checkbox" checked={showArcs} onChange={(e) => setShowArcs(e.target.checked)} />
              Show origin arcs
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", cursor: "pointer", marginBottom: "4px" }}>
              <input type="checkbox" checked={showHeatmap} onChange={(e) => setShowHeatmap(e.target.checked)} />
              Show heatmap
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", cursor: "pointer", marginBottom: "4px" }}>
              <input type="checkbox" checked={showRoutes} onChange={(e) => setShowRoutes(e.target.checked)} />
              Show routes
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", cursor: "pointer", marginBottom: "4px" }}>
              <input type="checkbox" checked={showTimeline} onChange={(e) => setShowTimeline(e.target.checked)} />
              Filter by time
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", cursor: "pointer" }}>
              <input type="checkbox" checked={notificationsEnabled} onChange={(e) => setNotificationsEnabled(e.target.checked)} />
              Enable notifications
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
              max="20" 
              value={pointSize} 
              onChange={(e) => setPointSize(Number(e.target.value))}
              style={{ width: "80px" }}
            />
          </div>

          {/* Animation */}
          <div style={{ marginBottom: "12px" }}>
            <button 
              onClick={startAnimation}
              disabled={animationMode}
              style={{
                background: "#9b59b6",
                border: "none",
                padding: "8px 16px",
                borderRadius: "6px",
                color: "white",
                cursor: animationMode ? "not-allowed" : "pointer",
                width: "100%",
                marginBottom: "8px"
              }}
            >
              ▶️ Play Timeline
            </button>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button 
              onClick={loadData}
              disabled={loading}
              style={{
                background: "#3498db",
                border: "none",
                padding: "8px 12px",
                borderRadius: "6px",
                color: "white",
                cursor: loading ? "not-allowed" : "pointer",
                flex: "1 1 auto"
              }}
            >
              {loading ? "⏳" : "🔄"} Refresh
            </button>
            <button 
              onClick={exportJSON}
              style={{
                background: "#27ae60",
                border: "none",
                padding: "8px 12px",
                borderRadius: "6px",
                color: "white",
                cursor: "pointer",
                flex: "1 1 auto"
              }}
            >
              📥 JSON
            </button>
            <button 
              onClick={exportCSV}
              style={{
                background: "#e67e22",
                border: "none",
                padding: "8px 12px",
                borderRadius: "6px",
                color: "white",
                cursor: "pointer",
                flex: "1 1 auto"
              }}
            >
              📥 CSV
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
            <div>🗺️ OSINT Visualization v2.0</div>
            <div>📡 Data: ADS-B, MarineTraffic, Shodan, RSS</div>
          </div>
        </div>

        {/* Selected Event Panel */}
        {selectedEvent && (
          <div style={{
            position: "absolute",
            bottom: 20,
            left: 20,
            right: isMobile ? 20 : "auto",
            background: "rgba(0,0,0,0.9)",
            padding: "16px",
            borderRadius: "12px",
            color: "white",
            maxWidth: isMobile ? "auto" : "350px",
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
