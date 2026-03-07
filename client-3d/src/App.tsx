import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import Globe from "react-globe.gl";
import { saveAs } from "file-saver";
import { io, Socket } from "socket.io-client";

interface ConflictEvent {
  id: string;
  lat: number;
  lon: number;
  date: string;
  type: string;
  description: string;
  source?: string;
  category: string;
  endLat?: number;
  endLon?: number;
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

const dataSources = [
  { id: 'gdelt', name: 'GDELT', category: 'conflict', enabled: true },
  { id: 'ucdp', name: 'UCDP', category: 'conflict', enabled: true },
  { id: 'vessels', name: 'Vessel Data', category: 'maritime', enabled: true },
  { id: 'aircraft', name: 'Air Traffic', category: 'air', enabled: true },
  { id: 'cyber', name: 'Cyber Threats', category: 'cyber', enabled: true },
  { id: 'satellites', name: 'Satellites', category: 'space', enabled: true },
  { id: 'radio', name: 'Radio Signals', category: 'radio', enabled: true },
  { id: 'weather', name: 'Weather', category: 'weather', enabled: true },
  { id: 'earthquakes', name: 'Earthquakes', category: 'earthquakes', enabled: true },
  { id: 'social', name: 'Social Media', category: 'social', enabled: true },
];

export default function App() {
  const globeEl = useRef<any>(null);
  const socketRef = useRef<Socket | null>(null);
  
  const [events, setEvents] = useState<ConflictEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [pointSize, setPointSize] = useState(3);
  const [showArcs, setShowArcs] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [enableClustering, setEnableClustering] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<ConflictEvent | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState<any>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [timelinePosition, setTimelinePosition] = useState(100);
  const [dataSourceSettings, setDataSourceSettings] = useState(dataSources);
  const [wsConnected, setWsConnected] = useState(false);
  const [globeTheme, setGlobeTheme] = useState<'dark' | 'light'>('dark');

  const [filters, setFilters] = useState<Record<string, boolean>>({
    conflict: true, maritime: true, air: true, cyber: true,
    land: true, space: true, radio: true, weather: true,
    earthquakes: true, social: true
  });

  const loadData = useCallback(async () => {
    try {
      const res = await fetch('/api/conflicts');
      const data = await res.json();
      setEvents(data.events || []);
    } catch (e) {
      console.error(e);
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
    if (!autoRefresh || wsConnected) return;
    const interval = setInterval(loadData, refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, loadData, wsConnected]);

  useEffect(() => {
    const socket = io(window.location.origin, {
      transports: ['websocket', 'polling']
    });
    
    socket.on('connect', () => {
      setWsConnected(true);
      console.log('WebSocket connected');
    });
    
    socket.on('disconnect', () => {
      setWsConnected(false);
      console.log('WebSocket disconnected');
    });
    
    socket.on('conflicts:update', (data: { events: ConflictEvent[] }) => {
      setEvents(data.events || []);
    });
    
    socketRef.current = socket;
    
    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (notificationsEnabled && "Notification" in window) {
      Notification.requestPermission();
    }
  }, [notificationsEnabled]);

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      if (!filters[event.category]) return false;
      if (searchQuery && !event.description?.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !event.type?.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [events, filters, searchQuery]);

  const arcData = useMemo(() => {
    if (!showArcs) return [];
    return filteredEvents
      .filter(e => e.endLat !== undefined && e.endLon !== undefined)
      .map(e => ({
        ...e,
        startLat: e.lat,
        startLng: e.lon,
        endLat: e.endLat!,
        endLng: e.endLon!
      }));
  }, [filteredEvents, showArcs]);

  const timelineEvents = useMemo(() => {
    const sorted = [...filteredEvents].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    if (sorted.length === 0) return [];
    const cutoffIndex = Math.floor((timelinePosition / 100) * sorted.length);
    return sorted.slice(0, cutoffIndex + 1);
  }, [filteredEvents, timelinePosition]);

  const exportToCSV = () => {
    const headers = ['ID', 'Lat', 'Lon', 'Date', 'Type', 'Category', 'Description', 'Source'];
    const rows = filteredEvents.map(e => [
      e.id, e.lat, e.lon, e.date, e.type, e.category, e.description || '', e.source || ''
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `conflicts-${new Date().toISOString().split('T')[0]}.csv`);
    setShowExportMenu(false);
  };

  const exportToGeoJSON = () => {
    const geojson = {
      type: 'FeatureCollection',
      features: filteredEvents.map(e => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [e.lon, e.lat]
        },
        properties: {
          id: e.id,
          date: e.date,
          type: e.type,
          category: e.category,
          description: e.description,
          source: e.source
        }
      }))
    };
    const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/json' });
    saveAs(blob, `conflicts-${new Date().toISOString().split('T')[0]}.geojson`);
    setShowExportMenu(false);
  };

  const bgColor = globeTheme === 'dark' ? '#000000' : '#f0f0f0';

  return (
    <div style={{ width: "100vw", height: "100vh", background: bgColor, position: 'relative', overflow: 'hidden' }}>
      <Globe
        ref={globeEl}
        globeImageUrl={globeTheme === 'dark' 
          ? '//unpkg.com/three-globe/example/img/earth-dark.jpg' 
          : '//unpkg.com/three-globe/example/img/earth-blue-marble.jpg'}
        backgroundImageUrl={globeTheme === 'dark' 
          ? '//unpkg.com/three-globe/example/img/night-sky.png' 
          : ''}
        backgroundColor={bgColor}
        pointsData={timelineEvents}
        pointLat={(d: any) => d.lat}
        pointLng={(d: any) => d.lon}
        pointColor={(d: any) => categoryColors[d.category] || '#ffff00'}
        pointAltitude={0.02}
        pointRadius={pointSize / 100}
        pointsMerge={enableClustering}
        pointLabel={(d: any) => `
          <div style="background: rgba(0,0,0,0.8); color: white; padding: 8px; border-radius: 4px; max-width: 250px;">
            <strong>${categoryEmoji[d.category] || ''} ${d.type || 'Event'}</strong><br/>
            <small>${d.date || ''}</small><br/>
            <p style="margin: 4px 0;">${d.description || ''}</p>
            ${d.source ? `<small style="color: #aaa;">Source: ${d.source}</small>` : ''}
          </div>
        `}
        onPointClick={(point: any) => setSelectedEvent(point)}
        onPointHover={(point: any) => setHoveredPoint(point)}
        arcsData={arcData}
        arcStartLat={(d: any) => d.startLat}
        arcStartLng={(d: any) => d.startLng}
        arcEndLat={(d: any) => d.endLat}
        arcEndLng={(d: any) => d.endLng}
        arcColor={(d: any) => categoryColors[d.category]}
        arcAltitude={0.1}
        arcStroke={0.5}
        showArcs={showArcs}
        heatmapsData={showHeatmap ? timelineEvents : []}
        heatmapPoints={(d: any) => [[d.lat, d.lon]]}
        heatmapPointWeight={1}
        heatmapBandwidth={2}
      />

      {/* Header */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        padding: '16px 24px',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.8), transparent)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => setShowSidebar(prev => !prev)}
            style={{
              background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '4px',
              padding: '8px 12px', color: 'white', cursor: 'pointer'
            }}
          >
            ☰
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', color: 'white', fontWeight: 600 }}>
              ⚔️ Conflict Globe
            </h1>
            <p style={{ margin: 0, color: '#888', fontSize: '0.8rem' }}>
              OSINT Intelligence {wsConnected ? '🟢' : '🔴'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={loadData}
            style={{
              background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '4px',
              padding: '8px 12px', color: 'white', cursor: 'pointer'
            }}
          >
            🔄
          </button>
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              style={{
                background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '4px',
                padding: '8px 12px', color: 'white', cursor: 'pointer'
              }}
            >
              💾
            </button>
            {showExportMenu && (
              <div style={{
                position: 'absolute', top: '100%', right: 0,
                background: 'rgba(15,15,20,0.95)', borderRadius: '8px',
                padding: '8px 0', marginTop: '4px', minWidth: '150px',
                border: '1px solid rgba(255,255,255,0.1)'
              }}>
                {[
                  { label: 'JSON', action: () => {
                    const blob = new Blob([JSON.stringify(filteredEvents, null, 2)], { type: "application/json" });
                    saveAs(blob, "conflicts.json");
                    setShowExportMenu(false);
                  }},
                  { label: 'CSV', action: exportToCSV },
                  { label: 'GeoJSON', action: exportToGeoJSON }
                ].map(item => (
                  <button
                    key={item.label}
                    onClick={item.action}
                    style={{
                      display: 'block', width: '100%', padding: '8px 16px',
                      background: 'none', border: 'none', color: 'white',
                      textAlign: 'left', cursor: 'pointer'
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => setGlobeTheme(t => t === 'dark' ? 'light' : 'dark')}
            style={{
              background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '4px',
              padding: '8px 12px', color: 'white', cursor: 'pointer'
            }}
          >
            {globeTheme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </div>

      {/* Timeline */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: '16px 24px',
        background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
        zIndex: 100
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ color: 'white', fontSize: '0.9rem' }}>Timeline</span>
          <span style={{ color: '#888', fontSize: '0.8rem' }}>{timelineEvents.length} events</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={timelinePosition}
          onChange={(e) => setTimelinePosition(Number(e.target.value))}
          style={{ width: '100%', cursor: 'pointer' }}
        />
      </div>

      {/* Sidebar */}
      {showSidebar && (
        <div style={{
          position: 'absolute', top: '80px', left: '16px',
          width: isMobile ? 'calc(100% - 32px)' : '320px',
          maxHeight: 'calc(100vh - 180px)',
          background: 'rgba(15,15,20,0.95)', borderRadius: '12px',
          padding: '16px', overflowY: 'auto',
          border: '1px solid rgba(255,255,255,0.1)',
          zIndex: 100
        }}>
          <div style={{ marginBottom: '16px' }}>
            <input
              type="text"
              placeholder="🔍 Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%', padding: '10px', borderRadius: '6px',
                border: 'none', background: 'rgba(255,255,255,0.1)', color: 'white'
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <div style={{ color: '#888', fontSize: '0.75rem', marginBottom: '8px' }}>CATEGORIES</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {Object.keys(filters).map(cat => (
                <button
                  key={cat}
                  onClick={() => setFilters(f => ({ ...f, [cat]: !f[cat] }))}
                  style={{
                    background: filters[cat] ? categoryColors[cat] : 'rgba(255,255,255,0.1)',
                    border: 'none', padding: '4px 10px', borderRadius: '12px',
                    color: 'white', fontSize: '0.75rem', cursor: 'pointer',
                    opacity: filters[cat] ? 1 : 0.5
                  }}
                >
                  {categoryEmoji[cat]} {cat}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <div style={{ color: '#888', fontSize: '0.75rem', marginBottom: '8px' }}>OPTIONS</div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', cursor: 'pointer', color: 'white' }}>
              <input type="checkbox" checked={showArcs} onChange={(e) => setShowArcs(e.target.checked)} />
              Show Arcs
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', cursor: 'pointer', color: 'white' }}>
              <input type="checkbox" checked={showHeatmap} onChange={(e) => setShowHeatmap(e.target.checked)} />
              Show Heatmap
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', cursor: 'pointer', color: 'white' }}>
              <input type="checkbox" checked={enableClustering} onChange={(e) => setEnableClustering(e.target.checked)} />
              Enable Clustering
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', cursor: 'pointer', color: 'white' }}>
              <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
              Auto-refresh
            </label>
          </div>

          <div style={{ color: '#666', fontSize: '0.7rem' }}>
            {filteredEvents.length} events
          </div>
        </div>
      )}

      {/* Selected Event Modal */}
      {selectedEvent && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          background: 'rgba(15,15,20,0.98)', borderRadius: '12px', padding: '24px',
          maxWidth: '400px', width: '90%', border: `2px solid ${categoryColors[selectedEvent.category]}`,
          zIndex: 200
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <span style={{ fontSize: '2rem' }}>{categoryEmoji[selectedEvent.category]}</span>
            <button onClick={() => setSelectedEvent(null)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.5rem', cursor: 'pointer' }}>✕</button>
          </div>
          <h2 style={{ margin: '0 0 8px 0', color: 'white' }}>{selectedEvent.type}</h2>
          <div style={{ display: 'inline-block', background: categoryColors[selectedEvent.category], padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold', marginBottom: '12px' }}>
            {selectedEvent.category.toUpperCase()}
          </div>
          <div style={{ color: '#888', fontSize: '0.85rem', marginBottom: '12px' }}>{selectedEvent.date}</div>
          <div style={{ color: 'white', fontSize: '0.9rem', marginBottom: '12px' }}>{selectedEvent.description}</div>
          <div style={{ color: '#666', fontSize: '0.8rem' }}>📍 {selectedEvent.lat.toFixed(4)}, {selectedEvent.lon.toFixed(4)}</div>
          {selectedEvent.source && <div style={{ color: '#666', fontSize: '0.8rem', marginTop: '4px' }}>Source: {selectedEvent.source}</div>}
        </div>
      )}

      {loading && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          color: 'white', fontSize: '1.5rem'
        }}>
          Loading...
        </div>
      )}
    </div>
  );
}
