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
  entities?: string[];
  relatedEvents?: string[];
  severity?: "low" | "medium" | "high" | "critical";
  country?: string;
  region?: string;
}

interface Workspace {
  id: string;
  name: string;
  createdAt: string;
  viewState: any;
  filters: Record<string, boolean>;
  layers: Record<string, boolean>;
  bookmarks: Bookmark[];
}

interface Bookmark {
  id: string;
  name: string;
  lat: number;
  lon: number;
  altitude: number;
  createdAt: string;
}

interface Alert {
  id: string;
  name: string;
  criteria: string;
  category?: string;
  region?: string;
  enabled: boolean;
}

interface PanelState {
  left: number;
  right: number;
  bottom: number;
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
const GLOBE_TERRAIN = '//unpkg.com/three-globe/example/img/earth-topology.png';
const GLOBE_NIGHT = '//unpkg.com/three-globe/example/img/night-sky.png';
const CLOUDS = '//unpkg.com/three-globe/example/img/earth-clouds.png';

const GLOBE_STYLES = {
  dark: GLOBE_DARK,
  light: GLOBE_LIGHT,
  satellite: '//unpkg.com/three-globe/example/img/earth-blue-marble.jpg',
  terrain: '//unpkg.com/three-globe/example/img/earth-dark.jpg'
};

const MAPBOX_TILES = {
  streets: 'https://api.mapbox.com/styles/v1/mapbox/streets-v11/tiles/{z}/{x}/{y}',
  satellite: 'https://api.mapbox.com/styles/v1/mapbox/satellite-v9/tiles/{z}/{x}/{y}',
  dark: 'https://api.mapbox.com/styles/v1/mapbox/dark-v10/tiles/{z}/{x}/{y}',
  light: 'https://api.mapbox.com/styles/v1/mapbox/light-v10/tiles/{z}/{x}/{y}'
};

const LOCATIONS = [
  { name: "Ukraine", lat: 48.3794, lon: 31.1656 },
  { name: "Gaza Strip", lat: 31.3547, lon: 34.3088 },
  { name: "Russia", lat: 55.7558, lon: 37.6173 },
  { name: "United States", lat: 38.8951, lon: -77.0364 },
  { name: "China", lat: 39.9042, lon: 116.4074 },
  { name: "Iran", lat: 35.6892, lon: 51.3890 },
  { name: "Israel", lat: 31.7683, lon: 35.2137 },
  { name: "North Korea", lat: 39.0392, lon: 125.7625 },
  { name: "South China Sea", lat: 16.0000, lon: 115.0000 },
  { name: "Taiwan Strait", lat: 24.0000, lon: 119.5000 },
  { name: "Mediterranean Sea", lat: 35.0000, lon: 18.0000 },
  { name: "Baltic Sea", lat: 55.0000, lon: 14.0000 },
  { name: "Persian Gulf", lat: 26.0000, lon: 52.0000 },
  { name: "Red Sea", lat: 20.0000, lon: 38.0000 },
];

const SEVERITY_COLORS: Record<string, string> = {
  low: "#27ae60",
  medium: "#f39c12",
  high: "#e67e22",
  critical: "#e74c3c"
};

export default function App() {
  const globeEl = useRef<any>(null);
  const socketRef = useRef<Socket | null>(null);
  
  const [events, setEvents] = useState<ConflictEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<typeof LOCATIONS>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
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
  const [maxPoints, setMaxPoints] = useState(500);
  
  const [selectedEvent, setSelectedEvent] = useState<ConflictEvent | null>(null);
  const [hoveredEvent, setHoveredEvent] = useState<ConflictEvent | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [globeTheme, setGlobeTheme] = useState<'dark' | 'light' | 'satellite' | 'terrain'>('dark');
  const [showTerrain, setShowTerrain] = useState(false);
  const [pointQuality, setPointQuality] = useState<'low' | 'medium' | 'high'>('medium');
  
  const [timelinePosition, setTimelinePosition] = useState(100);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [timeRange, setTimeRange] = useState<[Date, Date]>([
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    new Date()
  ]);
  
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showEntityGraph, setShowEntityGraph] = useState(false);
  const [showDataImport, setShowDataImport] = useState(false);
  const [showWorkspaces, setShowWorkspaces] = useState(false);
  
  const [filters, setFilters] = useState<Record<string, boolean>>({
    conflict: true, maritime: true, air: true, cyber: true,
    land: true, space: true, radio: true, weather: true,
    earthquakes: true, social: true
  });
  
  const [severityFilters, setSeverityFilters] = useState<Record<string, boolean>>({
    low: true, medium: true, high: true, critical: true
  });
  
  const [booleanFilter, setBooleanFilter] = useState<"AND" | "OR">("AND");
  const [customFilter, setCustomFilter] = useState("");
  
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<string | null>(null);
  
  const [panelState, setPanelState] = useState<PanelState>({
    left: 320,
    right: 400,
    bottom: 120
  });
  const [activeRightTab, setActiveRightTab] = useState<"details" | "analytics" | "entities" | "timeline">("details");
  const [activeLeftTab, setActiveLeftTab] = useState<"layers" | "categories" | "filters" | "import">("layers");
  
  const [showLeftPanel, setShowLeftPanel] = useState(true);
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [showBottomPanel, setShowBottomPanel] = useState(true);
  
  // Collaboration
  const [collaborators, setCollaborators] = useState<{id: string, name: string, color: string, lat: number, lng: number}[]>([]);
  const [showCollaborators, setShowCollaborators] = useState(false);
  const [username, setUsername] = useState(() => `User-${Math.random().toString(36).substr(2, 4)}`);
  const [collaborationRoom, setCollaborationRoom] = useState<string | null>(null);
  
  // Voice
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [transcript, setTranscript] = useState("");
  
  // Time Machine
  const [showTimeMachine, setShowTimeMachine] = useState(false);
  const [historicalDate, setHistoricalDate] = useState<Date>(new Date());
  const [timeLapseMode, setTimeLapseMode] = useState(false);
  
  // Report
  const [showReportPanel, setShowReportPanel] = useState(false);
  const [reportType, setReportType] = useState<"summary" | "detailed" | "analytics">("summary");
  
  // POI / Custom Markers
  const [pois, setPois] = useState<{id: string, name: string, lat: number, lon: number, type: string, notes: string}[]>([]);
  const [showPois, setShowPois] = useState(false);
  
  // Mapbox
  const [mapboxToken, setMapboxToken] = useState(() => localStorage.getItem('mapbox_token') || "");
  const [mapboxStyle, setMapboxStyle] = useState<keyof typeof MAPBOX_TILES>('dark');
  const [useMapbox, setUseMapbox] = useState(false);
  
  const tilesData = useMemo(() => {
    if (!useMapbox || !mapboxToken) return undefined;
    return [{
      url: MAPBOX_TILES[mapboxStyle].replace('api.mapbox.com', `api.mapbox.com/v4/${mapboxStyle}`) + `?access_token=${mapboxToken}`,
      maxZoom: 19
    }];
  }, [useMapbox, mapboxToken, mapboxStyle]);

  const loadData = useCallback(async () => {
    try {
      const res = await fetch('/api/conflicts');
      const data = await res.json();
      setEvents(data.events || []);
      checkAlerts(data.events || []);
    } catch (e) {
      console.error('Failed to load data:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const savedBookmarks = localStorage.getItem('conflictGlobe_bookmarks');
    if (savedBookmarks) setBookmarks(JSON.parse(savedBookmarks));
    const savedAlerts = localStorage.getItem('conflictGlobe_alerts');
    if (savedAlerts) setAlerts(JSON.parse(savedAlerts));
    const savedWorkspaces = localStorage.getItem('conflictGlobe_workspaces');
    if (savedWorkspaces) setWorkspaces(JSON.parse(savedWorkspaces));
  }, []);

  useEffect(() => {
    localStorage.setItem('conflictGlobe_bookmarks', JSON.stringify(bookmarks));
  }, [bookmarks]);

  useEffect(() => {
    localStorage.setItem('conflictGlobe_alerts', JSON.stringify(alerts));
  }, [alerts]);

  useEffect(() => {
    localStorage.setItem('conflictGlobe_workspaces', JSON.stringify(workspaces));
  }, [workspaces]);

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
    
    // Collaboration events
    socket.on('collab:update', (data: { collaborators: typeof collaborators }) => {
      setCollaborators(data.collaborators.filter((c: any) => c.id !== socket.id));
    });
    socket.on('collab:cursor', (data: { id: string, lat: number, lng: number }) => {
      setCollaborators(prev => prev.map(c => c.id === data.id ? { ...c, lat: data.lat, lng: data.lng } : c));
    });
    
    socketRef.current = socket;
    
    // Join collaboration room if set
    if (collaborationRoom) {
      socket.emit('collab:join', { room: collaborationRoom, username });
    }
    return () => { socket.disconnect(); };
  }, []);

