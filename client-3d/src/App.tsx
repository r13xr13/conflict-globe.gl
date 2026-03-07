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

const GLOBE_DARK = '//unpkg.com/three-globe/example/img/earth-dark.jpg';
const GLOBE_LIGHT = '//unpkg.com/three-globe/example/img/earth-blue-marble.jpg';
const SKY_DARK = '//unpkg.com/three-globe/example/img/night-sky.png';

export default function App() {
  const globeEl = useRef<any>(null);
  const socketRef = useRef<Socket | null>(null);
  
  const [events, setEvents] = useState<ConflictEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [pointSize, setPointSize] = useState(3);
  const [showArcs, setShowArcs] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [enableClustering, setEnableClustering] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(60);
  const [selectedEvent, setSelectedEvent] = useState<ConflictEvent | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [timelinePosition, setTimelinePosition] = useState(100);
  const [globeTheme, setGlobeTheme] = useState<'dark' | 'light'>('dark');
  const [pointPrecision, setPointPrecision] = useState(300);

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
      console.error('Failed to load data:', e);
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

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(loadData, refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, loadData]);

  // WebSocket for real-time updates
  useEffect(() => {
    const socket = io(window.location.origin, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 3
    });
    
    socket.on('connect', () => {
      console.log('WebSocket connected');
    });
    
    socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });
    
    socket.on('conflicts:update', (data: { events: ConflictEvent[] }) => {
      setEvents(data.events || []);
      setLoading(false);
    });
    
    socketRef.current = socket;
    
    return () => {
      socket.disconnect();
    };
  }, []);

  // Debounced search
  const debouncedSearch = useMemo(() => {
    let timeout: NodeJS.Timeout;
    return (value: string) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => setSearchQuery(value), 300);
    };
  }, []);

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      if (!filters[event.category]) return false;
      return true;
    });
  }, [events, filters]);

  const searchFilteredEvents = useMemo(() => {
    if (!searchQuery) return filteredEvents;
    const q = searchQuery.toLowerCase();
    return filteredEvents.filter(e => 
      e.description?.toLowerCase().includes(q) ||
      e.type?.toLowerCase().includes(q) ||
      e.category?.toLowerCase().includes(q)
    );
  }, [filteredEvents, searchQuery]);

  const arcData = useMemo(() => {
    if (!showArcs) return [];
    return searchFilteredEvents
      .filter(e => e.endLat !== undefined && e.endLon !== undefined && e.endLat !== 0)
      .slice(0, 500)
      .map(e => ({
        startLat: e.lat,
        startLng: e.lon,
        endLat: e.endLat!,
        endLng: e.endLon!,
        color: categoryColors[e.category] || '#ffff00'
      }));
  }, [searchFilteredEvents, showArcs]);

  const timelineEvents = useMemo(() => {
    const sorted = [...searchFilteredEvents].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    if (sorted.length === 0) return [];
    const cutoffIndex = Math.floor((timelinePosition / 100) * sorted.length);
    return sorted.slice(0, cutoffIndex + 1);
  }, [searchFilteredEvents, timelinePosition]);

  const exportToCSV = () => {
    const headers = ['ID', 'Lat', 'Lon', 'Date', 'Type', 'Category', 'Description', 'Source'];
    const rows = timelineEvents.map(e => [
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
      features: timelineEvents.map(e => ({
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

  // Memoize Globe props
  const globeProps = useMemo(() => ({
    pointsData: timelineEvents,
    arcsData: arcData,
    heatmapsData: showHeatmap ? timelineEvents : []
  }), [timelineEvents, arcData, showHeatmap]);

  return (
    <div style={{ width: "100vw", height: "100vh", background: bgColor, position: 'relative', overflow: 'hidden' }}>
      <Globe
        ref={globeEl}
        globeImageUrl={globeTheme === 'dark' ? GLOBE_DARK : GLOBE_LIGHT}
        backgroundImageUrl={globeTheme === 'dark' ? SKY_DARK : ''}
        backgroundColor={bgColor}
        
        // Points
        pointsData={globeProps.pointsData}
        pointLat={(d: any) => d.lat}
        pointLng={(d: any) => d.lon}
        pointColor={(d: any) => categoryColors[d.category] || '#ffff00'}
        pointAltitude={0.01}
        pointRadius={pointSize / 100}
        pointsMerge={enableClustering}
        pointResolution={pointPrecision}
        
        // Labels
        labelsData={timelineEvents}
        labelLat={(d: any) => d.lat}
        labelLng={(d: any) => d.lon}
        labelText={(d: any) => categoryEmoji[d.category] || '•'}
        labelSize={1.5}
        labelDotRadius={0.3}
        labelColor={() => 'rgba(255,255,255,0.7)'}
        
        // Click
        onPointClick={(point: any) => setSelectedEvent(point)}
        
        // Arcs
        arcsData={globeProps.arcsData}
        arcStartLat={(d: any) => d.startLat}
        arcStartLng={(d: any) => d.startLng}
        arcEndLat={(d: any) => d.endLat}
        arcEndLng={(d: any) => d.endLng}
        arcColor={(d: any) => d.color}
        arcAltitude={0.15}
        arcStroke={0.8}
        arcDashLength={0.4}
        arcDashGap={0.2}
        arcDashAnimateTime={1500}
        
        // Heatmap
        heatmapsData={globeProps.heatmapsData}
        heatmapPoints={(d: any) => [[d.lat, d.lon]]}
        heatmapPointWeight={0.5}
        heatmapBandwidth={1.5}
        heatmapAltitude={0.02}
        
        // Performance
        animateIn={true}
        waitForGlobeReady={true}
        
        // Controls
        enablePointerInteraction={true}
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
              {timelineEvents.length} events • {autoRefresh ? '🔄' : '⏸️'} Auto
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
            title="Refresh"
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
                    const blob = new Blob([JSON.stringify(timelineEvents, null, 2)], { type: "application/json" });
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
          <span style={{ color: 'white', fontSize: '0.9rem' }}>📅 Timeline</span>
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
          {/* Search */}
          <div style={{ marginBottom: '16px' }}>
            <input
              type="text"
              placeholder="🔍 Search..."
              onChange={(e) => debouncedSearch(e.target.value)}
              style={{
                width: '100%', padding: '10px', borderRadius: '6px',
                border: 'none', background: 'rgba(255,255,255,0.1)', color: 'white'
              }}
            />
          </div>

          {/* Categories */}
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

          {/* Options */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ color: '#888', fontSize: '0.75rem', marginBottom: '8px' }}>OPTIONS</div>
            
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', cursor: 'pointer', color: 'white' }}>
              <input 
                type="checkbox" 
                checked={showArcs} 
                onChange={(e) => setShowArcs(e.target.checked)} 
              />
              🏹 Show Arcs
            </label>
            
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', cursor: 'pointer', color: 'white' }}>
              <input 
                type="checkbox" 
                checked={showHeatmap} 
                onChange={(e) => setShowHeatmap(e.target.checked)} 
              />
              🔥 Show Heatmap
            </label>
            
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', cursor: 'pointer', color: 'white' }}>
              <input 
                type="checkbox" 
                checked={enableClustering} 
                onChange={(e) => setEnableClustering(e.target.checked)} 
              />
              📍 Clustering
            </label>
            
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', cursor: 'pointer', color: 'white' }}>
              <input 
                type="checkbox" 
                checked={autoRefresh} 
                onChange={(e) => setAutoRefresh(e.target.checked)} 
              />
              🔄 Auto-refresh
            </label>
          </div>

          {/* Refresh Interval */}
          {autoRefresh && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ color: '#888', fontSize: '0.75rem', marginBottom: '4px' }}>
                Refresh: {refreshInterval}s
              </div>
              <input
                type="range"
                min="30"
                max="300"
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(Number(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>
          )}

          {/* Point Size */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ color: '#888', fontSize: '0.75rem', marginBottom: '4px' }}>
              Point Size: {pointSize}
            </div>
            <input
              type="range"
              min="1"
              max="10"
              value={pointSize}
              onChange={(e) => setPointSize(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ color: '#666', fontSize: '0.7rem' }}>
            {searchFilteredEvents.length} events
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
