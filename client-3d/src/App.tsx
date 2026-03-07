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
  
  const [showArcs, setShowArcs] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showHexBin, setShowHexBin] = useState(false);
  const [showRings, setShowRings] = useState(false);
  const [showPolygons, setShowPolygons] = useState(false);
  const [showPaths, setShowPaths] = useState(false);
  
  const [enableClustering, setEnableClustering] = useState(true);
  const [showGraticules, setShowGraticules] = useState(false);
  const [showAtmosphere, setShowAtmosphere] = useState(true);
  const [showClouds, setShowClouds] = useState(false);
  const [globeRotation, setGlobeRotation] = useState(false);
  
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(60);
  const [maxPoints, setMaxPoints] = useState(200);
  
  const [selectedEvent, setSelectedEvent] = useState<ConflictEvent | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
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

  // Generate synthetic end points for arcs/paths visualization when data doesn't have them
  const eventsWithDestinations = useMemo(() => {
    return timelineEvents.map((e, idx) => {
      if (e.endLat !== undefined && e.endLon !== undefined) {
        return e;
      }
      // Generate random destination for demo (in real app, this would come from API)
      const destLat = e.lat + (Math.random() - 0.5) * 30;
      const destLon = e.lon + (Math.random() - 0.5) * 30;
      return { ...e, endLat: destLat, endLon: destLon };
    });
  }, [timelineEvents]);

  // Valid events for visualization (non-zero coordinates)
  const validEvents = useMemo(() => {
    return eventsWithDestinations.filter(e => e.lat !== 0 && e.lon !== 0 && !isNaN(e.lat) && !isNaN(e.lon));
  }, [eventsWithDestinations]);

  // Arcs
  const arcData = useMemo(() => {
    if (!showArcs) return [];
    return validEvents
      .filter(e => e.endLat !== undefined && e.endLat !== 0)
      .slice(0, 100)
      .map(e => ({
        startLat: e.lat,
        startLng: e.lon,
        endLat: e.endLat!,
        endLng: e.endLon!,
        color: categoryColors[e.category]
      }));
  }, [validEvents, showArcs]);

  // HexBin - aggregate points
  const hexBinPointsData = useMemo(() => {
    if (!showHexBin) return [];
    return validEvents;
  }, [validEvents, showHexBin]);

  // Rings
  const ringsData = useMemo(() => {
    if (!showRings) return [];
    return validEvents.slice(0, 300);
  }, [validEvents, showRings]);

  // Polygons - region aggregation
  const polygonsData = useMemo(() => {
    if (!showPolygons) return [];
    const regions: Record<string, any> = {};
    validEvents.forEach(e => {
      const latKey = Math.floor(e.lat / 10) * 10;
      const lonKey = Math.floor(e.lon / 10) * 10;
      const key = `${latKey}-${lonKey}`;
      if (!regions[key]) {
        regions[key] = { lat: latKey + 5, lng: lonKey + 5, points: [], count: 0 };
      }
      regions[key].points.push(e);
      regions[key].count++;
    });
    return Object.values(regions).filter((r: any) => r.count > 0);
  }, [validEvents, showPolygons]);

  // Paths
  const pathsData = useMemo(() => {
    if (!showPaths) return [];
    return validEvents
      .filter(e => e.endLat !== undefined && e.endLat !== 0)
      .slice(0, 50)
      .map(e => ({
        path: [[e.lat, e.lon], [e.endLat!, e.endLon!]],
        color: categoryColors[e.category]
      }));
  }, [validEvents, showPaths]);

  // Heatmap data
  const heatmapsData = useMemo(() => {
    if (!showHeatmap) return [];
    return [validEvents]; // Single heatmap dataset
  }, [validEvents, showHeatmap]);

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
        cloudsUrl={showClouds ? CLOUDS : undefined}
        cloudsOpacity={0.4}
        
        // Points (main visualization)
        pointsData={validEvents}
        pointLat={(d: any) => d.lat}
        pointLng={(d: any) => d.lon}
        pointColor={(d: any) => categoryColors[d.category] || '#ffff00'}
        pointAltitude={0.01}
        pointRadius={pointSize / 100}
        pointsMerge={enableClustering}
        pointResolution={pointPrecision}
        
        // HexBin
        hexBinPointsData={hexBinPointsData}
        hexBinPointWeight={1}
        hexBinResolution={2}
        hexBinPointLat={(d: any) => d.lat}
        hexBinPointLng={(d: any) => d.lon}
        hexBinColor={(d: any) => {
          const count = d.points.length;
          if (count > 30) return '#ff0000';
          if (count > 20) return '#ff4400';
          if (count > 10) return '#ff8800';
          if (count > 5) return '#ffcc00';
          return '#88ff00';
        }}
        
        // Rings
        ringsData={ringsData}
        ringLat={(d: any) => d.lat}
        ringLng={(d: any) => d.lng || d.lon}
        ringColor={(d: any) => categoryColors[d.category] || 'rgba(255,200,0,0.5)'}
        ringAltitude={0.005}
        ringRadius={0.3}
        ringResolution={16}
        
        // Polygons (from hexbin aggregation)
        polygonsData={polygonsData}
        polygonCapColor={(d: any) => {
          const count = d.count || d.points?.length || 0;
          const alpha = Math.min(0.8, count / 10);
          return `rgba(255, 100, 100, ${alpha})`;
        }}
        polygonSideColor={() => 'rgba(255,100,100,0.2)'}
        polygonStrokeColor={() => 'rgba(255,100,100,0.8)'}
        polygonAltitude={0.01}
        
        // Paths
        pathsData={pathsData}
        pathPoints={(d: any) => d.path}
        pathPointLat={(p: any) => p[0]}
        pathPointLng={(p: any) => p[1]}
        pathColor={(d: any) => d.color || 'rgba(255,255,255,0.5)'}
        pathStroke={1.5}
        pathDashLength={0.4}
        pathDashGap={0.2}
        pathDashAnimateTime={2000}
        
        // Arcs
        arcsData={arcData}
        arcStartLat={(d: any) => d.startLat}
        arcStartLng={(d: any) => d.startLng}
        arcEndLat={(d: any) => d.endLat}
        arcEndLng={(d: any) => d.endLng}
        arcColor={(d: any) => d.color}
        arcAltitude={0.2}
        arcStroke={1}
        arcDashLength={0.3}
        arcDashGap={0.2}
        arcDashAnimateTime={1500}
        
        // Heatmap
        heatmapsData={heatmapsData}
        heatmapPoints={(d: any) => d}
        heatmapPointLat={(p: any) => p.lat}
        heatmapPointLng={(p: any) => p.lon}
        heatmapPointWeight={1}
        heatmapBandwidth={2}
        
        // Labels
        labelsData={validEvents}
        labelLat={(d: any) => d.lat}
        labelLng={(d: any) => d.lng || d.lon}
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

      {hoverInfo && hoverInfo.object && (
        <div style={{
          position: 'absolute', bottom: '100px', left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.9)', borderRadius: '8px', padding: '12px 16px',
          color: 'white', fontSize: '0.85rem', maxWidth: '320px', zIndex: 150,
          border: `2px solid ${categoryColors[hoverInfo.object.category] || '#fff'}`
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '4px', fontSize: '1rem' }}>
            {categoryEmoji[hoverInfo.object.category]} {hoverInfo.object.type}
          </div>
          <div style={{ color: '#aaa', fontSize: '0.75rem', marginBottom: '6px' }}>
            {hoverInfo.object.date} • {hoverInfo.object.category}
          </div>
          {hoverInfo.object.description && (
            <div style={{ fontSize: '0.8rem', lineHeight: '1.4' }}>
              {hoverInfo.object.description.substring(0, 150)}
              {hoverInfo.object.description.length > 150 ? '...' : ''}
            </div>
          )}
          {hoverInfo.object.source && (
            <div style={{ marginTop: '8px', fontSize: '0.7rem', color: '#888' }}>
              📡 {hoverInfo.object.source}
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
            <p style={{ margin: 0, color: '#888', fontSize: '0.8rem' }}>{validEvents.length} events • {autoRefresh ? '🔄' : '⏸️'}</p>
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
          <span style={{ color: '#888', fontSize: '0.8rem' }}>{validEvents.length} events</span>
        </div>
        <input type="range" min="0" max="100" value={timelinePosition} onChange={(e) => setTimelinePosition(Number(e.target.value))} style={{ width: '100%', cursor: 'pointer' }} />
      </div>

      {/* Sidebar */}
      {showSidebar && (
        <div style={{ position: 'absolute', top: '80px', left: '16px', width: isMobile ? 'calc(100% - 32px)' : '320px', maxHeight: 'calc(100vh - 180px)', background: 'rgba(15,15,20,0.95)', borderRadius: '12px', padding: '16px', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.1)', zIndex: 100 }}>
          <div style={{ marginBottom: '16px' }}>
            <input type="text" placeholder="🔍 Search..." onChange={(e) => setSearchQuery(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: 'none', background: 'rgba(255,255,255,0.1)', color: 'white' }} />
          </div>

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

          <div style={{ marginBottom: '16px' }}>
            <div style={{ color: '#888', fontSize: '0.75rem', marginBottom: '8px' }}>VISUALIZATIONS</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'white' }}>
                <input type="checkbox" checked={showHexBin} onChange={(e) => setShowHexBin(e.target.checked)} /> ⬡ HexBins
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'white' }}>
                <input type="checkbox" checked={showRings} onChange={(e) => setShowRings(e.target.checked)} /> ⭕ Rings
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'white' }}>
                <input type="checkbox" checked={showPolygons} onChange={(e) => setShowPolygons(e.target.checked)} /> 🗺️ Polygons
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'white' }}>
                <input type="checkbox" checked={showHeatmap} onChange={(e) => setShowHeatmap(e.target.checked)} /> 🔥 Heatmap
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'white' }}>
                <input type="checkbox" checked={showArcs} onChange={(e) => setShowArcs(e.target.checked)} /> 🏹 Arcs (needs endLat/endLon)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'white' }}>
                <input type="checkbox" checked={showPaths} onChange={(e) => setShowPaths(e.target.checked)} /> 🛤️ Paths (needs endLat/endLon)
              </label>
            </div>
          </div>

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

          <div style={{ marginBottom: '16px' }}>
            <div style={{ color: '#888', fontSize: '0.75rem', marginBottom: '8px' }}>OPTIONS</div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', cursor: 'pointer', color: 'white' }}>
              <input type="checkbox" checked={enableClustering} onChange={(e) => setEnableClustering(e.target.checked)} /> 📍 Clustering
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', cursor: 'pointer', color: 'white' }}>
              <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} /> 🔄 Auto-refresh
            </label>
          </div>

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
          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #333' }}>
            <button onClick={() => {
              const blob = new Blob([JSON.stringify(selectedEvent, null, 2)], { type: "application/json" });
              saveAs(blob, `event-${selectedEvent.id}.json`);
            }} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', padding: '8px 16px', borderRadius: '4px', color: 'white', cursor: 'pointer' }}>
              💾 Export
            </button>
          </div>
        </div>
      )}

      {loading && <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: 'white', fontSize: '1.5rem' }}>Loading...</div>}
    </div>
  );
}