  useEffect(() => {
    if (!isPlaying || !globeEl.current) return;
    const interval = setInterval(() => {
      setTimelinePosition(p => {
        if (p >= 100) {
          setIsPlaying(false);
          return 100;
        }
        return p + playbackSpeed;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed]);

  useEffect(() => {
    if (searchQuery.length > 0) {
      const q = searchQuery.toLowerCase();
      const results = LOCATIONS.filter(l => 
        l.name.toLowerCase().includes(q)
      ).slice(0, 5);
      setSearchResults(results);
      setShowSearchResults(results.length > 0);
    } else {
      setShowSearchResults(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'r' || e.key === 'R') loadData();
      if (e.key === 'h' || e.key === 'H') setGlobeTheme(t => t === 'dark' ? 'light' : 'dark');
      if (e.key === ' ') { e.preventDefault(); setIsPlaying(p => !p); }
      if (e.key === 'Escape') { setSelectedEvent(null); }
      if (e.key === '1') setShowLeftPanel(p => !p);
      if (e.key === '2') setShowRightPanel(p => !p);
      if (e.key === '3') setShowBottomPanel(p => !p);
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [loadData]);

  const checkAlerts = useCallback((currentEvents: ConflictEvent[]) => {
    alerts.filter(a => a.enabled).forEach(alert => {
      const matches = currentEvents.filter(e => {
        if (alert.category && e.category !== alert.category) return false;
        if (alert.region && !e.description?.toLowerCase().includes(alert.region.toLowerCase())) return false;
        return true;
      });
      if (matches.length > 0 && Notification.permission === "granted") {
        new Notification(`Conflict Globe Alert: ${alert.name}`, {
          body: `${matches.length} events match criteria: ${alert.criteria}`,
        });
      }
    });
  }, [alerts]);

  const focusLocation = useCallback((lat: number, lon: number, altitude = 1.5) => {
    if (globeEl.current) {
      globeEl.current.pointOfView({ lat, lng: lon, altitude }, 1000);
    }
  }, []);

  const handleSearchSelect = (location: typeof LOCATIONS[0]) => {
    focusLocation(location.lat, location.lon, 2);
    setSearchQuery(location.name);
    setShowSearchResults(false);
  };

  // Collaboration functions
  const joinCollaboration = (room: string) => {
    setCollaborationRoom(room);
    socketRef.current?.emit('collab:join', { room, username });
  };

  const leaveCollaboration = () => {
    socketRef.current?.emit('collab:leave');
    setCollaborationRoom(null);
    setCollaborators([]);
  };

  // Voice commands
  useEffect(() => {
    if (!voiceEnabled) return;
    
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Voice recognition not supported in this browser');
      setVoiceEnabled(false);
      return;
    }
    
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0].transcript)
        .join('');
      setTranscript(transcript);
      
      // Parse voice commands
      const lower = transcript.toLowerCase();
      if (lower.includes('go to') || lower.includes('fly to')) {
        const loc = LOCATIONS.find(l => lower.includes(l.name.toLowerCase()));
        if (loc) focusLocation(loc.lat, loc.lon, 2);
      }
      if (lower.includes('zoom in')) {
        const pov = globeEl.current?.pointOfView();
        if (pov) globeEl.current.pointOfView({ ...pov, altitude: pov.altitude * 0.5 }, 500);
      }
      if (lower.includes('zoom out')) {
        const pov = globeEl.current?.pointOfView();
        if (pov) globeEl.current.pointOfView({ ...pov, altitude: pov.altitude * 2 }, 500);
      }
      if (lower.includes('refresh') || lower.includes('reload')) {
        loadData();
      }
      if (lower.includes('dark mode')) {
        setGlobeTheme('dark');
      }
      if (lower.includes('light mode')) {
        setGlobeTheme('light');
      }
    };
    
    recognition.start();
    return () => recognition.stop();
  }, [voiceEnabled, loadData]);

  // Track cursor for collaboration
  const handleGlobeMove = useCallback(() => {
    if (!globeEl.current || !collaborationRoom) return;
    const pov = globeEl.current.pointOfView();
    if (pov) {
      socketRef.current?.emit('collab:cursor', {
        lat: pov.lat || 0,
        lng: pov.lng || 0
      });
    }
  }, [collaborationRoom]);

  // Generate report
  const generateReport = () => {
    const date = new Date().toISOString().split('T')[0];
    let content = '';
    
    if (reportType === 'summary') {
      content = `
# Conflict Globe - Summary Report
Generated: ${date}
Total Events: ${validEvents.length}

## By Category
${Object.entries(analytics.byCategory).map(([cat, count]) => `- ${cat}: ${count}`).join('\n')}

## By Severity  
${Object.entries(analytics.bySeverity).map(([sev, count]) => `- ${sev}: ${count}`).join('\n')}
`;
    } else if (reportType === 'detailed') {
      content = `# Conflict Globe - Detailed Report
Generated: ${date}

${validEvents.map(e => `## ${e.type}
- Category: ${e.category}
- Severity: ${e.severity || 'N/A'}
- Date: ${e.date}
- Location: ${e.lat}, ${e.lon}
- Description: ${e.description}
- Source: ${e.source}
`).join('\n')}
`;
    } else {
      content = `# Conflict Globe - Analytics Report
Generated: ${date}

## Statistics
- Total Events: ${validEvents.length}
- Average Per Day: ${analytics.avgPerDay}

## Category Distribution
${Object.entries(analytics.byCategory).map(([cat, count]) => `${cat}: ${count} (${((count/validEvents.length)*100).toFixed(1)}%)`).join('\n')}
`;
    }
    
    const blob = new Blob([content], { type: 'text/markdown' });
    saveAs(blob, `conflict-report-${reportType}-${date}.md`);
  };

  const filteredEvents = useMemo(() => {
    let result = events.filter(event => {
      const categoryMatch = filters[event.category];
      const severityMatch = severityFilters[event.severity || 'medium'];
      return categoryMatch && severityMatch;
    });
    
    if (customFilter) {
      try {
        result = result.filter(e => {
          const evalContext = {
            category: e.category,
            type: e.type,
            severity: e.severity,
            source: e.source,
            description: e.description?.toLowerCase() || '',
            lat: e.lat,
            lon: e.lon
          };
          const keys = Object.keys(evalContext);
          const values = Object.values(evalContext);
          const filterFunc = new Function(...keys, `return ${customFilter}`);
          return filterFunc(...values);
        });
      } catch (e) {
        console.error('Filter error:', e);
      }
    }
    
    result = result.filter(e => {
      const eventDate = new Date(e.date);
      return eventDate >= timeRange[0] && eventDate <= timeRange[1];
    });
    
    return result.slice(0, maxPoints);
  }, [events, filters, severityFilters, customFilter, timeRange, maxPoints]);

  const searchFilteredEvents = useMemo(() => {
    if (!searchQuery) return filteredEvents;
    const q = searchQuery.toLowerCase();
    return filteredEvents.filter(e => 
      e.description?.toLowerCase().includes(q) ||
      e.type?.toLowerCase().includes(q) ||
      e.category?.toLowerCase().includes(q) ||
      e.source?.toLowerCase().includes(q)
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

  const eventsWithDestinations = useMemo(() => {
    return timelineEvents.map((e) => {
      if (e.endLat !== undefined && e.endLon !== undefined) return e;
      return { ...e, endLat: e.lat, endLon: e.lon };
    });
  }, [timelineEvents]);

  const validEvents = useMemo(() => {
    return eventsWithDestinations.filter(e => e.lat !== 0 && e.lon !== 0 && !isNaN(e.lat) && !isNaN(e.lon));
  }, [eventsWithDestinations]);

  const arcData = useMemo(() => {
    if (!showArcs) return [];
    return validEvents.filter(e => e.endLat !== 0).slice(0, 100).map(e => ({
      startLat: e.lat, startLng: e.lon, endLat: e.endLat!, endLng: e.endLon!, color: categoryColors[e.category]
    }));
  }, [validEvents, showArcs]);

  const hexBinPointsData = useMemo(() => showHexBin ? validEvents : [], [validEvents, showHexBin]);
  const ringsData = useMemo(() => showRings ? validEvents.slice(0, 300) : [], [validEvents, showRings]);

  const polygonsData = useMemo(() => {
    if (!showPolygons) return [];
    const regions: Record<string, any> = {};
    validEvents.forEach(e => {
      const latKey = Math.floor(e.lat / 10) * 10;
      const lonKey = Math.floor(e.lon / 10) * 10;
      const key = `${latKey}-${lonKey}`;
      if (!regions[key]) regions[key] = { lat: latKey + 5, lng: lonKey + 5, points: [], count: 0 };
      regions[key].points.push(e);
      regions[key].count++;
    });
    return Object.values(regions).filter((r: any) => r.count > 0);
  }, [validEvents, showPolygons]);

  const pathsData = useMemo(() => {
    if (!showPaths) return [];
    return validEvents.filter(e => e.endLat !== 0).slice(0, 50).map(e => ({
      path: [[e.lat, e.lon], [e.endLat!, e.endLon!]], color: categoryColors[e.category]
    }));
  }, [validEvents, showPaths]);

  const heatmapsData = useMemo(() => showHeatmap ? [validEvents] : [], [validEvents, showHeatmap]);

  const bgColor = globeTheme === 'dark' ? '#0a0a14' : '#f0f0f0';

  const analytics = useMemo(() => {
    const byCategory: Record<string, number> = {};
    const bySource: Record<string, number> = {};
    const bySeverity: Record<string, number> = { low: 0, medium: 0, high: 0, critical: 0 };
    const byDay: Record<string, number> = {};
    
    validEvents.forEach(e => {
      byCategory[e.category] = (byCategory[e.category] || 0) + 1;
      bySource[e.source || 'unknown'] = (bySource[e.source || 'unknown'] || 0) + 1;
      bySeverity[e.severity || 'medium']++;
      const day = new Date(e.date).toISOString().split('T')[0];
      byDay[day] = (byDay[day] || 0) + 1;
    });
    
    return { 
      byCategory, 
      bySource, 
      bySeverity, 
      byDay,
      total: validEvents.length,
      avgPerDay: Object.keys(byDay).length > 0 ? (validEvents.length / Object.keys(byDay).length).toFixed(1) : 0
    };
  }, [validEvents]);

  const entityGraph = useMemo(() => {
    const nodes: any[] = [];
    const links: any[] = [];
    const entitySet = new Set<string>();
    
    validEvents.forEach(e => {
      if (e.entities) {
        e.entities.forEach(ent => {
          if (!entitySet.has(ent)) {
            entitySet.add(ent);
            nodes.push({ id: ent, type: 'entity', events: 1 });
          } else {
            const node = nodes.find(n => n.id === ent);
            if (node) node.events++;
          }
        });
        
        if (e.entities.length > 1) {
          for (let i = 0; i < e.entities.length - 1; i++) {
            links.push({ source: e.entities[i], target: e.entities[i + 1], value: 1 });
          }
        }
      }
      
      if (e.category && !entitySet.has(e.category)) {
        entitySet.add(e.category);
        nodes.push({ id: e.category, type: 'category' });
      }
    });
    
    return { nodes: nodes.slice(0, 50), links: links.slice(0, 100) };
  }, [validEvents]);

  const handlePointClick = useCallback((point: any) => {
    if (point && point.id) {
      setSelectedEvent(point);
      setActiveRightTab("details");
    }
  }, []);

  const handleHover = useCallback((hoverObj: any) => {
    if (hoverObj && hoverObj.type === 'hover' && hoverObj.object) {
      setHoveredEvent(hoverObj.object);
    } else {
      setHoveredEvent(null);
    }
  }, []);

  const saveWorkspace = () => {
    const name = prompt('Workspace name:');
    if (name) {
      const workspace: Workspace = {
        id: Date.now().toString(),
        name,
        createdAt: new Date().toISOString(),
        viewState: globeEl.current?.pointOfView(),
        filters,
        layers: { showArcs, showHeatmap, showHexBin, showRings, showPolygons, showPaths },
        bookmarks
      };
      setWorkspaces([...workspaces, workspace]);
      setCurrentWorkspace(workspace.id);
    }
  };

  const loadWorkspace = (id: string) => {
    const ws = workspaces.find(w => w.id === id);
    if (ws) {
      setFilters(ws.filters);
      setShowArcs(ws.layers.showArcs);
      setShowHeatmap(ws.layers.showHeatmap);
      setShowHexBin(ws.layers.showHexBin);
      setShowRings(ws.layers.showRings);
      setShowPolygons(ws.layers.showPolygons);
      setShowPaths(ws.layers.showPaths);
      setBookmarks(ws.bookmarks);
      setCurrentWorkspace(ws.id);
      if (ws.viewState && globeEl.current) {
        globeEl.current.pointOfView(ws.viewState, 1000);
      }
    }
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        let importedEvents: ConflictEvent[] = [];
        
        if (file.name.endsWith('.json') || file.name.endsWith('.geojson')) {
          const data = JSON.parse(event.target?.result as string);
          if (data.features) {
            importedEvents = data.features.map((f: any) => ({
              id: f.id || Date.now().toString(),
              lat: f.geometry.coordinates[1],
              lon: f.geometry.coordinates[0],
              date: f.properties?.date || new Date().toISOString(),
              type: f.properties?.type || 'Imported',
              description: f.properties?.description || '',
              source: 'Import',
              category: f.properties?.category || 'conflict'
            }));
          } else if (Array.isArray(data)) {
            importedEvents = data;
          }
        } else if (file.name.endsWith('.csv')) {
          const lines = (event.target?.result as string).split('\n');
          const headers = lines[0].split(',');
          for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',');
            if (values.length >= 3) {
              importedEvents.push({
                id: Date.now().toString() + i,
                lat: parseFloat(values[0]),
                lon: parseFloat(values[1]),
                date: values[2] || new Date().toISOString(),
                type: values[3] || 'Imported',
                description: values[4] || '',
                source: 'CSV Import',
                category: values[5] || 'conflict'
              });
            }
          }
        }
        
        setEvents([...events, ...importedEvents]);
        alert(`Imported ${importedEvents.length} events`);
      } catch (err) {
        alert('Failed to import file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const exportKML = () => {
    let kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
<Document>
  <name>Conflict Globe Export</name>`;
    
    validEvents.forEach(e => {
      kml += `
  <Placemark>
    <name>${e.type}</name>
    <description><![CDATA[${e.description || ''}]]></description>
    <Point>
      <coordinates>${e.lon},${e.lat},0</coordinates>
    </Point>
    <Style>
      <IconStyle>
        <color>${categoryColors[e.category]?.replace('#', '')}</color>
      </IconStyle>
    </Style>
  </Placemark>`;
    });
    
    kml += `
</Document>
</kml>`;
    
    const blob = new Blob([kml], { type: 'application/vnd.google-earth.kml+xml' });
    saveAs(blob, 'conflict-globe.kml');
  };

  const exportGeoJSON = () => {
    const geojson = {
      type: 'FeatureCollection',
      features: validEvents.map(e => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [e.lon, e.lat] },
        properties: { ...e }
      }))
    };
    const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/geo+json' });
    saveAs(blob, 'conflict-globe.geojson');
  };

  useEffect(() => {
    if (selectedEvent && globeEl.current && selectedEvent.lat !== 0) {
      globeEl.current.pointOfView({
        lat: selectedEvent.lat,
        lng: selectedEvent.lon,
        altitude: 1.5
      }, 1000);
    }
  }, [selectedEvent]);

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

  const bgStyle: React.CSSProperties = {
    width: "100vw",
    height: "100vh",
    background: bgColor,
    position: 'relative',
    overflow: 'hidden',
    display: 'flex'
  };

  return (
    <div style={bgStyle}>
      {showLeftPanel && (
        <div style={{
          width: panelState.left,
          minWidth: 280,
          maxWidth: 500,
          background: 'rgba(8, 8, 20, 0.97)',
          borderRight: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 50
        }}>
          <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            background: 'linear-gradient(135deg, rgba(30, 30, 60, 0.8), rgba(20, 20, 40, 0.9))'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <span style={{ fontSize: '1.4rem' }}>⚔️</span>
              <h1 style={{ margin: 0, fontSize: '1.1rem', color: 'white', fontWeight: 700, letterSpacing: '1px' }}>
                CONFLICT GLOBE
              </h1>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.7rem', color: '#666' }}>
              <span style={{ color: '#4a9' }}>●</span> LIVE
              <span style={{ color: '#888' }}>•</span>
              {validEvents.length} EVENTS
              <span style={{ color: '#888' }}>•</span>
              {currentWorkspace ? '📁 Workspace' : 'No workspace'}
            </div>
          </div>

          <div style={{
            display: 'flex',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(0,0,0,0.3)'
          }}>
            {(['layers', 'categories', 'filters', 'import'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveLeftTab(tab)} style={{
                flex: 1,
                background: activeLeftTab === tab ? 'rgba(52, 152, 219, 0.3)' : 'transparent',
                border: 'none',
                padding: '10px 8px',
                color: activeLeftTab === tab ? '#3498db' : '#666',
                cursor: 'pointer',
                fontSize: '0.65rem',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                borderBottom: activeLeftTab === tab ? '2px solid #3498db' : '2px solid transparent',
                transition: 'all 0.2s'
              }}>
                {tab === 'layers' && '📊'}
                {tab === 'categories' && '🏷️'}
                {tab === 'filters' && '🔍'}
                {tab === 'import' && '📥'}
                <div style={{ marginTop: '2px' }}>{tab}</div>
              </button>
            ))}
          </div>

          <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
            {activeLeftTab === 'layers' && (
              <>
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ color: '#3498db', fontSize: '0.65rem', marginBottom: '10px', letterSpacing: '1px' }}>GLOBE STYLE</div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
                    {(['dark', 'light', 'satellite', 'terrain'] as const).map(style => (
                      <button key={style} onClick={() => setGlobeTheme(style)}
                        style={{
                          background: globeTheme === style ? 'rgba(52, 152, 219, 0.5)' : 'rgba(255,255,255,0.1)',
                          border: 'none',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          color: 'white',
                          cursor: 'pointer',
                          fontSize: '0.7rem',
                          textTransform: 'capitalize'
                        }}>
                        {style === 'dark' && '🌙'}
                        {style === 'light' && '☀️'}
                        {style === 'satellite' && '🛰️'}
                        {style === 'terrain' && '🏔️'}
                        {' '}{style}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {[
                      { checked: showAtmosphere, set: setShowAtmosphere, icon: '🌫️', label: 'Atmosphere' },
                      { checked: showGraticules, set: setShowGraticules, icon: '🌍', label: 'Grid Lines' },
                      { checked: showClouds, set: setShowClouds, icon: '☁️', label: 'Clouds' },
                      { checked: globeRotation, set: setGlobeRotation, icon: '🔄', label: 'Auto Rotate' },
                      { checked: showTerrain, set: setShowTerrain, icon: '🏔️', label: '3D Terrain' }
                    ].map((item, i) => (
                      <label key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', color: '#aaa', fontSize: '0.85rem' }}>
                        <input type="checkbox" checked={item.checked} onChange={(e) => item.set(e.target.checked)} />
                        <span>{item.icon} {item.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <div style={{ color: '#e67e22', fontSize: '0.65rem', marginBottom: '10px', letterSpacing: '1px' }}>MAPBOX TILES</div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', color: '#aaa', fontSize: '0.85rem', marginBottom: '10px' }}>
                    <input 
                      type="checkbox" 
                      checked={useMapbox} 
                      onChange={(e) => {
                        setUseMapbox(e.target.checked);
                        if (e.target.checked && mapboxToken) {
                          localStorage.setItem('mapbox_token', mapboxToken);
                        }
                      }} 
                    />
                    <span>🗺️ Enable Mapbox</span>
                  </label>
                  {useMapbox && (
                    <>
                      <input
                        type="password"
                        placeholder="Mapbox Access Token"
                        value={mapboxToken}
                        onChange={(e) => setMapboxToken(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px',
                          background: 'rgba(255,255,255,0.1)',
                          border: '1px solid rgba(255,255,255,0.2)',
                          borderRadius: '6px',
                          color: 'white',
                          fontSize: '0.75rem',
                          marginBottom: '8px'
                        }}
                      />
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {Object.keys(MAPBOX_TILES).map(style => (
                          <button key={style} onClick={() => setMapboxStyle(style as keyof typeof MAPBOX_TILES)}
                            style={{
                              background: mapboxStyle === style ? '#e67e22' : 'rgba(255,255,255,0.1)',
                              border: 'none',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              color: 'white',
                              cursor: 'pointer',
                              fontSize: '0.65rem',
                              textTransform: 'capitalize'
                            }}>
                            {style}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <div style={{ color: '#9b59b6', fontSize: '0.65rem', marginBottom: '10px', letterSpacing: '1px' }}>DATA LAYERS</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {[
                      { checked: showHexBin, set: setShowHexBin, icon: '⬡', label: 'Heat Clusters' },
                      { checked: showRings, set: setShowRings, icon: '⭕', label: 'Pulse Rings' },
                      { checked: showPolygons, set: setShowPolygons, icon: '🗺️', label: 'Regions' },
                      { checked: showHeatmap, set: setShowHeatmap, icon: '🔥', label: 'Density Map' },
                      { checked: showArcs, set: setShowArcs, icon: '🏹', label: 'Connections' },
                      { checked: showPaths, set: setShowPaths, icon: '🛤️', label: 'Movement' }
                    ].map((item, i) => (
                      <label key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', color: '#aaa', fontSize: '0.85rem' }}>
                        <input type="checkbox" checked={item.checked} onChange={(e) => item.set(e.target.checked)} />
                        <span>{item.icon} {item.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <div style={{ color: '#e67e22', fontSize: '0.65rem', marginBottom: '8px', letterSpacing: '1px' }}>PERFORMANCE</div>
                  <div style={{ marginBottom: '8px' }}>
                    <div style={{ color: '#666', fontSize: '0.65rem', marginBottom: '4px' }}>QUALITY: {pointQuality.toUpperCase()}</div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {(['low', 'medium', 'high'] as const).map(q => (
                        <button key={q} onClick={() => setPointQuality(q)}
                          style={{
                            flex: 1,
                            background: pointQuality === q ? '#e67e22' : 'rgba(255,255,255,0.1)',
                            border: 'none',
                            padding: '4px',
                            borderRadius: '4px',
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: '0.65rem',
                            textTransform: 'uppercase'
                          }}>
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <div style={{ color: '#666', fontSize: '0.65rem', marginBottom: '4px' }}>MAX POINTS: {maxPoints}</div>
                    <input type="range" min="50" max="2000" value={maxPoints} onChange={(e) => setMaxPoints(Number(e.target.value))} style={{ width: '100%' }} />
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <div style={{ color: '#666', fontSize: '0.65rem', marginBottom: '4px' }}>POINT SIZE: {pointSize}</div>
                    <input type="range" min="1" max="10" value={pointSize} onChange={(e) => setPointSize(Number(e.target.value))} style={{ width: '100%' }} />
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#aaa', fontSize: '0.8rem', marginTop: '8px' }}>
                    <input type="checkbox" checked={enableClustering} onChange={(e) => setEnableClustering(e.target.checked)} />
                    <span>🚀 Point Clustering</span>
                  </label>
                </div>
              </>
            )}

            {activeLeftTab === 'categories' && (
              <div style={{ marginBottom: '20px' }}>
                <div style={{ color: '#888', fontSize: '0.65rem', marginBottom: '10px', letterSpacing: '1px' }}>CATEGORIES</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {Object.keys(filters).map(cat => (
                    <button key={cat} onClick={() => setFilters(f => ({ ...f, [cat]: !f[cat] }))} 
                      style={{ 
                        background: filters[cat] ? categoryColors[cat] : 'rgba(255,255,255,0.1)', 
                        border: 'none', 
                        padding: '6px 10px', 
                        borderRadius: '12px', 
                        color: 'white', 
                        fontSize: '0.7rem', 
                        cursor: 'pointer', 
                        opacity: filters[cat] ? 1 : 0.4 
                      }}>
                      {categoryEmoji[cat]} {cat}
                    </button>
                  ))}
                </div>
                
                <div style={{ color: '#888', fontSize: '0.65rem', marginBottom: '10px', marginTop: '20px', letterSpacing: '1px' }}>SEVERITY</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {Object.keys(severityFilters).map(sev => (
                    <button key={sev} onClick={() => setSeverityFilters(f => ({ ...f, [sev]: !f[sev] }))} 
                      style={{ 
                        background: severityFilters[sev] ? SEVERITY_COLORS[sev] : 'rgba(255,255,255,0.1)', 
                        border: 'none', 
                        padding: '6px 10px', 
                        borderRadius: '12px', 
                        color: 'white', 
                        fontSize: '0.7rem', 
                        cursor: 'pointer', 
                        opacity: severityFilters[sev] ? 1 : 0.4,
                        textTransform: 'uppercase'
                      }}>
                      {sev}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeLeftTab === 'filters' && (
              <div>
                <div style={{ color: '#888', fontSize: '0.65rem', marginBottom: '10px', letterSpacing: '1px' }}>BOOLEAN FILTER</div>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                  {(['AND', 'OR'] as const).map(op => (
                    <button key={op} onClick={() => setBooleanFilter(op)}
                      style={{
                        flex: 1,
                        background: booleanFilter === op ? '#3498db' : 'rgba(255,255,255,0.1)',
                        border: 'none',
                        padding: '8px',
                        borderRadius: '6px',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '0.8rem'
                      }}>
                      {op}
                    </button>
                  ))}
                </div>
                
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ color: '#888', fontSize: '0.65rem', marginBottom: '8px' }}>CUSTOM FILTER (JS)</div>
                  <textarea
                    value={customFilter}
                    onChange={(e) => setCustomFilter(e.target.value)}
                    placeholder="e.g., description.includes('military') && severity === 'high'"
                    style={{
                      width: '100%',
                      height: '80px',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '6px',
                      color: '#aaa',
                      fontSize: '0.75rem',
                      padding: '8px',
                      fontFamily: 'monospace'
                    }}
                  />
                </div>
                
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ color: '#888', fontSize: '0.65rem', marginBottom: '8px' }}>TIME RANGE</div>
                  <input
                    type="date"
                    value={timeRange[0].toISOString().split('T')[0]}
                    onChange={(e) => setTimeRange([new Date(e.target.value), timeRange[1]])}
                    style={{
                      width: '100%',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '6px',
                      color: '#aaa',
                      fontSize: '0.8rem',
                      padding: '6px',
                      marginBottom: '8px'
                    }}
                  />
                  <input
                    type="date"
                    value={timeRange[1].toISOString().split('T')[0]}
                    onChange={(e) => setTimeRange([timeRange[0], new Date(e.target.value)])}
                    style={{
                      width: '100%',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '6px',
                      color: '#aaa',
                      fontSize: '0.8rem',
                      padding: '6px'
                    }}
                  />
                </div>
              </div>
            )}

            {activeLeftTab === 'import' && (
              <div>
                <div style={{ color: '#888', fontSize: '0.65rem', marginBottom: '10px', letterSpacing: '1px' }}>DATA IMPORT</div>
                <label style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '30px',
                  border: '2px dashed rgba(255,255,255,0.2)',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  marginBottom: '16px'
                }}>
                  <input type="file" accept=".json,.geojson,.csv,.kml" onChange={handleFileImport} style={{ display: 'none' }} />
                  <span style={{ fontSize: '2rem', marginBottom: '8px' }}>📁</span>
                  <span style={{ color: '#888', fontSize: '0.8rem' }}>Click to import</span>
                  <span style={{ color: '#666', fontSize: '0.7rem' }}>JSON, GeoJSON, CSV, KML</span>
                </label>
                
                <div style={{ color: '#888', fontSize: '0.65rem', marginBottom: '10px', letterSpacing: '1px', marginTop: '20px' }}>WORKSPACES</div>
                <button onClick={saveWorkspace} style={{
                  width: '100%',
                  background: '#27ae60',
                  border: 'none',
                  padding: '10px',
                  borderRadius: '6px',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  marginBottom: '12px'
                }}>
                  💾 Save Workspace
                </button>
                
                {workspaces.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {workspaces.map(ws => (
                      <div key={ws.id} onClick={() => loadWorkspace(ws.id)} style={{
                        background: currentWorkspace === ws.id ? 'rgba(52, 152, 219, 0.3)' : 'rgba(255,255,255,0.05)',
                        padding: '10px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <span style={{ color: 'white', fontSize: '0.8rem' }}>{ws.name}</span>
                        <span style={{ color: '#666', fontSize: '0.65rem' }}>{ws.createdAt.split('T')[0]}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column' }}>
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          padding: '12px 20px',
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.8), transparent)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 40
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button onClick={() => setShowLeftPanel(p => !p)} style={{
              background: showLeftPanel ? 'rgba(52, 152, 219, 0.5)' : 'rgba(255,255,255,0.1)',
              border: 'none', borderRadius: '4px', padding: '6px 10px', color: 'white', cursor: 'pointer', fontSize: '0.8rem'
            }}>
              ☰ [{showLeftPanel ? '1' : ''}]
            </button>
            <button onClick={() => setShowRightPanel(p => !p)} style={{
              background: showRightPanel ? 'rgba(52, 152, 219, 0.5)' : 'rgba(255,255,255,0.1)',
              border: 'none', borderRadius: '4px', padding: '6px 10px', color: 'white', cursor: 'pointer', fontSize: '0.8rem'
            }}>
              ◫ [{showRightPanel ? '2' : ''}]
            </button>
            <button onClick={() => setShowBottomPanel(p => !p)} style={{
              background: showBottomPanel ? 'rgba(52, 152, 219, 0.5)' : 'rgba(255,255,255,0.1)',
              border: 'none', borderRadius: '4px', padding: '6px 10px', color: 'white', cursor: 'pointer', fontSize: '0.8rem'
            }}>
              ▾ [{showBottomPanel ? '3' : ''}]
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, maxWidth: '500px', margin: '0 20px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <input 
                type="text" 
                placeholder="🔍 Search locations, events..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchQuery && setShowSearchResults(true)}
                onBlur={() => setTimeout(() => setShowSearchResults(false), 200)}
                style={{ 
                  width: '100%', 
                  padding: '8px 14px', 
                  borderRadius: '6px', 
                  border: '1px solid rgba(255,255,255,0.15)', 
                  background: 'rgba(0,0,0,0.5)', 
                  color: 'white', 
                  fontSize: '0.85rem',
                  backdropFilter: 'blur(10px)'
                }} 
              />
              {showSearchResults && (
                <div style={{ 
                  position: 'absolute', 
                  top: '100%', 
                  left: 0, 
                  right: 0, 
                  background: 'rgba(20,20,30,0.98)', 
                  borderRadius: '8px', 
                  marginTop: '4px', 
                  overflow: 'hidden', 
                  border: '1px solid rgba(255,255,255,0.1)', 
                  zIndex: 200 
                }}>
                  {searchResults.map((loc, i) => (
                    <div key={i} onClick={() => handleSearchSelect(loc)} style={{ padding: '10px 14px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'white', fontSize: '0.85rem' }}>{loc.name}</span>
                      <span style={{ color: '#666', fontSize: '0.7rem' }}>{loc.lat.toFixed(2)}, {loc.lon.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            <button onClick={loadData} style={{ 
              background: 'rgba(255,255,255,0.1)', 
              border: 'none', borderRadius: '4px', padding: '6px 10px', color: 'white', cursor: 'pointer',
              fontSize: '0.8rem'
            }}>
              🔄
            </button>
            <button onClick={() => setGlobeTheme(t => t === 'dark' ? 'light' : 'dark')} style={{ 
              background: 'rgba(255,255,255,0.1)', 
              border: 'none', borderRadius: '4px', padding: '6px 10px', color: 'white', cursor: 'pointer',
              fontSize: '0.8rem'
            }}>
              {globeTheme === 'dark' ? '☀️' : '🌙'}
            </button>
            <button onClick={() => setShowAnalytics(p => !p)} style={{ 
              background: showAnalytics ? '#9b59b6' : 'rgba(255,255,255,0.1)', 
              border: 'none', borderRadius: '4px', padding: '6px 10px', color: 'white', cursor: 'pointer',
              fontSize: '0.8rem'
            }}>
              📈
            </button>
            <button onClick={() => setShowEntityGraph(p => !p)} style={{ 
              background: showEntityGraph ? '#e74c3c' : 'rgba(255,255,255,0.1)', 
              border: 'none', borderRadius: '4px', padding: '6px 10px', color: 'white', cursor: 'pointer',
              fontSize: '0.8rem'
            }}>
              🔗
            </button>
            <button onClick={() => setShowTimeMachine(p => !p)} style={{ 
              background: showTimeMachine ? '#f39c12' : 'rgba(255,255,255,0.1)', 
              border: 'none', borderRadius: '4px', padding: '6px 10px', color: 'white', cursor: 'pointer',
              fontSize: '0.8rem'
            }}>
              ⏰
            </button>
            <button onClick={() => setVoiceEnabled(v => !v)} style={{ 
              background: voiceEnabled ? '#27ae60' : 'rgba(255,255,255,0.1)', 
              border: 'none', borderRadius: '4px', padding: '6px 10px', color: 'white', cursor: 'pointer',
              fontSize: '0.8rem'
            }}>
              🎤
            </button>
            <button onClick={() => setShowPois(p => !p)} style={{ 
              background: showPois ? '#e67e22' : 'rgba(255,255,255,0.1)', 
              border: 'none', borderRadius: '4px', padding: '6px 10px', color: 'white', cursor: 'pointer',
              fontSize: '0.8rem'
            }}>
              📍
            </button>
            <button onClick={() => setShowCollaborators(p => !p)} style={{ 
              background: showCollaborators ? '#3498db' : 'rgba(255,255,255,0.1)', 
              border: 'none', borderRadius: '4px', padding: '6px 10px', color: 'white', cursor: 'pointer',
              fontSize: '0.8rem'
            }}>
              👥
            </button>
            <button onClick={() => setShowReportPanel(p => !p)} style={{ 
              background: showReportPanel ? '#8e44ad' : 'rgba(255,255,255,0.1)', 
              border: 'none', borderRadius: '4px', padding: '6px 10px', color: 'white', cursor: 'pointer',
              fontSize: '0.8rem'
            }}>
              📄
            </button>
            <button onClick={() => {
              const state = { theme: globeTheme, filters, view: globeEl.current?.pointOfView() };
              navigator.clipboard.writeText(`${window.location.origin}?s=${btoa(JSON.stringify(state))}`);
              alert('Share URL copied!');
            }} style={{ 
              background: 'rgba(255,255,255,0.1)', 
              border: 'none', borderRadius: '4px', padding: '6px 10px', color: 'white', cursor: 'pointer',
              fontSize: '0.8rem'
            }}>
              📤
            </button>
          </div>
        </div>

        <div style={{ flex: 1, position: 'relative' }}>
          {(() => {
            const GlobeAny = Globe as any;
            return <GlobeAny
              ref={globeEl}
            globeImageUrl={GLOBE_STYLES[globeTheme] || GLOBE_DARK}
            backgroundImageUrl={globeTheme === 'dark' ? GLOBE_NIGHT : ''}
            backgroundColor={bgColor}
            showAtmosphere={showAtmosphere}
            showGraticules={showGraticules}
            pointsData={validEvents}
            pointLat={(d: any) => d.lat}
            pointLng={(d: any) => d.lon}
            pointColor={(d: any) => categoryColors[d.category] || '#ffff00'}
            pointAltitude={0.01}
            pointRadius={pointSize / 100}
            pointsMerge={enableClustering}
            onPointClick={handlePointClick}
            onPointHover={handleHover}
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
            ringsData={ringsData}
            ringLat={(d: any) => d.lat}
            ringLng={(d: any) => d.lng || d.lon}
            ringColor={(d: any) => categoryColors[d.category] || 'rgba(255,200,0,0.5)'}
            ringAltitude={0.005}
            ringRadius={0.3}
            polygonCapColor={() => 'rgba(255,100,100,0.3)'}
            polygonSideColor={() => 'rgba(255,100,100,0.2)'}
            polygonStrokeColor={() => 'rgba(255,100,100,0.8)'}
            polygonAltitude={0.01}
            polygonsData={polygonsData}
            pathsData={pathsData}
            pathPoints={(d: any) => d.path}
            pathPointLat={(p: any) => p[0]}
            pathPointLng={(p: any) => p[1]}
            pathColor={(d: any) => d.color || 'rgba(255,255,255,0.5)'}
            pathStroke={1.5}
            arcsData={arcData}
            arcStartLat={(d: any) => d.startLat}
            arcStartLng={(d: any) => d.startLng}
            arcEndLat={(d: any) => d.endLat}
            arcEndLng={(d: any) => d.endLng}
            arcColor={(d: any) => d.color}
            arcAltitude={0.2}
            arcDashLength={0.3}
            arcDashGap={0.2}
            arcDashAnimateTime={1500}
            heatmapsData={heatmapsData}
            heatmapPoints={(d: any) => d}
            heatmapPointLat={(p: any) => p.lat}
            heatmapPointLng={(p: any) => p.lon}
            heatmapPointWeight={1}
            heatmapBandwidth={2}
            animateIn={true}
            enablePointerInteraction={true}
          />;
          })()}

          {/* Collaborator Cursors */}
          {showCollaborators && collaborators.map(collab => (
            <div key={collab.id} style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none',
              zIndex: 200
            }}>
              <div style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: collab.color,
                border: '2px solid white',
                boxShadow: '0 0 10px ' + collab.color
              }} />
              <div style={{
                position: 'absolute',
                top: '100%',
                left: '50%',
                transform: 'translateX(-50%)',
                background: collab.color,
                padding: '2px 6px',
                borderRadius: '4px',
                fontSize: '10px',
                whiteSpace: 'nowrap',
                color: 'white'
              }}>
                {collab.name}
              </div>
            </div>
          ))}

          {/* POI Markers */}
          {showPois && pois.map(poi => (
            <div key={poi.id} style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 150,
              cursor: 'pointer'
            }} onClick={() => setSelectedEvent(poi as any)}>
              <div style={{
                fontSize: '24px'
              }}>📍</div>
            </div>
          ))}

          {hoveredEvent && !selectedEvent && (
            <div style={{
              position: 'absolute', 
              bottom: showBottomPanel ? panelState.bottom + 20 : 20, 
              left: showLeftPanel ? panelState.left + 20 : 20,
              background: 'rgba(10,10,20,0.95)', 
              borderRadius: '8px', 
              padding: '12px 16px',
              color: 'white', 
              minWidth: '250px', 
              zIndex: 100,
              border: `1px solid ${categoryColors[hoveredEvent.category]}`,
              boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{ fontSize: '1.2rem' }}>{categoryEmoji[hoveredEvent.category]}</span>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{hoveredEvent.type}</div>
                  <div style={{ fontSize: '0.65rem', color: categoryColors[hoveredEvent.category] }}>{hoveredEvent.category.toUpperCase()}</div>
                </div>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '4px' }}>{hoveredEvent.date}</div>
              <div style={{ fontSize: '0.8rem', color: '#aaa' }}>
                {hoveredEvent.description?.substring(0, 80)}...
              </div>
            </div>
          )}

          {loading && (
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'rgba(0,0,0,0.8)',
              padding: '20px 40px',
              borderRadius: '12px',
              color: 'white',
              zIndex: 200
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '1.5rem' }}>🗺️</span>
                <span>Loading OSINT Data...</span>
              </div>
            </div>
          )}
        </div>

        {showBottomPanel && (
          <div style={{ 
            height: panelState.bottom, 
            background: 'rgba(8, 8, 20, 0.97)', 
            borderTop: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              padding: '8px 16px',
              borderBottom: '1px solid rgba(255,255,255,0.05)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ color: '#888', fontSize: '0.7rem', letterSpacing: '1px' }}>TIMELINE</span>
                <button onClick={() => setIsPlaying(!isPlaying)} style={{
                  background: isPlaying ? '#e74c3c' : 'rgba(255,255,255,0.2)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '28px',
                  height: '28px',
                  color: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.7rem'
                }}>
                  {isPlaying ? '⏸' : '▶'}
                </button>
                <span style={{ color: '#666', fontSize: '0.65rem' }}>Speed:</span>
                <select 
                  value={playbackSpeed} 
                  onChange={(e) => setPlaybackSpeed(Number(e.target.value))} 
                  style={{ 
                    background: 'rgba(255,255,255,0.1)', 
                    border: 'none', 
                    color: 'white', 
                    borderRadius: '4px', 
                    padding: '2px 6px',
                    fontSize: '0.7rem'
                  }}
                >
                  <option value={0.5}>0.5x</option>
                  <option value={1}>1x</option>
                  <option value={2}>2x</option>
                  <option value={5}>5x</option>
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span style={{ color: '#666', fontSize: '0.7rem' }}>
                  {timeRange[0].toLocaleDateString()} - {timeRange[1].toLocaleDateString()}
                </span>
                <span style={{ color: '#4a9', fontSize: '0.7rem' }}>
                  {validEvents.length} EVENTS
                </span>
              </div>
            </div>
            <div style={{ flex: 1, padding: '8px 16px', display: 'flex', alignItems: 'center' }}>
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={timelinePosition} 
                onChange={(e) => setTimelinePosition(Number(e.target.value))} 
                style={{ width: '100%', cursor: 'pointer' }} 
              />
            </div>
          </div>
        )}
      </div>

      {showRightPanel && (
        <div style={{
          width: panelState.right,
          minWidth: 300,
          maxWidth: 600,
          background: 'rgba(8, 8, 20, 0.97)',
          borderLeft: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 50
        }}>
          <div style={{
            display: 'flex',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(0,0,0,0.3)'
          }}>
            {([
              ['details', '📋', 'Details'],
              ['analytics', '📊', 'Analytics'],
              ['entities', '🔗', 'Entities'],
              ['timeline', '📅', 'Timeline']
            ] as const).map(([tab, icon, label]) => (
              <button key={tab} onClick={() => setActiveRightTab(tab)} style={{
                flex: 1,
                background: activeRightTab === tab ? 'rgba(52, 152, 219, 0.3)' : 'transparent',
                border: 'none',
                padding: '10px 8px',
                color: activeRightTab === tab ? '#3498db' : '#666',
                cursor: 'pointer',
                fontSize: '0.65rem',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                borderBottom: activeRightTab === tab ? '2px solid #3498db' : '2px solid transparent'
              }}>
                {icon}<div style={{ marginTop: '2px' }}>{label}</div>
              </button>
            ))}
          </div>

          <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
            {activeRightTab === 'details' && (
              selectedEvent ? (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '2.5rem' }}>{categoryEmoji[selectedEvent.category]}</span>
                      <div>
                        <h2 style={{ margin: 0, color: 'white', fontSize: '1.1rem' }}>{selectedEvent.type}</h2>
                        <div style={{ 
                          display: 'inline-block', 
                          background: categoryColors[selectedEvent.category], 
                          padding: '3px 10px', 
                          borderRadius: '10px', 
                          fontSize: '0.65rem', 
                          fontWeight: 'bold',
                          marginTop: '4px'
                        }}>
                          {selectedEvent.category.toUpperCase()}
                        </div>
                      </div>
                    </div>
                    <button onClick={() => setSelectedEvent(null)} style={{ 
                      background: 'none', 
                      border: 'none', 
                      color: '#666', 
                      fontSize: '1.2rem', 
                      cursor: 'pointer' 
                    }}>✕</button>
                  </div>
                  
                  <div style={{ color: '#666', fontSize: '0.8rem', marginBottom: '12px' }}>{selectedEvent.date}</div>
                  
                  <div style={{ 
                    background: 'rgba(255,255,255,0.05)', 
                    padding: '12px', 
                    borderRadius: '8px', 
                    marginBottom: '12px' 
                  }}>
                    <div style={{ color: '#666', fontSize: '0.65rem', marginBottom: '4px', textTransform: 'uppercase' }}>Description</div>
                    <div style={{ color: '#ccc', fontSize: '0.85rem', lineHeight: 1.5 }}>{selectedEvent.description}</div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '6px' }}>
                      <div style={{ color: '#666', fontSize: '0.6rem', marginBottom: '2px' }}>COORDINATES</div>
                      <div style={{ color: 'white', fontSize: '0.8rem' }}>{selectedEvent.lat.toFixed(4)}, {selectedEvent.lon.toFixed(4)}</div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '6px' }}>
                      <div style={{ color: '#666', fontSize: '0.6rem', marginBottom: '2px' }}>SEVERITY</div>
                      <div style={{ 
                        color: SEVERITY_COLORS[selectedEvent.severity || 'medium'], 
                        fontSize: '0.8rem',
                        textTransform: 'uppercase',
                        fontWeight: 'bold'
                      }}>
                        {selectedEvent.severity || 'medium'}
                      </div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '6px' }}>
                      <div style={{ color: '#666', fontSize: '0.6rem', marginBottom: '2px' }}>SOURCE</div>
                      <div style={{ color: 'white', fontSize: '0.8rem' }}>{selectedEvent.source || 'Unknown'}</div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '6px' }}>
                      <div style={{ color: '#666', fontSize: '0.6rem', marginBottom: '2px' }}>COUNTRY</div>
                      <div style={{ color: 'white', fontSize: '0.8rem' }}>{selectedEvent.country || 'N/A'}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button onClick={() => {
                      const blob = new Blob([JSON.stringify(selectedEvent, null, 2)], { type: "application/json" });
                      saveAs(blob, `event-${selectedEvent.id}.json`);
                    }} style={{ 
                      background: categoryColors[selectedEvent.category], 
                      border: 'none', 
                      padding: '10px 16px', 
                      borderRadius: '6px', 
                      color: 'white', 
                      cursor: 'pointer',
                      fontSize: '0.75rem'
                    }}>
                      💾 JSON
                    </button>
                    <button onClick={exportKML} style={{ 
                      background: 'rgba(255,255,255,0.1)', 
                      border: 'none', 
                      padding: '10px 16px', 
                      borderRadius: '6px', 
                      color: 'white', 
                      cursor: 'pointer',
                      fontSize: '0.75rem'
                    }}>
                      🗺️ KML
                    </button>
                    <button onClick={exportGeoJSON} style={{ 
                      background: 'rgba(255,255,255,0.1)', 
                      border: 'none', 
                      padding: '10px 16px', 
                      borderRadius: '6px', 
                      color: 'white', 
                      cursor: 'pointer',
                      fontSize: '0.75rem'
                    }}>
                      🌐 GeoJSON
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#666' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📍</div>
                  <div>Select an event on the globe to view details</div>
                </div>
              )
            )}

            {activeRightTab === 'analytics' && (
              <div>
                <div style={{ 
                  background: 'linear-gradient(135deg, rgba(52, 152, 219, 0.2), rgba(155, 89, 182, 0.2))', 
                  padding: '16px', 
                  borderRadius: '10px', 
                  marginBottom: '16px' 
                }}>
                  <div style={{ color: '#666', fontSize: '0.65rem', marginBottom: '4px', letterSpacing: '1px' }}>TOTAL EVENTS</div>
                  <div style={{ color: 'white', fontSize: '2rem', fontWeight: 'bold' }}>{analytics.total}</div>
                  <div style={{ color: '#4a9', fontSize: '0.75rem' }}>Avg {analytics.avgPerDay} events/day</div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <div style={{ color: '#666', fontSize: '0.65rem', marginBottom: '8px', letterSpacing: '1px' }}>BY CATEGORY</div>
                  {Object.entries(analytics.byCategory).sort((a, b) => b[1] - a[1]).map(([cat, count]) => (
                    <div key={cat} style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      marginBottom: '6px',
                      background: 'rgba(255,255,255,0.03)',
                      padding: '8px',
                      borderRadius: '4px'
                    }}>
                      <span style={{ width: '24px', color: categoryColors[cat] }}>{categoryEmoji[cat]}</span>
                      <span style={{ flex: 1, color: '#aaa', fontSize: '0.8rem' }}>{cat}</span>
                      <span style={{ color: categoryColors[cat], fontSize: '0.85rem', fontWeight: 'bold' }}>{count}</span>
                    </div>
                  ))}
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <div style={{ color: '#666', fontSize: '0.65rem', marginBottom: '8px', letterSpacing: '1px' }}>BY SEVERITY</div>
                  {Object.entries(analytics.bySeverity).map(([sev, count]) => (
                    <div key={sev} style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      marginBottom: '6px',
                      background: 'rgba(255,255,255,0.03)',
                      padding: '8px',
                      borderRadius: '4px'
                    }}>
                      <span style={{ width: '24px', color: SEVERITY_COLORS[sev] }}>●</span>
                      <span style={{ flex: 1, color: '#aaa', fontSize: '0.8rem', textTransform: 'uppercase' }}>{sev}</span>
                      <span style={{ color: SEVERITY_COLORS[sev], fontSize: '0.85rem', fontWeight: 'bold' }}>{count}</span>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  <button onClick={() => {
                    const csv = [['ID', 'Type', 'Category', 'Date', 'Lat', 'Lon', 'Source', 'Description']];
                    validEvents.forEach(e => csv.push([e.id, e.type, e.category, e.date, e.lat.toString(), e.lon.toString(), e.source || '', e.description || '']));
                    const blob = new Blob([csv.map(r => r.join(',')).join('\n')], { type: 'text/csv' });
                    saveAs(blob, 'conflict-globe-data.csv');
                  }} style={{
                    background: '#27ae60',
                    border: 'none',
                    padding: '10px',
                    borderRadius: '6px',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '0.7rem'
                  }}>
                    📥 CSV
                  </button>
                  <button onClick={exportGeoJSON} style={{
                    background: '#3498db',
                    border: 'none',
                    padding: '10px',
                    borderRadius: '6px',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '0.7rem'
                  }}>
                    🌐 GeoJSON
                  </button>
                  <button onClick={exportKML} style={{
                    background: '#e67e22',
                    border: 'none',
                    padding: '10px',
                    borderRadius: '6px',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '0.7rem'
                  }}>
                    🗺️ KML
                  </button>
                </div>
              </div>
            )}

            {activeRightTab === 'entities' && (
              <div>
                <div style={{ color: '#666', fontSize: '0.65rem', marginBottom: '12px', letterSpacing: '1px' }}>
                  ENTITY RELATIONSHIPS
                </div>
                {entityGraph.nodes.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: '#666' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '12px' }}>🔗</div>
                    <div>No entity data available</div>
                    <div style={{ fontSize: '0.75rem', marginTop: '8px' }}>Add entities to events to see relationships</div>
                  </div>
                ) : (
                  <>
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ color: '#666', fontSize: '0.7rem', marginBottom: '8px' }}>NODES: {entityGraph.nodes.length}</div>
                      <div style={{ color: '#666', fontSize: '0.7rem' }}>LINKS: {entityGraph.links.length}</div>
                    </div>
                    <div style={{ 
                      display: 'flex', 
                      flexWrap: 'wrap', 
                      gap: '6px',
                      maxHeight: '300px',
                      overflow: 'auto'
                    }}>
                      {entityGraph.nodes.slice(0, 30).map((node: any) => (
                        <div key={node.id} style={{
                          background: node.type === 'entity' ? 'rgba(231, 76, 60, 0.2)' : 'rgba(52, 152, 219, 0.2)',
                          padding: '6px 10px',
                          borderRadius: '12px',
                          fontSize: '0.7rem',
                          color: node.type === 'entity' ? '#e74c3c' : '#3498db'
                        }}>
                          {node.id}
                          {node.events && <span style={{ opacity: 0.6 }}> ({node.events})</span>}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {activeRightTab === 'timeline' && (
              <div>
                <div style={{ color: '#666', fontSize: '0.65rem', marginBottom: '12px', letterSpacing: '1px' }}>
                  EVENT TIMELINE
                </div>
                <div style={{ 
                  maxHeight: '400px', 
                  overflow: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  {searchFilteredEvents
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .slice(0, 50)
                    .map((event, idx) => (
                      <div 
                        key={event.id || idx} 
                        onClick={() => {
                          setSelectedEvent(event);
                          focusLocation(event.lat, event.lon, 1.5);
                        }}
                        style={{
                          background: selectedEvent?.id === event.id ? 'rgba(52, 152, 219, 0.2)' : 'rgba(255,255,255,0.03)',
                          padding: '10px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          borderLeft: `3px solid ${categoryColors[event.category]}`,
                          transition: 'all 0.2s'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <span style={{ color: 'white', fontSize: '0.8rem', fontWeight: 500 }}>{event.type}</span>
                          <span style={{ color: '#666', fontSize: '0.65rem' }}>{event.date.split('T')[0]}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ color: categoryColors[event.category], fontSize: '0.65rem' }}>
                            {categoryEmoji[event.category]} {event.category}
                          </span>
                          <span style={{ color: SEVERITY_COLORS[event.severity || 'medium'], fontSize: '0.6rem' }}>
                            ● {event.severity || 'medium'}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showEntityGraph && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '80%',
          height: '70%',
          background: 'rgba(10, 10, 25, 0.98)',
          borderRadius: '16px',
          border: '1px solid rgba(255,255,255,0.1)',
          zIndex: 300,
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 20px',
            borderBottom: '1px solid rgba(255,255,255,0.1)'
          }}>
            <h2 style={{ margin: 0, color: 'white', fontSize: '1.1rem' }}>🔗 Entity Relationship Graph</h2>
            <button onClick={() => setShowEntityGraph(false)} style={{
              background: 'none',
              border: 'none',
              color: '#666',
              fontSize: '1.2rem',
              cursor: 'pointer'
            }}>✕</button>
          </div>
          <div style={{ flex: 1, padding: '20px', overflow: 'auto' }}>
            <div style={{ 
              display: 'flex', 
              flexWrap: 'wrap', 
              gap: '10px',
              justifyContent: 'center'
            }}>
              {entityGraph.nodes.slice(0, 40).map((node: any, idx: number) => (
                <div key={idx} style={{
                  background: node.type === 'entity' 
                    ? 'linear-gradient(135deg, rgba(231, 76, 60, 0.3), rgba(231, 76, 60, 0.1))'
                    : 'linear-gradient(135deg, rgba(52, 152, 219, 0.3), rgba(52, 152, 219, 0.1))',
                  padding: '12px 20px',
                  borderRadius: '20px',
                  border: `1px solid ${node.type === 'entity' ? 'rgba(231, 76, 60, 0.5)' : 'rgba(52, 152, 219, 0.5)'}`,
                  color: 'white',
                  fontSize: '0.85rem'
                }}>
                  {node.id}
                </div>
              ))}
            </div>
            {entityGraph.links.length > 0 && (
              <div style={{ marginTop: '20px', color: '#666', fontSize: '0.75rem', textAlign: 'center' }}>
                {entityGraph.links.length} connections between entities
              </div>
            )}
          </div>
        </div>
      )}

      {/* Time Machine Panel */}
      {showTimeMachine && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '500px',
          background: 'rgba(10, 10, 25, 0.98)',
          borderRadius: '16px',
          border: '1px solid rgba(255,255,255,0.1)',
          zIndex: 300,
          padding: '20px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ margin: 0, color: 'white', fontSize: '1.1rem' }}>⏰ Time Machine</h2>
            <button onClick={() => setShowTimeMachine(false)} style={{
              background: 'none', border: 'none', color: '#666', fontSize: '1.2rem', cursor: 'pointer'
            }}>✕</button>
          </div>
          
          <div style={{ marginBottom: '20px' }}>
            <div style={{ color: '#888', fontSize: '0.8rem', marginBottom: '8px' }}>
              Historical Date: {historicalDate.toLocaleDateString()}
            </div>
            <input 
              type="date"
              value={historicalDate.toISOString().split('T')[0]}
              onChange={(e) => setHistoricalDate(new Date(e.target.value))}
              style={{
                width: '100%',
                padding: '10px',
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '8px',
                color: 'white',
                fontSize: '1rem'
              }}
            />
          </div>
          
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', color: '#aaa' }}>
              <input 
                type="checkbox" 
                checked={timeLapseMode} 
                onChange={(e) => setTimeLapseMode(e.target.checked)} 
              />
              <span>Time-lapse Mode (animate through time)</span>
            </label>
          </div>
          
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              onClick={() => setHistoricalDate(new Date(historicalDate.getTime() - 24 * 60 * 60 * 1000))}
              style={{
                flex: 1,
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                padding: '12px',
                borderRadius: '8px',
                color: 'white',
                cursor: 'pointer'
              }}
            >
              ◀ Previous Day
            </button>
            <button 
              onClick={() => setHistoricalDate(new Date())}
              style={{
                flex: 1,
                background: '#3498db',
                border: 'none',
                padding: '12px',
                borderRadius: '8px',
                color: 'white',
                cursor: 'pointer'
              }}
            >
              Today
            </button>
            <button 
              onClick={() => setHistoricalDate(new Date(historicalDate.getTime() + 24 * 60 * 60 * 1000))}
              style={{
                flex: 1,
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                padding: '12px',
                borderRadius: '8px',
                color: 'white',
                cursor: 'pointer'
              }}
            >
              Next Day ▶
            </button>
          </div>
        </div>
      )}

      {/* Report Panel */}
      {showReportPanel && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '450px',
          background: 'rgba(10, 10, 25, 0.98)',
          borderRadius: '16px',
          border: '1px solid rgba(255,255,255,0.1)',
          zIndex: 300,
          padding: '20px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ margin: 0, color: 'white', fontSize: '1.1rem' }}>📄 Generate Report</h2>
            <button onClick={() => setShowReportPanel(false)} style={{
              background: 'none', border: 'none', color: '#666', fontSize: '1.2rem', cursor: 'pointer'
            }}>✕</button>
          </div>
          
          <div style={{ marginBottom: '20px' }}>
            <div style={{ color: '#888', fontSize: '0.75rem', marginBottom: '8px' }}>REPORT TYPE</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {(['summary', 'detailed', 'analytics'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setReportType(type)}
                  style={{
                    flex: 1,
                    background: reportType === type ? '#8e44ad' : 'rgba(255,255,255,0.1)',
                    border: 'none',
                    padding: '10px',
                    borderRadius: '6px',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    textTransform: 'capitalize'
                  }}
                >
                  {type === 'summary' && '📋'}
                  {type === 'detailed' && '📝'}
                  {type === 'analytics' && '📊'}
                  {' '}{type}
                </button>
              ))}
            </div>
          </div>
          
          <div style={{ 
            background: 'rgba(255,255,255,0.05)', 
            padding: '15px', 
            borderRadius: '8px', 
            marginBottom: '20px',
            fontSize: '0.8rem',
            color: '#888'
          }}>
            {reportType === 'summary' && 'Quick overview with category and severity counts'}
            {reportType === 'detailed' && 'Full event-by-event breakdown with all details'}
            {reportType === 'analytics' && 'Statistical analysis with charts and trends'}
          </div>
          
          <button 
            onClick={generateReport}
            style={{
              width: '100%',
              background: '#8e44ad',
              border: 'none',
              padding: '14px',
              borderRadius: '8px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: 'bold'
            }}
          >
            📥 Download Report (Markdown)
          </button>
        </div>
      )}

      {/* Voice Transcript */}
      {voiceEnabled && transcript && (
        <div style={{
          position: 'absolute',
          bottom: showBottomPanel ? panelState.bottom + 60 : 60,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(39, 174, 96, 0.9)',
          padding: '8px 16px',
          borderRadius: '20px',
          color: 'white',
          fontSize: '0.8rem',
          zIndex: 200
        }}>
          🎤 {transcript}
        </div>
      )}

      {/* Collaboration Room */}
      {showCollaborators && (
        <div style={{
          position: 'absolute',
          top: '80px',
          right: showRightPanel ? panelState.right + 20 : 20,
          background: 'rgba(10, 10, 25, 0.95)',
          padding: '16px',
          borderRadius: '12px',
          border: '1px solid rgba(255,255,255,0.1)',
          zIndex: 200,
          width: '280px'
        }}>
          <div style={{ color: '#888', fontSize: '0.7rem', marginBottom: '10px' }}>👥 COLLABORATION</div>
          
          {!collaborationRoom ? (
            <>
              <input
                type="text"
                placeholder="Your name"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '6px',
                  color: 'white',
                  fontSize: '0.8rem',
                  marginBottom: '8px'
                }}
              />
              <input
                type="text"
                placeholder="Room name"
                id="roomInput"
                style={{
                  width: '100%',
                  padding: '8px',
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '6px',
                  color: 'white',
                  fontSize: '0.8rem',
                  marginBottom: '8px'
                }}
              />
              <button 
                onClick={() => {
                  const room = (document.getElementById('roomInput') as HTMLInputElement)?.value;
                  if (room) joinCollaboration(room);
                }}
                style={{
                  width: '100%',
                  background: '#3498db',
                  border: 'none',
                  padding: '10px',
                  borderRadius: '6px',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '0.8rem'
                }}
              >
                Join Room
              </button>
            </>
          ) : (
            <>
              <div style={{ color: '#4a9', fontSize: '0.8rem', marginBottom: '10px' }}>
                ✓ Connected to: {collaborationRoom}
              </div>
              <div style={{ marginBottom: '10px' }}>
                <div style={{ color: '#666', fontSize: '0.7rem', marginBottom: '4px' }}>
                  Active Users ({collaborators.length + 1})
                </div>
                <div style={{ color: 'white', fontSize: '0.8rem' }}>• {username} (you)</div>
                {collaborators.map(c => (
                  <div key={c.id} style={{ color: c.color, fontSize: '0.8rem' }}>• {c.name}</div>
                ))}
              </div>
              <button 
                onClick={leaveCollaboration}
                style={{
                  width: '100%',
                  background: '#e74c3c',
                  border: 'none',
                  padding: '10px',
                  borderRadius: '6px',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '0.8rem'
                }}
              >
                Leave Room
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
