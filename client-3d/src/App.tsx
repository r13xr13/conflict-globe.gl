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

// Globe assets
const GLOBE_DARK = '//unpkg.com/three-globe/example/img/earth-dark.jpg';
const GLOBE_LIGHT = '//unpkg.com/three-globe/example/img/earth-blue-marble.jpg';
const BUMP_MAP = '//unpkg.com/three-globe/example/img/earth-topology.png';
const SKY_DARK = '//unpkg.com/three-globe/example/img/night-sky.png';
const CLOUDS = '//unpkg.com/three-globe/example/img/earth-clouds.png';

export default function App() {
  const globeEl = useRef<any>(null);
  const socketRef = useRef<Socket | null>(null);
  
  const [events, setEvents] = useState<ConflictEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [pointSize, setPointSize] = useState(2);
  
  // Visualizations
  const [showArcs, setShowArcs] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showHexBin, setShowHexBin] = useState(false);
  const [showRings, setShowRings] = useState(false);
  const [showPolygons, setShowPolygons] = useState(false);
  const [showPaths, setShowPaths] = useState(false);
  const [showHtmlMarkers, setShowHtmlMarkers] = useState(false);
  
  // Globe options
  const [enableClustering, setEnableClustering] = useState(true);
  const [showGraticules, setShowGraticules] = useState(false);
  const [showAtmosphere, setShowAtmosphere] = useState(true);
  const [showClouds, setShowClouds] = useState(false);
  const [globeRotation, setGlobeRotation] = useState(false);
  
  // Data settings
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(60);
  const [maxPoints, setMaxPoints] = useState(200);
  
  const [selectedEvent, setSelectedEvent] = useState<ConflictEvent | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [timelinePosition, setTimelinePosition] = useState(100);
  const [globeTheme, setGlobeTheme] = useState<'dark' | 'light'>('dark');
  const [pointPrecision, setPointPrecision] = useState(32);
  const [hoverInfo, setHoverInfo] = useState<any>(null);

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

  useEffect(() => { loadData(); }, [loadData]);

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
    const socket = io(window.location.origin, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 3
    });
    socket.on('connect', () => console.log('WebSocket connected'));
    socket.on('disconnect', () => console.log('WebSocket disconnected'));
    socket.on('conflicts:update', (data: { events: ConflictEvent[] }) => {
      setEvents(data.events || []);
      setLoading(false);
    });
    socketRef.current = socket;
    return () => { socket.disconnect(); };
  }, []);

  // Globe auto-rotation
  useEffect(() => {
    if (!globeRotation || !globeEl.current) return;
    const globe = globeEl.current;
    let animationId: number;
    const rotate = () => {
      const current = globe.pointOfView()?.lng || 0;
      globe.pointOfView({ lng: current + 0.1, lat: undefined });
      animationId = requestAnimationFrame(rotate);
    };
    rotate();
    return () => cancelAnimationFrame(animationId);
  }, [globeRotation]);

  // Filter and limit data for performance
  const filteredEvents = useMemo(() => {
    return events.filter(event => filters[event.category]).slice(0, maxPoints);
  }, [events, filters, maxPoints]);

  const searchFilteredEvents = useMemo(() => {
    if (!searchQuery) return filteredEvents;
    const q = searchQuery.toLowerCase();
    return filteredEvents.filter(e => 
      e.description?.toLowerCase().includes(q) ||
      e.type?.toLowerCase().includes(q) ||
      e.category?.toLowerCase().includes(q)
    );
  }, [filteredEvents, searchQuery]);

  const timelineEvents = useMemo(() => {
    const sorted = [...searchFilteredEvents].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    if (sorted.length === 0) return [];
    const cutoffIndex = Math.floor((timelinePosition / 100) * sorted.length);
    return sorted.slice(0, cutoffIndex + 1);
  }, [searchFilteredEvents, timelinePosition]);

  // Visualization data
  const arcData = useMemo(() => {
    if (!showArcs) return [];
    return searchFilteredEvents
      .filter(e => e.endLat && e.endLon && e.endLat !== 0)
      .slice(0, 100)
      .map(e => ({
        startLat: e.lat,
        startLng: e.lon,
        endLat: e.endLat!,
        endLng: e.endLon!,
        color: categoryColors[e.category]
      }));
  }, [searchFilteredEvents, showArcs]);

  const hexBinData = useMemo(() => {
    if (!showHexBin) return [];
    return timelineEvents.filter(e => e.lat !== 0 && e.lon !== 0);
  }, [timelineEvents, showHexBin]);

  const ringData = useMemo(() => {
    if (!showRings) return [];
    return timelineEvents
      .filter(e => e.lat !== 0 && e.lon !== 0)
      .slice(0, 200)
      .map(e => ({
        lat: e.lat,
        lng: e.lon,
        color: categoryColors[e.category]
      }));
  }, [timelineEvents, showRings]);

  // Path data for movement visualization
  const pathData = useMemo(() => {
    if (!showPaths) return [];
    // Create paths from events with end coordinates
    return searchFilteredEvents
      .filter(e => e.endLat && e.endLon && e.endLat !== 0)
      .slice(0, 50)
      .map(e => ({
        path: [
          [e.lat, e.lon],
          [e.endLat!, e.endLon!]
        ],
        color: categoryColors[e.category]
      }));
  }, [searchFilteredEvents, showPaths]);

  const polygonData = useMemo(() => {
    if (!showPolygons) return [];
    const regions: Record<string, { lat: number; lng: number; count: number }> = {};
    timelineEvents.forEach(e => {
      if (e.lat === 0 || e.lon === 0) return;
      const key = `${Math.floor(e.lat / 15)}-${Math.floor(e.lon / 15)}`;
      if (!regions[key]) {
        regions[key] = { lat: Math.floor(e.lat / 15) * 15 + 7.5, lng: Math.floor(e.lon / 15) * 15 + 7.5, count: 0 };
      }
      regions[key].count++;
    });
    return Object.values(regions).filter(r => r.count > 0);
  }, [timelineEvents, showPolygons]);

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
        geometry: { type: 'Point', coordinates: [e.lon, e.lat] },
        properties: { id: e.id, date: e.date, type: e.type, category: e.category, description: e.description, source: e.source }
      }))
    };
    const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/json' });
    saveAs(blob, `conflicts-${new Date().toISOString().split('T')[0]}.geojson`);
    setShowExportMenu(false);
  };

  const bgColor = globeTheme === 'dark' ? '#000011' : '#f0f0f0';

  return (
    <div style={{ width: "100vw", height: "100vh", background: bgColor, position: 'relative', overflow: 'hidden' }}>
      <Globe
        ref={globeEl}
        globeImageUrl={globeTheme === 'dark' ? GLOBE_DARK : GLOBE_LIGHT}
        backgroundImageUrl={globeTheme === 'dark' ? SKY_DARK : ''}
        backgroundColor={bgColor}
        bumpImageUrl={BUMP_MAP}
        showAtmosphere={showAtmosphere}
        atmosphereColor={globeTheme === 'dark' ? '#3a228a' : '#88ccff'}
        atmosphereAltitude={0.15}
        showGraticules={showGraticules}
        graticuleColor={() => globeTheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}
        
        // Clouds layer
        cloudsUrl={showClouds ? CLOUDS : undefined}
        cloudsOpacity={0.4}
        
        // Points
        pointsData={timelineEvents}
        pointLat={(d: any) => d.lat}
        pointLng={(d: any) => d.lon}
        pointColor={(d: any) => categoryColors[d.category] || '#ffff00'}
        pointAltitude={0.01}
        pointRadius={pointSize / 100}
        pointsMerge={enableClustering}
        pointResolution={pointPrecision}
        
        // HexBin
        hexBinPointsData={hexBinData}
        hexBinPointWeight={1}
        hexBinResolution={3}
        hexBinColor={(d: any) => {
          const count = d.points.length;
          if (count > 50) return '#ff0000';
          if (count > 25) return '#ff6600';
          if (count > 10) return '#ffaa00';
          if (count > 5) return '#ffff00';
          return '#88ff00';
        }}
        
        // Rings
        ringsData={ringData}
        ringLat={(d: any) => d.lat}
        ringLng={(d: any) => d.lng}
        ringColor={(d: any) => d.color}
        ringAltitude={0.01}
        ringRadius={0.3}
        ringResolution={12}
        
        // Polygons
        polygonsData={polygonData}
        polygonCapColor={() => 'rgba(255,100,100,0.3)'}
        polygonSideColor={() => 'rgba(255,100,100,0.2)'}
        polygonStrokeColor={() => 'rgba(255,100,100,0.5)'}
        
        // Paths
        pathsData={pathData}
        pathPoints={(d: any) => d.path}
        pathPointLat={(p: any) => p[0]}
        pathPointLng={(p: any) => p[1]}
        pathColor={() => 'rgba(255,255,255,0.3)'}
        pathDashLength={0.5}
        pathDashGap={0.2}
        pathDashAnimateTime={2000}
        
        // Arcs
        arcsData={arcData}
        arcStartLat={(d: any) => d.startLat}
        arcStartLng={(d: any) => d.startLng}
        arcEndLat={(d: any) => d.endLat}
        arcEndLng={(d: any) => d.endLng}
        arcColor={(d: any) => d.color}
        arcAltitude={0.15}
        arcStroke={0.5}
        arcDashLength={0.3}
        arcDashGap={0.2}
        arcDashAnimateTime={1500}
        
        // Heatmap
        heatmapsData={showHeatmap ? timelineEvents : []}
        heatmapPoints={(d: any) => [[d.lat, d.lon]]}
        heatmapPointWeight={0.3}
        heatmapBandwidth={2}
        
        // Labels
        labelsData={timelineEvents.filter(e => e.lat !== 0)}
        labelLat={(d: any) => d.lat}
        labelLng={(d: any) => d.lon}
        labelText={(d: any) => categoryEmoji[d.category] || '•'}
        labelSize={1}
        labelDotRadius={0.3}
        labelColor={() => 'rgba(255,255,255,0.8)'}
        labelAltitude={0.02}
        
        // Interactions
        onHover={(hoverObj: any) => {
          setHoverInfo(hoverObj && hoverObj.type === 'hover' ? hoverObj : null);
        }}
        onPointClick={(point: any) => setSelectedEvent(point)}
        
        // Performance
        animateIn={true}
        waitForGlobeReady={true}
        enablePointerInteraction={true}
      />

      {/* Hover Info */}
      {hoverInfo && hoverInfo.object && (
        <div style={{
          position: 'absolute', bottom: '100px', left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.85)', borderRadius: '8px', padding: '12px 16px',
          color: 'white', fontSize: '0.85rem', maxWidth: '300px', zIndex: 150,
          border: `1px solid ${categoryColors[hoverInfo.object.category] || '#fff'}`
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
            {categoryEmoji[hoverInfo.object.category]} {hoverInfo.object.type}
          </div>
          <div style={{ color: '#aaa', fontSize: '0.75rem' }}>{hoverInfo.object.date}</div>
          {hoverInfo.object.description && (
            <div style={{ marginTop: '8px', fontSize: '0.8rem' }}>
              {hoverInfo.object.description.substring(0, 120)}
              {hoverInfo.object.description.length > 120 ? '...' : ''}
            </div>
          )}
        </div>
      )}

      {/* Header */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        padding: '16px 24px',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.8), transparent)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => setShowSidebar(p => !p)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '4px', padding: '8px 12px', color: 'white', cursor: 'pointer' }}>☰</button>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', color: 'white', fontWeight: 600 }}>⚔️ Conflict Globe</h1>
            <p style={{ margin: 0, color: '#888', fontSize: '0.8rem' }}>{timelineEvents.length} events • {autoRefresh ? '🔄' : '⏸️'}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={loadData} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '4px', padding: '8px 12px', color: 'white', cursor: 'pointer' }}>🔄</button>
          <button onClick={() => setGlobeTheme(t => t === 'dark' ? 'light' : 'dark')} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '4px', padding: '8px 12px', color: 'white', cursor: 'pointer' }}>
            {globeTheme === 'dark' ? '☀️' : '🌙'}
          </button>
          <button onClick={() => setGlobeRotation(r => !r)} style={{ background: globeRotation ? '#e74c3c' : 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '4px', padding: '8px 12px', color: 'white', cursor: 'pointer' }}>🔁</button>
        </div>
      </div>

      {/* Timeline */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '16px 24px', background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)', zIndex: 100 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ color: 'white', fontSize: '0.9rem' }}>📅 Timeline</span>
          <span style={{ color: '#888', fontSize: '0.8rem' }}>{timelineEvents.length} events</span>
        </div>
        <input type="range" min="0" max="100" value={timelinePosition} onChange={(e) => setTimelinePosition(Number(e.target.value))} style={{ width: '100%', cursor: 'pointer' }} />
      </div>

      {/* Sidebar */}
      {showSidebar && (
        <div style={{ position: 'absolute', top: '80px', left: '16px', width: isMobile ? 'calc(100% - 32px)' : '320px', maxHeight: 'calc(100vh - 180px)', background: 'rgba(15,15,20,0.95)', borderRadius: '12px', padding: '16px', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.1)', zIndex: 100 }}>
          {/* Search */}
          <div style={{ marginBottom: '16px' }}>
            <input type="text" placeholder="🔍 Search..." onChange={(e) => setSearchQuery(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: 'none', background: 'rgba(255,255,255,0.1)', color: 'white' }} />
          </div>

          {/* Globe Options */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ color: '#888', fontSize: '0.75rem', marginBottom: '8px' }}>GLOBE</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'white' }}>
                <input type="checkbox" checked={showAtmosphere} onChange={(e) => setShowAtmosphere(e.target.checked)} /> 🌫️ Atmosphere
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'white' }}>
                <input type="checkbox" checked={showGraticules} onChange={(e) => setShowGraticules(e.target.checked)} /> 🌍 Graticules
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'white' }}>
                <input type="checkbox" checked={showClouds} onChange={(e) => setShowClouds(e.target.checked)} /> ☁️ Clouds
              </label>
            </div>
          </div>

          {/* Visualizations */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ color: '#888', fontSize: '0.75rem', marginBottom: '8px' }}>VISUALIZATIONS</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'white' }}>
                <input type="checkbox" checked={showArcs} onChange={(e) => setShowArcs(e.target.checked)} /> 🏹 Arcs
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'white' }}>
                <input type="checkbox" checked={showHeatmap} onChange={(e) => setShowHeatmap(e.target.checked)} /> 🔥 Heatmap
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'white' }}>
                <input type="checkbox" checked={showHexBin} onChange={(e) => setShowHexBin(e.target.checked)} /> ⬡ HexBins
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'white' }}>
                <input type="checkbox" checked={showRings} onChange={(e) => setShowRings(e.target.checked)} /> ⭕ Rings
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'white' }}>
                <input type="checkbox" checked={showPaths} onChange={(e) => setShowPaths(e.target.checked)} /> 🛤️ Paths
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'white' }}>
                <input type="checkbox" checked={showPolygons} onChange={(e) => setShowPolygons(e.target.checked)} /> 🗺️ Polygons
              </label>
            </div>
          </div>

          {/* Categories */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ color: '#888', fontSize: '0.75rem', marginBottom: '8px' }}>CATEGORIES</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {Object.keys(filters).map(cat => (
                <button key={cat} onClick={() => setFilters(f => ({ ...f, [cat]: !f[cat] }))} style={{ background: filters[cat] ? categoryColors[cat] : 'rgba(255,255,255,0.1)', border: 'none', padding: '4px 10px', borderRadius: '12px', color: 'white', fontSize: '0.75rem', cursor: 'pointer', opacity: filters[cat] ? 1 : 0.5 }}>
                  {categoryEmoji[cat]} {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Options */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ color: '#888', fontSize: '0.75rem', marginBottom: '8px' }}>OPTIONS</div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', cursor: 'pointer', color: 'white' }}>
              <input type="checkbox" checked={enableClustering} onChange={(e) => setEnableClustering(e.target.checked)} /> 📍 Clustering
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', cursor: 'pointer', color: 'white' }}>
              <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} /> 🔄 Auto-refresh
            </label>
          </div>

          {/* Sliders */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ color: '#888', fontSize: '0.75rem', marginBottom: '4px' }}>Max Points: {maxPoints}</div>
            <input type="range" min="50" max="500" value={maxPoints} onChange={(e) => setMaxPoints(Number(e.target.value))} style={{ width: '100%' }} />
          </div>
          <div style={{ marginBottom: '12px' }}>
            <div style={{ color: '#888', fontSize: '0.75rem', marginBottom: '4px' }}>Point Size: {pointSize}</div>
            <input type="range" min="1" max="10" value={pointSize} onChange={(e) => setPointSize(Number(e.target.value))} style={{ width: '100%' }} />
          </div>
          {autoRefresh && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ color: '#888', fontSize: '0.75rem', marginBottom: '4px' }}>Refresh: {refreshInterval}s</div>
              <input type="range" min="30" max="300" value={refreshInterval} onChange={(e) => setRefreshInterval(Number(e.target.value))} style={{ width: '100%' }} />
            </div>
          )}
          <div style={{ color: '#666', fontSize: '0.7rem' }}>{searchFilteredEvents.length} events</div>
        </div>
      )}

      {/* Modal */}
      {selectedEvent && (
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'rgba(15,15,20,0.98)', borderRadius: '12px', padding: '24px', maxWidth: '450px', width: '90%', border: `2px solid ${categoryColors[selectedEvent.category]}`, zIndex: 200 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '2rem' }}>{categoryEmoji[selectedEvent.category]}</span>
            <button onClick={() => setSelectedEvent(null)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.5rem', cursor: 'pointer' }}>✕</button>
          </div>
          <h2 style={{ margin: '0 0 8px 0', color: 'white' }}>{selectedEvent.type}</h2>
          <div style={{ display: 'inline-block', background: categoryColors[selectedEvent.category], padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold', marginBottom: '12px' }}>{selectedEvent.category.toUpperCase()}</div>
          <div style={{ color: '#888', fontSize: '0.85rem', marginBottom: '12px' }}>{selectedEvent.date}</div>
          <div style={{ color: 'white', fontSize: '0.9rem', marginBottom: '12px' }}>{selectedEvent.description}</div>
          <div style={{ color: '#666', fontSize: '0.8rem' }}>📍 {selectedEvent.lat.toFixed(4)}, {selectedEvent.lon.toFixed(4)}</div>
          {selectedEvent.source && <div style={{ color: '#666', fontSize: '0.8rem', marginTop: '4px' }}>Source: {selectedEvent.source}</div>}
        </div>
      )}

      {loading && <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: 'white', fontSize: '1.5rem' }}>Loading...</div>}
    </div>
  );
}
