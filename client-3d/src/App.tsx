import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import Globe from "react-globe.gl";
import { saveAs } from "file-saver";
import { io, Socket } from "socket.io-client";
import "./App.css";

// ─── Types ────────────────────────────────────────────────────────────────────

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
  layers: LayerState;
  bookmarks: Bookmark[];
  alerts?: Alert[];
  timeRange?: [string, string];
  maxPoints?: number;
  pointSize?: number;
  globeTheme?: GlobeTheme;
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

interface LayerState {
  showArcs: boolean;
  showHeatmap: boolean;
  showHexBin: boolean;
  showRings: boolean;
  showPolygons: boolean;
  showPaths: boolean;
}

type GlobeTheme = "dark" | "light" | "satellite" | "terrain";
type LeftTab = "layers" | "categories" | "filters" | "import" | "settings";
type RightTab = "details" | "analytics" | "entities" | "timeline";
type ReportType = "summary" | "detailed" | "analytics";
type DrawMode = "none" | "circle" | "polygon" | "line";
type TileLayerKey = keyof typeof TILE_LAYERS;

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  conflict: "#ef4444",
  maritime: "#3b82f6",
  air: "#22c55e",
  cyber: "#a855f7",
  land: "#f97316",
  space: "#14b8a6",
  radio: "#eab308",
  weather: "#60a5fa",
  earthquakes: "#9333ea",
  social: "#ec4899",
  cameras: "#06b6d4",
};

const CATEGORY_ICONS: Record<string, string> = {
  conflict: "⚔", maritime: "⛵", air: "✈", cyber: "⬡",
  land: "◉", space: "◎", radio: "◈", weather: "◐",
  earthquakes: "◍", social: "◑", cameras: "◆",
};

const SEVERITY_COLORS: Record<string, string> = {
  low: "#22c55e", medium: "#eab308", high: "#f97316", critical: "#ef4444",
};

const GLOBE_IMAGES = {
  dark: "//unpkg.com/three-globe/example/img/earth-dark.jpg",
  light: "//unpkg.com/three-globe/example/img/earth-blue-marble.jpg",
  satellite: "//unpkg.com/three-globe/example/img/earth-blue-marble.jpg",
  terrain: "//unpkg.com/three-globe/example/img/earth-topology.png",
};

const TILE_LAYERS = {
  cartodb_dark: { name: "Dark", url: "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png", attribution: "© CartoDB" },
  cartodb_light: { name: "Light", url: "https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png", attribution: "© CartoDB" },
  esri_satellite: { name: "Satellite", url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", attribution: "© Esri" },
  osm: { name: "OSM", url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png", attribution: "© OpenStreetMap" },
  stamen_toner: { name: "Toner", url: "https://tiles.stadiamaps.com/tiles/stamen_toner/{z}/{x}/{y}.png", attribution: "© Stadia Maps" },
};

const QUICK_LOCATIONS = [
  { name: "Ukraine", lat: 48.3794, lon: 31.1656 },
  { name: "Gaza Strip", lat: 31.3547, lon: 34.3088 },
  { name: "Taiwan Strait", lat: 24.0, lon: 119.5 },
  { name: "South China Sea", lat: 16.0, lon: 115.0 },
  { name: "Persian Gulf", lat: 26.0, lon: 52.0 },
  { name: "Red Sea", lat: 20.0, lon: 38.0 },
  { name: "Baltic Sea", lat: 55.0, lon: 14.0 },
  { name: "Mediterranean", lat: 35.0, lon: 18.0 },
  { name: "Russia", lat: 55.7558, lon: 37.6173 },
  { name: "Iran", lat: 35.6892, lon: 51.389 },
  { name: "North Korea", lat: 39.0392, lon: 125.7625 },
  { name: "Israel", lat: 31.7683, lon: 35.2137 },
];

const NIGHT_SKY = "//unpkg.com/three-globe/example/img/night-sky.png";

// ─── Utility ──────────────────────────────────────────────────────────────────

function cls(...args: (string | false | undefined | null)[]): string {
  return args.filter(Boolean).join(" ");
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="section-label">{children}</div>;
}

function CheckRow({ checked, onChange, icon, label }: { checked: boolean; onChange: (v: boolean) => void; icon: string; label: string }) {
  return (
    <label className="check-row">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      <span className="check-icon">{icon}</span>
      <span>{label}</span>
    </label>
  );
}

function EmptyState({ icon, text, sub }: { icon: string; text: string; sub?: string }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <div className="empty-text">{text}</div>
      {sub && <div className="empty-sub">{sub}</div>}
    </div>
  );
}

function FloatPanel({ title, onClose, children, style }: { title: string; onClose: () => void; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div className="float-panel" style={style}>
      <div className="float-header">
        <span className="float-title">{title}</span>
        <button className="float-close" onClick={onClose}>✕</button>
      </div>
      <div className="float-body">{children}</div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const globeEl = useRef<any>(null);
  const socketRef = useRef<Socket | null>(null);

  // Data
  const [events, setEvents] = useState<ConflictEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Globe settings
  const [globeTheme, setGlobeTheme] = useState<GlobeTheme>("dark");
  const [showAtmosphere, setShowAtmosphere] = useState(true);
  const [showGraticules, setShowGraticules] = useState(false);
  const [showClouds, setShowClouds] = useState(false);
  const [globeRotation, setGlobeRotation] = useState(false);
  const [showTerrain, setShowTerrain] = useState(false);
  const [showCameras, setShowCameras] = useState(true);
  const [pointSize, setPointSize] = useState(2);
  const [pointQuality, setPointQuality] = useState<"low" | "medium" | "high">("medium");
  const [enableClustering, setEnableClustering] = useState(true);
  const [maxPoints, setMaxPoints] = useState(500);
  const [tileLayer, setTileLayer] = useState<TileLayerKey>("cartodb_dark");
  const [useTiles, setUseTiles] = useState(true);

  // Layers
  const [layers, setLayers] = useState<LayerState>({
    showArcs: false, showHeatmap: false, showHexBin: false,
    showRings: false, showPolygons: false, showPaths: false,
  });
  const setLayer = (key: keyof LayerState, val: boolean) => setLayers(l => ({ ...l, [key]: val }));

  // Filters
  const [filters, setFilters] = useState<Record<string, boolean>>({
    conflict: true, maritime: true, air: true, cyber: true,
    land: true, space: true, radio: true, weather: true,
    earthquakes: true, social: true, cameras: true,
  });
  const [severityFilters, setSeverityFilters] = useState<Record<string, boolean>>({
    low: true, medium: true, high: true, critical: true,
  });
  const [customFilter, setCustomFilter] = useState("");
  const [booleanFilter, setBooleanFilter] = useState<"AND" | "OR">("AND");
  const [timeRange, setTimeRange] = useState<[Date, Date]>([
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    new Date(Date.now() + 24 * 60 * 60 * 1000), // +1 day to catch live events
  ]);
  // Keep timeRange end moving forward so live events always show
  useEffect(() => {
    const tick = setInterval(() => {
      setTimeRange(prev => [prev[0], new Date(Date.now() + 24 * 60 * 60 * 1000)]);
    }, 60_000);
    return () => clearInterval(tick);
  }, []);

  // UI state
  const [showLeftPanel, setShowLeftPanel] = useState(true);
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [showBottomPanel, setShowBottomPanel] = useState(true);
  const [activeLeftTab, setActiveLeftTab] = useState<LeftTab>("layers");
  const [activeRightTab, setActiveRightTab] = useState<RightTab>("details");
  const [selectedEvent, setSelectedEvent] = useState<ConflictEvent | null>(null);
  const [hoveredEvent, setHoveredEvent] = useState<ConflictEvent | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Search
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  // Timeline
  const [timelinePosition, setTimelinePosition] = useState(100);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  // Auto-refresh
  const [autoRefresh] = useState(true);
  const [refreshInterval] = useState(60);

  // Workspaces
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<string | null>(null);

  // API Keys (stored in localStorage)
  const [apiKeys, setApiKeys] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem("cg_apiKeys");
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });
  useEffect(() => { localStorage.setItem("cg_apiKeys", JSON.stringify(apiKeys)); }, [apiKeys]);

  // Feature panels
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showEntityGraph, setShowEntityGraph] = useState(false);
  const [showTimeMachine, setShowTimeMachine] = useState(false);
  const [showReportPanel, setShowReportPanel] = useState(false);
  const [showLiveFeed, setShowLiveFeed] = useState(true);
  const [showDrawTools, setShowDrawTools] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showCollaborators, setShowCollaborators] = useState(false);

  // Voice
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [transcript, setTranscript] = useState("");

  // Time machine
  const [historicalDate, setHistoricalDate] = useState<Date>(new Date());
  const [timeLapseMode, setTimeLapseMode] = useState(false);

  // Report
  const [reportType, setReportType] = useState<ReportType>("summary");

  // Draw
  const [drawMode, setDrawMode] = useState<DrawMode>("none");
  const [drawnShapes, setDrawnShapes] = useState<{ id: string; type: string; points: [number, number][]; color: string }[]>([]);

  // Collaboration
  const [collaborators, setCollaborators] = useState<{ id: string; name: string; color: string; lat: number; lng: number }[]>([]);
  const [username, setUsername] = useState(() => `ANALYST-${Math.random().toString(36).substr(2, 4).toUpperCase()}`);
  const [collaborationRoom, setCollaborationRoom] = useState<string | null>(null);
  const [roomInput, setRoomInput] = useState("");

  // Live feed
  const [liveFeedItems, setLiveFeedItems] = useState<{ id: string; time: Date; message: string; type: string; severity: string }[]>([]);

  // Camera Viewer
  const [cameraViewer, setCameraViewer] = useState<{ event: ConflictEvent; url: string } | null>(null);

  // Threat
  const [threatScore, setThreatScore] = useState(0);
  const [threatLevel, setThreatLevel] = useState<"low" | "medium" | "high" | "critical">("low");



  // ── Data loading ──
  const loadData = useCallback(async () => {
    try {
      const res = await fetch("/api/conflicts");
      const data = await res.json();
      const evts = data.events || [];
      setEvents(evts);
      checkAlerts(evts);
    } catch (e) {
      console.error("Failed to load data:", e);
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line

  useEffect(() => { loadData(); }, [loadData]);

  // ── LocalStorage ──
  useEffect(() => {
    try {
      const b = localStorage.getItem("cg_bookmarks"); if (b) setBookmarks(JSON.parse(b));
      const a = localStorage.getItem("cg_alerts"); if (a) setAlerts(JSON.parse(a));
      const w = localStorage.getItem("cg_workspaces"); if (w) setWorkspaces(JSON.parse(w));
    } catch {}
  }, []);
  useEffect(() => { localStorage.setItem("cg_bookmarks", JSON.stringify(bookmarks)); }, [bookmarks]);
  useEffect(() => { localStorage.setItem("cg_alerts", JSON.stringify(alerts)); }, [alerts]);
  useEffect(() => { localStorage.setItem("cg_workspaces", JSON.stringify(workspaces)); }, [workspaces]);

  // ── Mobile detection ──
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // ── Auto-refresh ──
  useEffect(() => {
    if (!autoRefresh) return;
    const t = setInterval(loadData, refreshInterval * 1000);
    return () => clearInterval(t);
  }, [autoRefresh, refreshInterval, loadData]);

  // ── WebSocket ──
  useEffect(() => {
    const socket = io(window.location.origin, { transports: ["websocket", "polling"], reconnectionAttempts: 3 });
    socket.on("conflicts:update", (data: { events: ConflictEvent[] }) => {
      setEvents(data.events || []); setLoading(false);
    });
    socket.on("collab:update", (data: { collaborators: typeof collaborators }) => {
      setCollaborators(data.collaborators.filter((c: any) => c.id !== socket.id));
    });
    socket.on("collab:cursor", (data: { id: string; lat: number; lng: number; color?: string }) => {
      setCollaborators(prev => prev.map(c => c.id === data.id ? { ...c, lat: data.lat, lng: data.lng } : c));
    });
    socket.on("collab:draw", (data: { id: string; shapes: any[] }) => {
      setDrawnShapes(data.shapes);
    });
    socket.on("collab:focus", (data: { id: string; lat: number; lng: number; zoom: number }) => {
      if (globeEl.current) {
        (globeEl.current as any).pointOfView({ lat: data.lat, lng: data.lng, altitude: data.zoom }, 1000);
      }
    });
    socket.on("collab:annotation", (data: { id: string; annotation: any }) => {
      setDrawnShapes(prev => {
        const exists = prev.find(s => s.id === data.annotation.id);
        if (exists) return prev.map(s => s.id === data.annotation.id ? data.annotation : s);
        return [...prev, data.annotation];
      });
    });
    socketRef.current = socket;
    return () => { socket.disconnect(); };
  }, []); // eslint-disable-line

  // ── Timeline playback ──
  useEffect(() => {
    if (!isPlaying) return;
    const t = setInterval(() => {
      setTimelinePosition(p => {
        if (p >= 100) { setIsPlaying(false); return 100; }
        return Math.min(100, p + playbackSpeed);
      });
    }, 100);
    return () => clearInterval(t);
  }, [isPlaying, playbackSpeed]);

  // ── Globe auto-rotate ──
  useEffect(() => {
    if (!globeRotation || !globeEl.current) return;
    const globe = globeEl.current;
    let id: number;
    const rotate = () => {
      const pov = globe.pointOfView();
      if (pov) globe.pointOfView({ lng: (pov.lng || 0) + 0.1 }, 0);
      id = requestAnimationFrame(rotate);
    };
    rotate();
    return () => cancelAnimationFrame(id);
  }, [globeRotation]);

  // ── Fly to selected event ──
  useEffect(() => {
    if (selectedEvent && globeEl.current && selectedEvent.lat !== 0) {
      globeEl.current.pointOfView({ lat: selectedEvent.lat, lng: selectedEvent.lon, altitude: 1.5 }, 1000);
    }
  }, [selectedEvent]);

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "r" || e.key === "R") loadData();
      if (e.key === "h" || e.key === "H") setGlobeTheme(t => t === "dark" ? "light" : "dark");
      if (e.key === " ") { e.preventDefault(); setIsPlaying(p => !p); }
      if (e.key === "Escape") setSelectedEvent(null);
      if (e.key === "1") setShowLeftPanel(p => !p);
      if (e.key === "2") setShowRightPanel(p => !p);
      if (e.key === "3") setShowBottomPanel(p => !p);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [loadData]);

  // ── Voice commands ──
  useEffect(() => {
    if (!voiceEnabled) return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert("Voice recognition not supported"); setVoiceEnabled(false); return; }
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e: any) => {
      const t = Array.from(e.results).map((r: any) => r[0].transcript).join("");
      setTranscript(t);
      const l = t.toLowerCase();
      if (l.includes("go to") || l.includes("fly to")) {
        const loc = QUICK_LOCATIONS.find(x => l.includes(x.name.toLowerCase()));
        if (loc) focusLocation(loc.lat, loc.lon, 2);
      }
      if (l.includes("zoom in")) {
        const pov = globeEl.current?.pointOfView();
        if (pov) globeEl.current.pointOfView({ ...pov, altitude: pov.altitude * 0.5 }, 500);
      }
      if (l.includes("zoom out")) {
        const pov = globeEl.current?.pointOfView();
        if (pov) globeEl.current.pointOfView({ ...pov, altitude: pov.altitude * 2 }, 500);
      }
      if (l.includes("refresh")) loadData();
      if (l.includes("dark mode")) setGlobeTheme("dark");
      if (l.includes("light mode")) setGlobeTheme("light");
    };
    rec.start();
    return () => rec.stop();
  }, [voiceEnabled]); // eslint-disable-line

  // ── Helpers ──
  const checkAlerts = useCallback((currentEvents: ConflictEvent[]) => {
    alerts.filter(a => a.enabled).forEach(alert => {
      const matches = currentEvents.filter(e => {
        if (alert.category && e.category !== alert.category) return false;
        if (alert.region && !e.description?.toLowerCase().includes(alert.region.toLowerCase())) return false;
        return true;
      });
      if (matches.length > 0 && Notification.permission === "granted") {
        new Notification(`Conflict Globe: ${alert.name}`, { body: `${matches.length} events match` });
      }
    });
  }, [alerts]);

  const focusLocation = useCallback((lat: number, lon: number, altitude = 1.5) => {
    globeEl.current?.pointOfView({ lat, lng: lon, altitude }, 1000);
  }, []);

  const exportGeoJSON = () => {
    const geojson = {
      type: "FeatureCollection",
      features: validEvents.map(e => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [e.lon, e.lat] },
        properties: { ...e },
      })),
    };
    saveAs(new Blob([JSON.stringify(geojson, null, 2)], { type: "application/geo+json" }), "conflict-globe.geojson");
  };

  const exportKML = () => {
    const kml = `<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>Conflict Globe</name>${validEvents.map(e => `<Placemark><name>${e.type}</name><description><![CDATA[${e.description || ""}]]></description><Point><coordinates>${e.lon},${e.lat},0</coordinates></Point></Placemark>`).join("")}</Document></kml>`;
    saveAs(new Blob([kml], { type: "application/vnd.google-earth.kml+xml" }), "conflict-globe.kml");
  };

  const exportCSV = () => {
    const rows = [["ID","Type","Category","Date","Lat","Lon","Severity","Source","Description"],
      ...validEvents.map(e => [e.id,e.type,e.category,e.date,e.lat,e.lon,e.severity||"",e.source||"",e.description||""])];
    saveAs(new Blob([rows.map(r => r.map(String).join(",")).join("\n")], { type: "text/csv" }), "conflict-globe.csv");
  };

  const saveWorkspace = () => {
    const name = prompt("Workspace name:");
    if (!name) return;
    const ws: Workspace = {
      id: Date.now().toString(), name, createdAt: new Date().toISOString(),
      viewState: globeEl.current?.pointOfView(), filters, layers, bookmarks,
      timeRange: [timeRange[0].toISOString(), timeRange[1].toISOString()],
      maxPoints, pointSize, globeTheme,
    };
    setWorkspaces(w => [...w, ws]);
    setCurrentWorkspace(ws.id);
  };

  const loadWorkspace = (id: string) => {
    const ws = workspaces.find(w => w.id === id);
    if (!ws) return;
    setFilters(ws.filters);
    setLayers(ws.layers);
    if (ws.maxPoints) setMaxPoints(ws.maxPoints);
    if (ws.pointSize) setPointSize(ws.pointSize);
    if (ws.globeTheme) setGlobeTheme(ws.globeTheme);
    if (ws.viewState) globeEl.current?.pointOfView(ws.viewState, 1000);
    setCurrentWorkspace(ws.id);
  };

  const deleteWorkspace = (id: string) => {
    setWorkspaces(w => w.filter(x => x.id !== id));
    if (currentWorkspace === id) setCurrentWorkspace(null);
  };

  const shareWorkspace = (ws: Workspace) => {
    const url = `${window.location.origin}?ws=${btoa(JSON.stringify({ filters: ws.filters, layers: ws.layers, globeTheme: ws.globeTheme }))}`;
    navigator.clipboard.writeText(url);
    alert("Workspace URL copied!");
  };

  const exportWorkspace = (ws: Workspace) => {
    saveAs(new Blob([JSON.stringify(ws, null, 2)], { type: "application/json" }), `${ws.name.replace(/\s+/g, "_")}.json`);
  };

  const importWorkspace = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const ws = JSON.parse(ev.target?.result as string);
        if (ws.name && ws.filters) {
          setWorkspaces(w => [...w, { ...ws, id: Date.now().toString(), createdAt: new Date().toISOString() }]);
          alert(`Imported "${ws.name}"`);
        }
      } catch { alert("Invalid workspace file"); }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        let imported: ConflictEvent[] = [];
        if (file.name.endsWith(".json") || file.name.endsWith(".geojson")) {
          const data = JSON.parse(ev.target?.result as string);
          if (data.features) {
            imported = data.features.map((f: any) => ({
              id: f.id || String(Date.now()),
              lat: f.geometry.coordinates[1], lon: f.geometry.coordinates[0],
              date: f.properties?.date || new Date().toISOString(),
              type: f.properties?.type || "Imported",
              description: f.properties?.description || "",
              source: "Import", category: f.properties?.category || "conflict",
            }));
          } else if (Array.isArray(data)) { imported = data; }
        } else if (file.name.endsWith(".csv")) {
          const lines = (ev.target?.result as string).split("\n");
          for (let i = 1; i < lines.length; i++) {
            const v = lines[i].split(",");
            if (v.length >= 3) {
              imported.push({ id: String(Date.now() + i), lat: parseFloat(v[0]), lon: parseFloat(v[1]), date: v[2] || new Date().toISOString(), type: v[3] || "Imported", description: v[4] || "", source: "CSV", category: v[5] || "conflict" });
            }
          }
        }
        setEvents(ev2 => [...ev2, ...imported]);
        alert(`Imported ${imported.length} events`);
      } catch { alert("Failed to import"); }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // Sync drawings to collab room
  const prevDrawnRef = useRef<string>("");
  useEffect(() => {
    const serialized = JSON.stringify(drawnShapes);
    if (collaborationRoom && socketRef.current && serialized !== prevDrawnRef.current) {
      prevDrawnRef.current = serialized;
      socketRef.current.emit("collab:draw", { room: collaborationRoom, shapes: drawnShapes });
    }
  }, [drawnShapes, collaborationRoom]);

  // Broadcast focus to room
  const broadcastFocus = (lat: number, lng: number, zoom: number) => {
    if (collaborationRoom && socketRef.current) {
      socketRef.current.emit("collab:focus", { room: collaborationRoom, lat, lng, zoom });
    }
  };

  const generateReport = () => {
    const date = new Date().toISOString().split("T")[0];
    let content = "";
    if (reportType === "summary") {
      content = `# Conflict Globe — Summary Report\nGenerated: ${date}\nTotal Events: ${validEvents.length}\n\n## By Category\n${Object.entries(analytics.byCategory).map(([c, n]) => `- ${c}: ${n}`).join("\n")}\n\n## By Severity\n${Object.entries(analytics.bySeverity).map(([s, n]) => `- ${s}: ${n}`).join("\n")}`;
    } else if (reportType === "detailed") {
      content = `# Conflict Globe — Detailed Report\nGenerated: ${date}\n\n${validEvents.map(e => `## ${e.type}\n- Category: ${e.category}\n- Severity: ${e.severity || "N/A"}\n- Date: ${e.date}\n- Location: ${e.lat}, ${e.lon}\n- Description: ${e.description}\n- Source: ${e.source}\n`).join("\n")}`;
    } else {
      content = `# Conflict Globe — Analytics Report\nGenerated: ${date}\n\nTotal Events: ${validEvents.length}\nAverage Per Day: ${analytics.avgPerDay}\n\n## Distribution\n${Object.entries(analytics.byCategory).map(([c, n]) => `${c}: ${n} (${((n / validEvents.length) * 100).toFixed(1)}%)`).join("\n")}`;
    }
    saveAs(new Blob([content], { type: "text/markdown" }), `conflict-report-${reportType}-${date}.md`);
  };

  // ── Derived data ──
  const filteredEvents = useMemo(() => {
    let result = events.filter(e => filters[e.category] && severityFilters[e.severity || "medium"]);
    if (customFilter) {
      try {
        result = result.filter(e => {
          const ctx = { category: e.category, type: e.type, severity: e.severity, source: e.source, description: e.description?.toLowerCase() || "", lat: e.lat, lon: e.lon };
          return new Function(...Object.keys(ctx), `return ${customFilter}`)(...Object.values(ctx));
        });
      } catch {}
    }
    result = result.filter(e => {
      const d = new Date(e.date);
      return d >= timeRange[0] && d <= timeRange[1];
    });
    return result.slice(0, maxPoints);
  }, [events, filters, severityFilters, customFilter, timeRange, maxPoints]);

  const searchFilteredEvents = useMemo(() => {
    if (!searchQuery) return filteredEvents;
    const q = searchQuery.toLowerCase();
    return filteredEvents.filter(e =>
      e.description?.toLowerCase().includes(q) || e.type?.toLowerCase().includes(q) ||
      e.category?.toLowerCase().includes(q) || e.source?.toLowerCase().includes(q)
    );
  }, [filteredEvents, searchQuery]);

  const timelineEvents = useMemo(() => {
    const sorted = [...searchFilteredEvents].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const cut = Math.floor((timelinePosition / 100) * sorted.length);
    return sorted.slice(0, cut + 1);
  }, [searchFilteredEvents, timelinePosition]);

  const validEvents = useMemo(() =>
    timelineEvents
      .filter(e => e.lat !== 0 && e.lon !== 0 && !isNaN(e.lat) && !isNaN(e.lon))
      .map(e => ({ ...e, endLat: e.endLat ?? e.lat, endLon: e.endLon ?? e.lon })),
    [timelineEvents]
  );

  const analytics = useMemo(() => {
    const byCategory: Record<string, number> = {};
    const bySeverity: Record<string, number> = { low: 0, medium: 0, high: 0, critical: 0 };
    const bySource: Record<string, number> = {};
    const byDay: Record<string, number> = {};
    validEvents.forEach(e => {
      byCategory[e.category] = (byCategory[e.category] || 0) + 1;
      bySeverity[e.severity || "medium"]++;
      bySource[e.source || "unknown"] = (bySource[e.source || "unknown"] || 0) + 1;
      const day = new Date(e.date).toISOString().split("T")[0];
      byDay[day] = (byDay[day] || 0) + 1;
    });
    const days = Object.keys(byDay).length;
    return { byCategory, bySeverity, bySource, byDay, total: validEvents.length, avgPerDay: days > 0 ? (validEvents.length / days).toFixed(1) : "0" };
  }, [validEvents]);

  // Threat score — computed separately, set via state with ref guard
  const prevThreatRef = useRef({ score: -1, level: "" });
  useEffect(() => {
    const score = Math.min(100, (analytics.bySeverity.critical || 0) * 15 + (analytics.bySeverity.high || 0) * 8 + (analytics.bySeverity.medium || 0) * 3 + analytics.total * 0.5);
    const rounded = Math.round(score);
    const level: "low" | "medium" | "high" | "critical" = score >= 75 ? "critical" : score >= 50 ? "high" : score >= 25 ? "medium" : "low";
    if (prevThreatRef.current.score !== rounded || prevThreatRef.current.level !== level) {
      prevThreatRef.current = { score: rounded, level };
      setThreatScore(rounded);
      setThreatLevel(level);
    }
  }, [analytics]);

  // Globe layer data
  // Arc events: events that genuinely have a different end point (arms transfers, flight paths, etc)
  // Must filter from timelineEvents BEFORE the endLat=lat fallback is applied in validEvents
  const arcData = useMemo(() => {
    if (!layers.showArcs) return [];
    // Explicit arc events (have endLat/endLon defined and different from start)
    const explicit = timelineEvents
      .filter(e => e.endLat !== undefined && e.endLon !== undefined && e.endLat !== e.lat && e.lat !== 0)
      .slice(0, 80)
      .map(e => ({
        startLat: e.lat, startLng: e.lon, endLat: e.endLat!, endLng: e.endLon!,
        color: CATEGORY_COLORS[e.category] || "#ffd700",
        event: e,
      }));
    // Auto-generated arcs: critical events within 800km of each other, same category
    const criticals = timelineEvents.filter(e => e.severity === "critical" && e.lat !== 0 && !e.endLat);
    const autoArcs: typeof explicit = [];
    for (let i = 0; i < Math.min(criticals.length, 30); i++) {
      for (let j = i + 1; j < Math.min(criticals.length, 30); j++) {
        const a = criticals[i], b = criticals[j];
        if (a.category !== b.category) continue;
        const dist = Math.sqrt(Math.pow(a.lat - b.lat, 2) + Math.pow(a.lon - b.lon, 2));
        if (dist < 8 && dist > 0.5) { // ~800km threshold in degrees
          autoArcs.push({
            startLat: a.lat, startLng: a.lon, endLat: b.lat, endLng: b.lon,
            color: CATEGORY_COLORS[a.category] + "66",
            event: a,
          });
          if (autoArcs.length >= 20) break;
        }
      }
      if (autoArcs.length >= 20) break;
    }
    return [...explicit, ...autoArcs];
  }, [timelineEvents, layers.showArcs]);

  const ringsData = useMemo(() => !layers.showRings ? [] : validEvents.slice(0, 300), [validEvents, layers.showRings]);
  const hexBinData = useMemo(() => !layers.showHexBin ? [] : validEvents, [validEvents, layers.showHexBin]);
  const heatmapData = useMemo(() => !layers.showHeatmap ? [] : validEvents, [validEvents, layers.showHeatmap]);
  const pathsData = useMemo(() => !layers.showPaths ? [] :
    timelineEvents
      .filter(e => e.endLat !== undefined && e.endLon !== undefined && e.endLat !== e.lat && e.lat !== 0)
      .slice(0, 50)
      .map(e => ({
        path: [[e.lat, e.lon], [e.endLat!, e.endLon!]], color: CATEGORY_COLORS[e.category] || "#ffd700",
      })), [timelineEvents, layers.showPaths]);

  const tilesData = useMemo(() => !useTiles ? undefined : [{
    url: TILE_LAYERS[tileLayer].url, maxZoom: 19, attribution: TILE_LAYERS[tileLayer].attribution,
  }], [useTiles, tileLayer]);

  // Live feed — track truly new events arriving via WebSocket
  const prevEventIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (validEvents.length === 0) return;
    const currentIds = new Set(validEvents.map(e => e.id));
    const newEvents = prevEventIdsRef.current.size === 0
      ? validEvents.slice(0, 25) // first load: show most recent 25
      : validEvents.filter(e => !prevEventIdsRef.current.has(e.id));
    prevEventIdsRef.current = currentIds;
    if (newEvents.length === 0) return;
    const newItems = newEvents
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 25)
      .map((e, i) => ({
        id: e.id || `e-${i}`,
        time: new Date(e.date),
        message: (e.description || "").substring(0, 90) + ((e.description?.length || 0) > 90 ? "…" : ""),
        type: e.category.toUpperCase(),
        severity: e.severity || "low",
        event: e,
      }));
    setLiveFeedItems(prev => [...newItems, ...prev].slice(0, 50));
  }, [validEvents]);

  // Search suggestions
  const searchSuggestions = useMemo(() => {
    if (!searchQuery) return [];
    const q = searchQuery.toLowerCase();
    return QUICK_LOCATIONS.filter(l => l.name.toLowerCase().includes(q)).slice(0, 5);
  }, [searchQuery]);

  // Collaboration
  const joinCollaboration = () => {
    if (!roomInput) return;
    setCollaborationRoom(roomInput);
    socketRef.current?.emit("collab:join", { room: roomInput, username });
  };
  const leaveCollaboration = () => {
    socketRef.current?.emit("collab:leave");
    setCollaborationRoom(null);
    setCollaborators([]);
  };

  // Entity graph
  const entityGraph = useMemo(() => {
    const nodeMap = new Map<string, { id: string; type: string; events: number }>();
    const links: { source: string; target: string }[] = [];
    validEvents.forEach(e => {
      const key = e.category;
      if (!nodeMap.has(key)) nodeMap.set(key, { id: key, type: "category", events: 0 });
      nodeMap.get(key)!.events++;
      e.entities?.forEach(ent => {
        if (!nodeMap.has(ent)) nodeMap.set(ent, { id: ent, type: "entity", events: 0 });
        nodeMap.get(ent)!.events++;
        links.push({ source: ent, target: key });
      });
    });
    return { nodes: Array.from(nodeMap.values()).slice(0, 50), links: links.slice(0, 100) };
  }, [validEvents]);

  const bgColor = globeTheme === "dark" ? "#070b14" : "#e8edf4";

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="app">
      {/* ── Left Panel ── */}
      {showLeftPanel && (
        <div className="panel panel-left">
          <div className="panel-header">
            <div className="panel-logo">
              <span className="panel-logo-icon">⊕</span>
              <span className="panel-logo-text">CONFLICT GLOBE</span>
            </div>
            <div className="panel-meta">
              <span className="live-dot" />
              <span>LIVE</span>
              <span style={{ color: "var(--border-hi)" }}>·</span>
              <span style={{ color: "var(--text-2)" }}>{validEvents.length}</span>
              <span>EVENTS</span>
              {currentWorkspace && <>
                <span style={{ color: "var(--border-hi)" }}>·</span>
                <span style={{ color: "var(--accent)" }}>WS</span>
              </>}
            </div>
          </div>

          <div className="tab-bar">
            {([
              ["layers", "⊞", "Layers"],
              ["categories", "◈", "Categories"],
              ["filters", "⊟", "Filters"],
              ["import", "⊕", "Import"],
              ["settings", "⚙", "Settings"],
            ] as [LeftTab, string, string][]).map(([tab, icon, label]) => (
              <button key={tab} className={cls("tab-btn", activeLeftTab === tab && "active")} onClick={() => setActiveLeftTab(tab)}>
                <span className="tab-icon">{icon}</span>
                {label}
              </button>
            ))}
          </div>

          <div className="panel-scroll">
            {/* ── Layers tab ── */}
            {activeLeftTab === "layers" && (
              <>
                <div className="section">
                  <SectionLabel>Globe Style</SectionLabel>
                  <div className="style-grid">
                    {(["dark", "light", "satellite", "terrain"] as GlobeTheme[]).map(s => (
                      <button key={s} className={cls("style-btn", globeTheme === s && "active")} onClick={() => setGlobeTheme(s)}>
                        <span className="style-btn-icon">{s === "dark" ? "◑" : s === "light" ? "◐" : s === "satellite" ? "◎" : "◉"}</span>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="section">
                  <SectionLabel>Globe Options</SectionLabel>
                  <CheckRow checked={showAtmosphere} onChange={setShowAtmosphere} icon="○" label="Atmosphere Glow" />
                  <CheckRow checked={showGraticules} onChange={setShowGraticules} icon="⊞" label="Grid Lines" />
                  <CheckRow checked={showClouds} onChange={setShowClouds} icon="◌" label="Cloud Layer" />
                  <CheckRow checked={globeRotation} onChange={setGlobeRotation} icon="↻" label="Auto Rotate" />
                  <CheckRow checked={showTerrain} onChange={setShowTerrain} icon="◬" label="3D Terrain" />
                  <CheckRow checked={showCameras} onChange={setShowCameras} icon="◆" label="Camera Feeds" />
                </div>

                <div className="section">
                  <SectionLabel>Tile Layer</SectionLabel>
                  <CheckRow checked={useTiles} onChange={setUseTiles} icon="⊠" label="Enable Tiles" />
                  {useTiles && (
                    <div className="chip-group" style={{ marginTop: 8 }}>
                      {(Object.keys(TILE_LAYERS) as TileLayerKey[]).map(k => (
                        <button key={k} className={cls("chip", tileLayer === k && "active")} onClick={() => setTileLayer(k)}>
                          {TILE_LAYERS[k].name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="section">
                  <SectionLabel>Data Layers</SectionLabel>
                  <CheckRow checked={layers.showHexBin} onChange={v => setLayer("showHexBin", v)} icon="⬡" label="Heat Clusters" />
                  <CheckRow checked={layers.showRings} onChange={v => setLayer("showRings", v)} icon="◎" label="Pulse Rings" />
                  <CheckRow checked={layers.showHeatmap} onChange={v => setLayer("showHeatmap", v)} icon="▣" label="Density Map" />
                  <CheckRow checked={layers.showArcs} onChange={v => setLayer("showArcs", v)} icon="◜◝" label="Connections" />
                  <CheckRow checked={layers.showPaths} onChange={v => setLayer("showPaths", v)} icon="→" label="Movement" />
                  <CheckRow checked={layers.showPolygons} onChange={v => setLayer("showPolygons", v)} icon="⬡" label="Regions" />
                </div>

                <div className="section">
                  <SectionLabel>Performance</SectionLabel>
                  <div className="quality-group" style={{ marginBottom: 12 }}>
                    {(["low", "medium", "high"] as const).map(q => (
                      <button key={q} className={cls("quality-btn", pointQuality === q && "active")} onClick={() => setPointQuality(q)}>{q}</button>
                    ))}
                  </div>
                  <div className="range-row">
                    <div className="range-label"><span>Max Points</span><span>{maxPoints}</span></div>
                    <input type="range" min={50} max={2000} step={50} value={maxPoints} onChange={e => setMaxPoints(+e.target.value)} />
                  </div>
                  <div className="range-row">
                    <div className="range-label"><span>Point Size</span><span>{pointSize}</span></div>
                    <input type="range" min={1} max={10} value={pointSize} onChange={e => setPointSize(+e.target.value)} />
                  </div>
                  <CheckRow checked={enableClustering} onChange={v => setEnableClustering(v)} icon="◈" label="Point Clustering (disabled: breaks clicks)" />
                </div>
              </>
            )}

            {/* ── Categories tab ── */}
            {activeLeftTab === "categories" && (
              <>
                <div className="section">
                  <SectionLabel>Event Categories</SectionLabel>
                  <div style={{ marginBottom: 8, display: "flex", gap: 6 }}>
                    <button className="chip active" onClick={() => setFilters(Object.fromEntries(Object.keys(filters).map(k => [k, true])))}>All</button>
                    <button className="chip" onClick={() => setFilters(Object.fromEntries(Object.keys(filters).map(k => [k, false])))}>None</button>
                  </div>
                  <div className="pill-group">
                    {Object.keys(filters).map(cat => (
                      <button
                        key={cat}
                        className={cls("pill", !filters[cat] && "pill-inactive")}
                        style={{ background: filters[cat] ? CATEGORY_COLORS[cat] : undefined, color: "white" }}
                        onClick={() => setFilters(f => ({ ...f, [cat]: !f[cat] }))}
                      >
                        {CATEGORY_ICONS[cat]} {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="divider" />

                <div className="section">
                  <SectionLabel>Severity</SectionLabel>
                  {Object.keys(severityFilters).map(sev => (
                    <div
                      key={sev}
                      className="sev-row"
                      style={{ cursor: "pointer", opacity: severityFilters[sev] ? 1 : 0.4 }}
                      onClick={() => setSeverityFilters(f => ({ ...f, [sev]: !f[sev] }))}
                    >
                      <span className="sev-dot" style={{ background: SEVERITY_COLORS[sev] }} />
                      <span className="sev-name">{sev}</span>
                      <span className="sev-count" style={{ color: SEVERITY_COLORS[sev] }}>
                        {analytics.bySeverity[sev] || 0}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="divider" />

                <div className="section">
                  <SectionLabel>Quick Locations</SectionLabel>
                  <div className="chip-group">
                    {QUICK_LOCATIONS.map(loc => (
                      <button key={loc.name} className="chip" onClick={() => focusLocation(loc.lat, loc.lon, 2)}>
                        {loc.name}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* ── Filters tab ── */}
            {activeLeftTab === "filters" && (
              <>
                <div className="section">
                  <SectionLabel>Boolean Mode</SectionLabel>
                  <div className="bool-group">
                    {(["AND", "OR"] as const).map(op => (
                      <button key={op} className={cls("bool-btn", booleanFilter === op && "active")} onClick={() => setBooleanFilter(op)}>{op}</button>
                    ))}
                  </div>
                </div>

                <div className="section">
                  <SectionLabel>Custom Filter (JS Expression)</SectionLabel>
                  <textarea
                    className="text-input"
                    style={{ height: 90, marginBottom: 0 }}
                    value={customFilter}
                    onChange={e => setCustomFilter(e.target.value)}
                    placeholder={"e.g., severity === 'critical' && category === 'conflict'"}
                  />
                </div>

                <div className="section">
                  <SectionLabel>Time Range</SectionLabel>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div>
                      <div className="range-label" style={{ marginBottom: 4 }}><span>From</span></div>
                      <input type="date" className="text-input" value={timeRange[0].toISOString().split("T")[0]} onChange={e => setTimeRange([new Date(e.target.value), timeRange[1]])} />
                    </div>
                    <div>
                      <div className="range-label" style={{ marginBottom: 4 }}><span>To</span></div>
                      <input type="date" className="text-input" value={timeRange[1].toISOString().split("T")[0]} onChange={e => setTimeRange([timeRange[0], new Date(e.target.value)])} />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ── Import tab ── */}
            {activeLeftTab === "import" && (
              <>
                <div className="section">
                  <SectionLabel>Import Data</SectionLabel>
                  <label className="dropzone">
                    <input type="file" accept=".json,.geojson,.csv,.kml" onChange={handleFileImport} style={{ display: "none" }} />
                    <div className="dropzone-icon">⊕</div>
                    <div className="dropzone-label">Click to import file</div>
                    <div className="dropzone-sub">JSON · GeoJSON · CSV · KML</div>
                  </label>
                </div>

                <div className="section">
                  <SectionLabel>Workspaces</SectionLabel>
                  <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                    <button className="full-btn full-btn-green" style={{ flex: 1 }} onClick={saveWorkspace}>
                      ⊕ Save Current
                    </button>
                    <label className="full-btn" style={{ flex: 1, background: "var(--accent)", color: "#fff", cursor: "pointer" }}>
                      ↓ Import
                      <input type="file" accept=".json" onChange={importWorkspace} style={{ display: "none" }} />
                    </label>
                  </div>
                  {workspaces.length === 0 ? (
                    <EmptyState icon="⊟" text="No saved workspaces" sub="Save your current view above" />
                  ) : (
                    workspaces.map(ws => (
                      <div key={ws.id} className={cls("ws-card", currentWorkspace === ws.id && "active")} onClick={() => loadWorkspace(ws.id)}>
                        <div className="ws-top">
                          <span className="ws-name">{ws.name}</span>
                          <span className="ws-date">{ws.createdAt.split("T")[0]}</span>
                        </div>
                        <div className="ws-actions" onClick={e => e.stopPropagation()}>
                          <button className="ws-action-btn" onClick={() => exportWorkspace(ws)}>↓ Export</button>
                          <button className="ws-action-btn" onClick={() => shareWorkspace(ws)}>⊕ Share</button>
                          <button className="ws-action-btn danger" onClick={() => deleteWorkspace(ws.id)}>✕ Delete</button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}

            {/* ── Settings tab ── */}
            {activeLeftTab === "settings" && (
              <>
                <div className="section">
                  <SectionLabel>API Keys</SectionLabel>
                  <p style={{ fontSize: 11, color: "var(--text-2)", marginBottom: 12 }}>
                    Configure your own API keys to enhance data coverage. Keys are stored locally in your browser.
                  </p>
                  
                  <div className="api-key-section">
                    <label className="api-key-label">AISStream Key (Vessels)</label>
                    <input
                      type="password"
                      className="text-input"
                      placeholder="Enter your AISStream API key"
                      value={apiKeys.aisstream || ""}
                      onChange={e => setApiKeys(k => ({ ...k, aisstream: e.target.value }))}
                    />
                    <div className="api-key-hint">Get free key at aisstream.io</div>
                  </div>

                  <div className="api-key-section">
                    <label className="api-key-label">OpenSky Client ID</label>
                    <input
                      type="text"
                      className="text-input"
                      placeholder="OpenSky client ID"
                      value={apiKeys.opensky_id || ""}
                      onChange={e => setApiKeys(k => ({ ...k, opensky_id: e.target.value }))}
                    />
                  </div>

                  <div className="api-key-section">
                    <label className="api-key-label">OpenSky Client Secret</label>
                    <input
                      type="password"
                      className="text-input"
                      placeholder="OpenSky client secret"
                      value={apiKeys.opensky_secret || ""}
                      onChange={e => setApiKeys(k => ({ ...k, opensky_secret: e.target.value }))}
                    />
                    <div className="api-key-hint">Get free credentials at opensky-network.org</div>
                  </div>

                  <div className="api-key-section">
                    <label className="api-key-label">ACLED Key</label>
                    <input
                      type="password"
                      className="text-input"
                      placeholder="ACLED API key"
                      value={apiKeys.acled || ""}
                      onChange={e => setApiKeys(k => ({ ...k, acled: e.target.value }))}
                    />
                    <div className="api-key-hint">Get free key at acleddata.com</div>
                  </div>

                  <div className="api-key-section">
                    <label className="api-key-label">Cesium Ion Token</label>
                    <input
                      type="password"
                      className="text-input"
                      placeholder="Cesium Ion access token"
                      value={apiKeys.cesium || ""}
                      onChange={e => setApiKeys(k => ({ ...k, cesium: e.target.value }))}
                    />
                    <div className="api-key-hint">Get free token at cesium.com/ion</div>
                  </div>
                </div>

                <div className="section">
                  <button 
                    className="full-btn" 
                    style={{ background: "var(--accent)", color: "#fff" }}
                    onClick={() => {
                      const count = Object.keys(apiKeys).filter(k => apiKeys[k]).length;
                      alert(`Saved ${count} API key(s). Restart the server or rebuild the container to apply changes.`);
                    }}
                  >
                    💾 Save API Keys
                  </button>
                  <button 
                    className="full-btn" 
                    style={{ marginTop: 8, background: "var(--border)", color: "var(--text)" }}
                    onClick={() => {
                      if (confirm("Clear all API keys?")) {
                        setApiKeys({});
                      }
                    }}
                  >
                    🗑 Clear All Keys
                  </button>
                </div>

                <div className="section">
                  <SectionLabel>Current Configuration</SectionLabel>
                  <div style={{ fontSize: 11, color: "var(--text-2)", wordBreak: "break-all" }}>
                    {Object.keys(apiKeys).filter(k => apiKeys[k]).length === 0 ? (
                      <div style={{ color: "var(--text-3)" }}>No custom keys configured</div>
                    ) : (
                      <ul style={{ paddingLeft: 16, margin: 0 }}>
                        {Object.entries(apiKeys).filter(([, v]) => v).map(([k]) => (
                          <li key={k} style={{ marginBottom: 4 }}>• {k}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Globe Area ── */}
      <div className="globe-area">
        {/* Topbar */}
        <div className="topbar">
          <div className="topbar-left">
            <button className={cls("panel-toggle", showLeftPanel && "active")} onClick={() => setShowLeftPanel(p => !p)}>
              <span className="panel-toggle-icon">☰</span>
              <kbd>1</kbd>
            </button>
            <button className={cls("panel-toggle", showRightPanel && "active")} onClick={() => setShowRightPanel(p => !p)}>
              <span className="panel-toggle-icon">◫</span>
              <kbd>2</kbd>
            </button>
            <button className={cls("panel-toggle", showBottomPanel && "active")} onClick={() => setShowBottomPanel(p => !p)}>
              <span className="panel-toggle-icon">▾</span>
              <kbd>3</kbd>
            </button>
          </div>

          <div className="topbar-center">
            <div className="search-wrap">
              <input
                type="text"
                className="search-input"
                placeholder="Search locations, events, sources…"
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setShowSearchDropdown(true); }}
                onFocus={() => setShowSearchDropdown(true)}
                onBlur={() => setTimeout(() => setShowSearchDropdown(false), 200)}
                onKeyDown={e => {
                  if (e.key === "Enter") {
                    // Try quick locations first
                    const q = searchQuery.toLowerCase();
                    const loc = searchSuggestions[0];
                    if (loc) {
                      focusLocation(loc.lat, loc.lon, 1.8);
                      setShowSearchDropdown(false);
                      return;
                    }
                    // Try matching a visible event
                    const match = validEvents.find(ev =>
                      (ev.type || "").toLowerCase().includes(q) ||
                      (ev.description || "").toLowerCase().includes(q) ||
                      (ev.country || "").toLowerCase().includes(q) ||
                      (ev.source || "").toLowerCase().includes(q)
                    );
                    if (match) {
                      focusLocation(match.lat, match.lon, 1.2);
                      setSelectedEvent(match);
                      setActiveRightTab("details");
                      setShowSearchDropdown(false);
                    }
                  }
                  if (e.key === "Escape") { setShowSearchDropdown(false); setSearchQuery(""); }
                }}
              />
              <span className="search-icon">⊕</span>
              {showSearchDropdown && searchQuery.length > 1 && (
                <div className="search-dropdown">
                  {searchSuggestions.length > 0 && (
                    <>
                      <div className="search-group-label">LOCATIONS</div>
                      {searchSuggestions.slice(0, 4).map((loc, i) => (
                        <div key={i} className="search-item" onClick={() => { focusLocation(loc.lat, loc.lon, 1.8); setSearchQuery(loc.name); setShowSearchDropdown(false); }}>
                          <span className="search-item-icon">⊕</span>
                          <span className="search-item-name">{loc.name}</span>
                          <span className="search-item-coords">{loc.lat.toFixed(2)}, {loc.lon.toFixed(2)}</span>
                        </div>
                      ))}
                    </>
                  )}
                  {(() => {
                    const q = searchQuery.toLowerCase();
                    const eventMatches = validEvents.filter(ev =>
                      (ev.type || "").toLowerCase().includes(q) ||
                      (ev.description || "").toLowerCase().includes(q) ||
                      (ev.country || "").toLowerCase().includes(q) ||
                      (ev.source || "").toLowerCase().includes(q)
                    ).slice(0, 5);
                    if (eventMatches.length === 0) return null;
                    return (
                      <>
                        <div className="search-group-label">EVENTS</div>
                        {eventMatches.map((ev, i) => (
                          <div key={i} className="search-item" onClick={() => {
                            focusLocation(ev.lat, ev.lon, 1.2);
                            setSelectedEvent(ev);
                            setActiveRightTab("details");
                            setSearchQuery(ev.type || "");
                            setShowSearchDropdown(false);
                          }}>
                            <span className="search-item-icon" style={{ color: CATEGORY_COLORS[ev.category] }}>{CATEGORY_ICONS[ev.category]}</span>
                            <span className="search-item-name">{(ev.type || "").substring(0, 45)}</span>
                            <span className="search-item-coords" style={{ color: SEVERITY_COLORS[ev.severity || "medium"] }}>{ev.severity || "med"}</span>
                          </div>
                        ))}
                      </>
                    );
                  })()}
                  {searchSuggestions.length === 0 && validEvents.filter(ev => (ev.type||"").toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                    <div className="search-item" style={{ color: "var(--text-3)", fontStyle: "italic" }}>
                      <span className="search-item-name">No results for "{searchQuery}"</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="topbar-right">
            {/* Threat badge */}
            <div className="threat-badge">
              <span className="threat-label">THREAT</span>
              <span className="threat-dot" style={{ background: SEVERITY_COLORS[threatLevel], boxShadow: `0 0 6px ${SEVERITY_COLORS[threatLevel]}` }} />
              <span className="threat-value" style={{ color: SEVERITY_COLORS[threatLevel] }}>{threatLevel}</span>
              <span className="threat-label">({threatScore})</span>
            </div>

            {/* Feature toggles */}
            {([
              ["🔄", "Refresh", () => loadData(), false],
              [globeTheme === "dark" ? "◐" : "◑", "Theme", () => setGlobeTheme(t => t === "dark" ? "light" : "dark"), false],
              ["⬡", "Analytics", () => setShowAnalytics(p => !p), showAnalytics],
              ["⊕", "Entities", () => setShowEntityGraph(p => !p), showEntityGraph],
              ["⏲", "Time", () => setShowTimeMachine(p => !p), showTimeMachine],
              ["🎤", "Voice", () => setVoiceEnabled(p => !p), voiceEnabled],
              ["📍", "POI", () => {}, showCollaborators],
              ["👥", "Collab", () => setShowCollaborators(p => !p), showCollaborators],
              ["📄", "Report", () => setShowReportPanel(p => !p), showReportPanel],
              ["📡", "Feed", () => setShowLiveFeed(p => !p), showLiveFeed],
              ["✏", "Draw", () => setShowDrawTools(p => !p), showDrawTools],
              ["⌨", "Help", () => setShowHelp(p => !p), showHelp],
              ["↑", "Share", () => {
                const s = { theme: globeTheme, filters, view: globeEl.current?.pointOfView() };
                navigator.clipboard.writeText(`${window.location.origin}?s=${btoa(JSON.stringify(s))}`);
                alert("Share URL copied!");
              }, false],
            ] as [string, string, () => void, boolean][]).map(([icon, label, action, active]) => (
              <button key={label} className={cls("icon-btn", active && "active")} onClick={action} title={label}>
                <div className="icon-btn-label">
                  <span>{icon}</span>
                  <span className="icon-btn-sub">{label}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Globe canvas */}
        <div className="globe-canvas" style={{ flex: 1, position: "relative" }}>
          {(() => {
            const G = Globe as any;
            return (
              <G
                ref={globeEl}
                globeImageUrl={GLOBE_IMAGES[globeTheme]}
                backgroundImageUrl={NIGHT_SKY}
                backgroundColor={bgColor}
                showAtmosphere={showAtmosphere}
                showGraticules={showGraticules}
                htmlElementsData={validEvents.filter((e: any) => ["air","maritime","space","cameras"].includes(e.category)).slice(0, 250)}
                htmlLat={(d: any) => d.lat}
                htmlLng={(d: any) => d.lon}
                htmlAltitude={0.01}
                htmlElement={(d: any) => {
                  const el = document.createElement("div");
                  const sev = (d as any).severity;
                  const cat = (d as any).category;
                  const icon = cat === "air" ? "✈" : cat === "maritime" ? "⛵" : cat === "space" ? "◎" : cat === "cameras" ? "📷" : "●";
                  const color = cat === "air" ? "#22c55e" : cat === "maritime" ? "#3b82f6" : cat === "space" ? "#14b8a6" : cat === "cameras" ? "#06b6d4" : "#ffd700";
                  const size = sev === "critical" ? 14 : sev === "high" ? 12 : 10;
                  el.innerHTML = icon;
                  el.style.cssText = `
                    color: ${color};
                    font-size: ${size}px;
                    cursor: pointer;
                    user-select: none;
                    filter: drop-shadow(0 0 3px ${color});
                    transition: transform 0.2s;
                    line-height: 1;
                  `;
                  el.title = (d as any).type || "";
                  el.addEventListener("mouseenter", () => { el.style.transform = "scale(1.8)"; el.style.zIndex = "999"; });
                  el.addEventListener("mouseleave", () => { el.style.transform = "scale(1)"; el.style.zIndex = ""; });
                  el.addEventListener("click", () => {
                    if ((d as any).category === "cameras" && (d as any).streamUrl) {
                      const event = new CustomEvent("globe-camera-click", { detail: d, bubbles: true });
                      el.dispatchEvent(event);
                    } else {
                      const event = new CustomEvent("globe-point-click", { detail: d, bubbles: true });
                      el.dispatchEvent(event);
                    }
                  });
                  return el;
                }}
                pointsData={validEvents}
                pointLat={(d: any) => d.lat}
                pointLng={(d: any) => d.lon}
                pointColor={(d: any) => {
                  // Hide dot for categories that use HTML icons
                  if (["air","maritime","space","cameras"].includes(d.category)) return "rgba(0,0,0,0)";
                  const sev = d.severity;
                  const base = CATEGORY_COLORS[d.category] || "#ffd700";
                  if (sev === "critical") return "#ef4444";
                  if (sev === "high") return "#f97316";
                  if (sev === "low") return base + "99";
                  return base;
                }}
                pointAltitude={0.005}
                pointRadius={(d: any) => {
                  const sev = (d as any).severity;
                  const base = pointSize / 100;
                  if (sev === "critical") return base * 1.8;
                  if (sev === "high") return base * 1.3;
                  if (sev === "low") return base * 0.6;
                  return base;
                }}
                pointsMerge={false} /* clustering disabled: merging destroys click data */ /* clustering disabled: merging destroys click data */
                onPointClick={(p: any) => {
                  if (!p?.id) return;
                  if (p.category === "cameras" && p.streamUrl) {
                    setCameraViewer({ event: p, url: p.streamUrl });
                  } else {
                    setSelectedEvent(p);
                    setActiveRightTab("details");
                  }
                }}
                onPointHover={(h: any) => setHoveredEvent(h || null)}
                onGlobeClick={({ lat, lng }: { lat: number; lng: number }) => {
                  if (collaborationRoom && socketRef.current) {
                    socketRef.current.emit("collab:cursor", { room: collaborationRoom, lat, lng });
                  }
                }}
                hexBinPointsData={hexBinData}
                hexBinPointLat={(d: any) => d.lat}
                hexBinPointLng={(d: any) => d.lon}
                hexBinPointWeight={1}
                hexBinResolution={2}
                hexBinColor={(d: any) => {
                  const n = d.points.length;
                  return n > 30 ? "#ef4444" : n > 20 ? "#f97316" : n > 10 ? "#eab308" : "#22c55e";
                }}
                ringsData={ringsData}
                ringLat={(d: any) => d.lat}
                ringLng={(d: any) => d.lon}
                ringColor={(d: any) => {
                  const sev = d.severity;
                  if (sev === "critical") return "rgba(239,68,68,0.8)";
                  if (sev === "high") return "rgba(249,115,22,0.7)";
                  return CATEGORY_COLORS[d.category] || "rgba(255,200,0,0.5)";
                }}
                ringAltitude={0.005}
                ringRadius={0.3}
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
                heatmapsData={heatmapData}
                heatmapPointLat={(p: any) => p.lat}
                heatmapPointLng={(p: any) => p.lon}
                heatmapPointWeight={1}
                heatmapBandwidth={2}
                pathsData={pathsData}
                pathPoints={(d: any) => d.path}
                pathPointLat={(p: any) => p[0]}
                pathPointLng={(p: any) => p[1]}
                pathColor={(d: any) => d.color}
                pathStroke={1.5}
                animateIn
                enablePointerInteraction
              />
            );
          })()}

          {/* Hover tooltip */}
          {hoveredEvent && !selectedEvent && (
            <div className="hover-tooltip" style={{ bottom: showBottomPanel ? 92 : 20, left: showLeftPanel ? 300 : 20 }}>
              <div className="ht-header">
                <span className="ht-icon">{CATEGORY_ICONS[hoveredEvent.category]}</span>
                <div>
                  <div className="ht-type">{hoveredEvent.type}</div>
                  <div className="ht-cat" style={{ color: CATEGORY_COLORS[hoveredEvent.category] }}>{hoveredEvent.category.toUpperCase()}</div>
                </div>
              </div>
              <div className="ht-date">{hoveredEvent.date}</div>
              <div className="ht-desc">{hoveredEvent.description?.substring(0, 100)}…</div>
            </div>
          )}

          {/* Loading overlay */}
          {loading && (
            <div className="loading-overlay">
              <div className="loading-card">
                <div className="loading-spinner" />
                <span className="loading-text">Loading OSINT Data…</span>
              </div>
            </div>
          )}

          {/* Voice transcript */}
          {voiceEnabled && transcript && (
            <div className="voice-transcript">🎤 {transcript}</div>
          )}
        </div>

        {/* Bottom timeline */}
        {showBottomPanel && (
          <div className="panel panel-bottom">
            <div className="timeline-bar">
              <div className="timeline-controls">
                <button
                  className="play-btn"
                  style={{ background: isPlaying ? "var(--red)" : "var(--accent)" }}
                  onClick={() => setIsPlaying(p => !p)}
                >
                  {isPlaying ? "⏸" : "▶"}
                </button>
                <select value={playbackSpeed} onChange={e => setPlaybackSpeed(+e.target.value)}>
                  <option value={0.5}>0.5×</option>
                  <option value={1}>1×</option>
                  <option value={2}>2×</option>
                  <option value={5}>5×</option>
                </select>
                <input type="range" min={0} max={100} value={timelinePosition} onChange={e => setTimelinePosition(+e.target.value)} style={{ flex: 1 }} />
                <div className="timeline-meta">
                  <span>{timeRange[0].toLocaleDateString()}</span>
                  {" → "}
                  <span>{timeRange[1].toLocaleDateString()}</span>
                  {"  "}
                  <span style={{ color: "var(--green)" }}>{validEvents.length} events</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Right Panel ── */}
      {showRightPanel && (
        <div className="panel panel-right">
          <div className="tab-bar">
            {([
              ["details", "◉", "Details"],
              ["analytics", "⬡", "Analytics"],
              ["entities", "⊕", "Entities"],
              ["timeline", "≡", "Timeline"],
            ] as [RightTab, string, string][]).map(([tab, icon, label]) => (
              <button key={tab} className={cls("tab-btn", activeRightTab === tab && "active")} onClick={() => setActiveRightTab(tab)}>
                <span className="tab-icon">{icon}</span>
                {label}
              </button>
            ))}
          </div>

          <div className="panel-scroll">
            {/* ── Details ── */}
            {activeRightTab === "details" && (
              selectedEvent ? (
                <div>
                  <div className="event-header">
                    <div className="event-title">
                      <span className="event-icon" style={{ color: CATEGORY_COLORS[selectedEvent.category] }}>{CATEGORY_ICONS[selectedEvent.category]}</span>
                      <div>
                        <div className="event-type">{selectedEvent.type}</div>
                        <span className="event-cat-badge" style={{ background: `${CATEGORY_COLORS[selectedEvent.category]}22`, color: CATEGORY_COLORS[selectedEvent.category] }}>
                          {selectedEvent.category.toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <button style={{ background: "none", border: "none", color: "var(--text-3)", cursor: "pointer", fontSize: "1rem" }} onClick={() => setSelectedEvent(null)}>✕</button>
                  </div>

                  <div className="event-date">{selectedEvent.date}</div>
                  <div className="event-desc">{selectedEvent.description}</div>

                  <div className="event-grid">
                    <div className="event-field">
                      <div className="event-field-label">Coordinates</div>
                      <div className="event-field-value" style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem" }}>
                        {selectedEvent.lat.toFixed(4)}, {selectedEvent.lon.toFixed(4)}
                      </div>
                    </div>
                    <div className="event-field">
                      <div className="event-field-label">Severity</div>
                      <div className="event-field-value" style={{ color: SEVERITY_COLORS[selectedEvent.severity || "medium"], fontFamily: "var(--font-mono)", textTransform: "uppercase" }}>
                        {selectedEvent.severity || "medium"}
                      </div>
                    </div>
                    <div className="event-field">
                      <div className="event-field-label">Source</div>
                      <div className="event-field-value">{selectedEvent.source || "Unknown"}</div>
                    </div>
                    <div className="event-field">
                      <div className="event-field-label">Country</div>
                      <div className="event-field-value">{selectedEvent.country || "N/A"}</div>
                    </div>
                  </div>

                  <div className="event-actions">
                    <button className="action-btn action-btn-primary" onClick={() => {
                      saveAs(new Blob([JSON.stringify(selectedEvent, null, 2)], { type: "application/json" }), `event-${selectedEvent.id}.json`);
                    }}>↓ JSON</button>
                    <button className="action-btn action-btn-ghost" onClick={exportKML}>⊞ KML</button>
                    <button className="action-btn action-btn-ghost" onClick={exportGeoJSON}>⊕ GeoJSON</button>
                    <button className="action-btn action-btn-ghost" onClick={() => focusLocation(selectedEvent.lat, selectedEvent.lon, 0.8)}>⊕ Zoom</button>
                  </div>

                  {/* Nearby events */}
                  {(() => {
                    const nearby = validEvents.filter(e =>
                      e.id !== selectedEvent.id &&
                      Math.abs(e.lat - selectedEvent.lat) < 5 &&
                      Math.abs(e.lon - selectedEvent.lon) < 5
                    ).slice(0, 6);
                    if (nearby.length === 0) return null;
                    return (
                      <div style={{ marginTop: 14 }}>
                        <div style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "1px", color: "var(--text-3)", textTransform: "uppercase", marginBottom: 6 }}>
                          Nearby Events ({nearby.length})
                        </div>
                        {nearby.map(e => (
                          <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderBottom: "1px solid var(--border)", cursor: "pointer" }}
                            onClick={() => { setSelectedEvent(e); focusLocation(e.lat, e.lon, 1.5); }}>
                            <span style={{ color: CATEGORY_COLORS[e.category], fontSize: "0.8rem" }}>{CATEGORY_ICONS[e.category]}</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: "0.7rem", color: "var(--text-1)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.type}</div>
                              <div style={{ fontSize: "0.62rem", color: "var(--text-3)" }}>{e.source} · {new Date(e.date).toLocaleDateString()}</div>
                            </div>
                            <span style={{ fontSize: "0.6rem", color: SEVERITY_COLORS[e.severity || "medium"], flexShrink: 0 }}>● {e.severity || "med"}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })()}

                  {/* Nearby events */}
                  {(() => {
                    const nearby = validEvents.filter(e =>
                      e.id !== selectedEvent.id &&
                      Math.abs(e.lat - selectedEvent.lat) < 5 &&
                      Math.abs(e.lon - selectedEvent.lon) < 5
                    ).slice(0, 6);
                    if (nearby.length === 0) return null;
                    return (
                      <div style={{ marginTop: 14 }}>
                        <div style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "1px", color: "var(--text-3)", textTransform: "uppercase", marginBottom: 6 }}>
                          Nearby Events ({nearby.length})
                        </div>
                        {nearby.map(e => (
                          <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderBottom: "1px solid var(--border)", cursor: "pointer" }}
                            onClick={() => { setSelectedEvent(e); focusLocation(e.lat, e.lon, 1.5); }}>
                            <span style={{ color: CATEGORY_COLORS[e.category], fontSize: "0.8rem" }}>{CATEGORY_ICONS[e.category]}</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: "0.7rem", color: "var(--text-1)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.type}</div>
                              <div style={{ fontSize: "0.62rem", color: "var(--text-3)" }}>{e.source} · {new Date(e.date).toLocaleDateString()}</div>
                            </div>
                            <span style={{ fontSize: "0.6rem", color: SEVERITY_COLORS[e.severity || "medium"], flexShrink: 0 }}>● {e.severity || "med"}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <EmptyState icon="◉" text="Select an event on the globe" sub="Click any point to inspect it" />
              )
            )}

            {/* ── Analytics ── */}
            {activeRightTab === "analytics" && (
              <>
                <div className="stat-card">
                  <div className="stat-num">{analytics.total}</div>
                  <div className="stat-sub">Avg {analytics.avgPerDay} events / day</div>
                </div>

                <div className="section">
                  <SectionLabel>By Category</SectionLabel>
                  {Object.entries(analytics.byCategory).sort((a, b) => b[1] - a[1]).map(([cat, count]) => (
                    <div key={cat} className="cat-row">
                      <span className="cat-icon" style={{ color: CATEGORY_COLORS[cat] }}>{CATEGORY_ICONS[cat]}</span>
                      <span className="cat-name">{cat}</span>
                      <span className="cat-count" style={{ color: CATEGORY_COLORS[cat] }}>{count}</span>
                      <div style={{ width: 48 }}>
                        <div className="bar-track">
                          <div className="bar-fill" style={{ background: CATEGORY_COLORS[cat], width: `${Math.round((count / analytics.total) * 100)}%` }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="section">
                  <SectionLabel>By Severity</SectionLabel>
                  {Object.entries(analytics.bySeverity).map(([sev, count]) => (
                    <div key={sev} className="sev-row">
                      <span className="sev-dot" style={{ background: SEVERITY_COLORS[sev] }} />
                      <span className="sev-name">{sev}</span>
                      <span className="sev-count" style={{ color: SEVERITY_COLORS[sev] }}>{count}</span>
                    </div>
                  ))}
                </div>

                <div className="section">
                  <SectionLabel>Export</SectionLabel>
                  <div style={{ display: "flex", gap: 7 }}>
                    <button className="action-btn action-btn-primary" style={{ flex: 1 }} onClick={exportCSV}>↓ CSV</button>
                    <button className="action-btn action-btn-ghost" style={{ flex: 1 }} onClick={exportGeoJSON}>GeoJSON</button>
                    <button className="action-btn action-btn-ghost" style={{ flex: 1 }} onClick={exportKML}>KML</button>
                  </div>
                </div>
              </>
            )}

            {/* ── Entities ── */}
            {activeRightTab === "entities" && (
              entityGraph.nodes.length === 0 ? (
                <EmptyState icon="⊕" text="No entity data" sub="Add entities to events to build the graph" />
              ) : (
                <>
                  <div className="section">
                    <SectionLabel>Nodes: {entityGraph.nodes.length} · Links: {entityGraph.links.length}</SectionLabel>
                    <div className="pill-group">
                      {entityGraph.nodes.slice(0, 40).map((n, i) => (
                        <span key={i} className="entity-chip"
                          style={{
                            background: n.type === "entity" ? "rgba(239,68,68,0.15)" : "rgba(59,130,246,0.15)",
                            color: n.type === "entity" ? "#ef4444" : "#3b82f6",
                          }}>
                          {n.id}{n.events > 0 && <span style={{ opacity: 0.6 }}> ×{n.events}</span>}
                        </span>
                      ))}
                    </div>
                  </div>
                </>
              )
            )}

            {/* ── Timeline ── */}
            {activeRightTab === "timeline" && (() => {
              const sorted = [...searchFilteredEvents].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
              const oldest = sorted.length > 0 ? new Date(sorted[sorted.length - 1].date) : new Date();
              const newest = sorted.length > 0 ? new Date(sorted[0].date) : new Date();
              const fmtDate = (d: Date) => d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
              const fmtTime = (d: Date) => {
                const diff = Date.now() - d.getTime();
                if (diff < 3600000) return `${Math.round(diff/60000)}m ago`;
                if (diff < 86400000) return `${Math.round(diff/3600000)}h ago`;
                return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
              };
              // Group by day
              const byDay: Record<string, typeof sorted> = {};
              sorted.slice(0, 100).forEach(e => {
                const day = new Date(e.date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
                if (!byDay[day]) byDay[day] = [];
                byDay[day].push(e);
              });
              return (
                <div>
                  <div style={{ marginBottom: 10 }}>
                    <SectionLabel>{searchFilteredEvents.length} Events</SectionLabel>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.65rem", color: "var(--text-3)", fontFamily: "var(--font-mono)", marginTop: 4 }}>
                      <span>{fmtDate(oldest)}</span>
                      <span>{fmtDate(newest)}</span>
                    </div>
                    <input
                      type="range" min={0} max={100} value={timelinePosition}
                      onChange={e => setTimelinePosition(+e.target.value)}
                      style={{ width: "100%", marginTop: 6, accentColor: "var(--accent)" }}
                    />
                    <div style={{ fontSize: "0.65rem", color: "var(--accent)", fontFamily: "var(--font-mono)", textAlign: "center" }}>
                      Showing {validEvents.length} of {searchFilteredEvents.length} events
                    </div>
                  </div>
                  {Object.entries(byDay).map(([day, dayEvents]) => (
                    <div key={day}>
                      <div style={{ fontSize: "0.62rem", fontWeight: 700, letterSpacing: "1px", color: "var(--text-3)", textTransform: "uppercase", padding: "8px 0 4px", borderBottom: "1px solid var(--border)" }}>
                        {day} · {dayEvents.length} events
                      </div>
                      {dayEvents.map((e, i) => (
                        <div
                          key={e.id || i}
                          className={cls("tl-item", selectedEvent?.id === e.id && "selected")}
                          style={{ borderLeftColor: selectedEvent?.id === e.id ? "var(--accent)" : CATEGORY_COLORS[e.category] }}
                          onClick={() => { setSelectedEvent(e); focusLocation(e.lat, e.lon, 1.5); setActiveRightTab("details"); }}
                        >
                          <div className="tl-item-top">
                            <span className="tl-item-title">{(e.type || "").substring(0, 45)}</span>
                            <span className="tl-item-date">{fmtTime(new Date(e.date))}</span>
                          </div>
                          <div className="tl-item-meta">
                            <span style={{ color: CATEGORY_COLORS[e.category] }}>{CATEGORY_ICONS[e.category]} {e.category}</span>
                            <span style={{ color: SEVERITY_COLORS[e.severity || "medium"] }}>● {e.severity || "medium"}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ── Floating panels ── */}

      {/* Analytics overlay */}
      {showAnalytics && (
        <FloatPanel title="⬡ Deep Analytics" onClose={() => setShowAnalytics(false)} style={{ top: 80, left: 20, width: 400 }}>
          <div className="stat-card" style={{ marginBottom: 12 }}>
            <div className="stat-num">{analytics.total}</div>
            <div className="stat-sub">Total events · {analytics.avgPerDay}/day avg</div>
          </div>
          <SectionLabel>Category Breakdown</SectionLabel>
          {Object.entries(analytics.byCategory).sort((a, b) => b[1] - a[1]).map(([cat, count]) => (
            <div key={cat} className="cat-row">
              <span className="cat-icon" style={{ color: CATEGORY_COLORS[cat] }}>{CATEGORY_ICONS[cat]}</span>
              <span className="cat-name">{cat}</span>
              <span className="cat-count" style={{ color: CATEGORY_COLORS[cat] }}>{count}</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", color: "var(--text-3)" }}>
                {((count / analytics.total) * 100).toFixed(0)}%
              </span>
            </div>
          ))}
        </FloatPanel>
      )}

      {/* Entity graph overlay */}
      {showEntityGraph && (
        <FloatPanel title="⊕ Entity Graph" onClose={() => setShowEntityGraph(false)} style={{ top: 80, left: 20, width: 440, maxHeight: "60vh" }}>
          {entityGraph.nodes.length === 0 ? (
            <EmptyState icon="⊕" text="No entities in current data" />
          ) : (
            <div className="pill-group">
              {entityGraph.nodes.map((n, i) => (
                <span key={i} className="entity-chip"
                  style={{
                    padding: "8px 14px", borderRadius: 20,
                    background: n.type === "entity" ? "rgba(239,68,68,0.15)" : "rgba(59,130,246,0.15)",
                    color: n.type === "entity" ? "#ef4444" : "#3b82f6",
                  }}>
                  {n.id}
                </span>
              ))}
            </div>
          )}
        </FloatPanel>
      )}

      {/* Time Machine */}
      {showTimeMachine && (
        <FloatPanel title="⏲ Time Machine" onClose={() => setShowTimeMachine(false)} style={{ top: 80, left: 20, width: 360 }}>
          <div style={{ marginBottom: 16 }}>
            <div className="range-label" style={{ marginBottom: 6 }}><span>Historical Date</span><span>{historicalDate.toLocaleDateString()}</span></div>
            <input type="date" className="text-input" value={historicalDate.toISOString().split("T")[0]} onChange={e => setHistoricalDate(new Date(e.target.value))} />
          </div>
          <CheckRow checked={timeLapseMode} onChange={setTimeLapseMode} icon="▶" label="Time-lapse Mode" />
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button className="full-btn" style={{ flex: 1, background: "var(--surface2)", color: "var(--text-2)" }} onClick={() => setHistoricalDate(new Date(historicalDate.getTime() - 86400000))}>
              ← Prev
            </button>
            <button className="full-btn full-btn-primary" style={{ flex: 1 }} onClick={() => setHistoricalDate(new Date())}>Today</button>
            <button className="full-btn" style={{ flex: 1, background: "var(--surface2)", color: "var(--text-2)" }} onClick={() => setHistoricalDate(new Date(historicalDate.getTime() + 86400000))}>
              Next →
            </button>
          </div>
        </FloatPanel>
      )}

      {/* Report panel */}
      {showReportPanel && (
        <FloatPanel title="📄 Generate Report" onClose={() => setShowReportPanel(false)} style={{ top: 80, right: 20, width: 340 }}>
          <SectionLabel>Report Type</SectionLabel>
          <div className="report-grid">
            {(["summary", "detailed", "analytics"] as ReportType[]).map(t => (
              <button key={t} className={cls("report-btn", reportType === t && "active")} onClick={() => setReportType(t)}>
                <div className="report-btn-icon">{t === "summary" ? "◉" : t === "detailed" ? "≡" : "⬡"}</div>
                <div className="report-btn-label">{t}</div>
              </button>
            ))}
          </div>
          <div className="report-desc">
            {reportType === "summary" && "Quick overview: category counts, severity breakdown, and key stats."}
            {reportType === "detailed" && "Full event-by-event listing with all fields and metadata."}
            {reportType === "analytics" && "Statistical analysis with distribution percentages."}
          </div>
          <button className="full-btn" style={{ background: "#7c3aed", color: "#fff" }} onClick={generateReport}>
            ↓ Download Markdown
          </button>
        </FloatPanel>
      )}

      {/* Draw tools */}
      {showDrawTools && (
        <FloatPanel title="✏ Drawing Tools" onClose={() => setShowDrawTools(false)} style={{ top: 80, left: 20, width: 300 }}>
          <SectionLabel>Mode</SectionLabel>
          <div className="draw-grid">
            {(["none", "circle", "polygon", "line"] as DrawMode[]).map(m => (
              <button key={m} className={cls("draw-btn", drawMode === m && "active")} onClick={() => setDrawMode(m)}>
                <div className="draw-btn-icon">{m === "none" ? "↑" : m === "circle" ? "○" : m === "polygon" ? "⬡" : "→"}</div>
                <div className="draw-btn-label">{m === "none" ? "select" : m}</div>
              </button>
            ))}
          </div>
          {drawMode !== "none" && (
            <div style={{ marginTop: 12, padding: "10px 12px", background: "var(--surface1)", borderRadius: 6, fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--text-3)" }}>
              Click on the globe to place {drawMode} points
            </div>
          )}
          {drawnShapes.length > 0 && (
            <>
              <div className="divider" />
              <SectionLabel>{drawnShapes.length} Shapes</SectionLabel>
              {drawnShapes.map(s => (
                <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-2)" }}>{s.type} · {s.points.length}pts</span>
                  <button style={{ background: "none", border: "none", color: "var(--red)", cursor: "pointer", fontSize: "0.8rem" }} onClick={() => setDrawnShapes(x => x.filter(y => y.id !== s.id))}>✕</button>
                </div>
              ))}
            </>
          )}
        </FloatPanel>
      )}

      {/* Help */}
      {showHelp && (
        <FloatPanel title="⌨ Keyboard Shortcuts" onClose={() => setShowHelp(false)} style={{ top: 80, right: 20, width: 340 }}>
          <div className="shortcut-grid">
            {[["1", "Left panel"], ["2", "Right panel"], ["3", "Timeline"], ["Space", "Play/Pause"], ["R", "Refresh data"], ["H", "Toggle theme"], ["Esc", "Close event"], ["F", "Fullscreen"]].map(([key, action]) => (
              <div key={key} className="shortcut-item">
                <kbd style={{ background: "var(--accent)", color: "#fff", padding: "4px 8px", borderRadius: 4, fontSize: "0.72rem" }}>{key}</kbd>
                <span className="shortcut-action">{action}</span>
              </div>
            ))}
          </div>
          {voiceEnabled && (
            <>
              <div className="divider" />
              <SectionLabel>Voice Commands</SectionLabel>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem", color: "var(--text-3)", lineHeight: 1.8 }}>
                "go to [location]" · "zoom in/out"<br />
                "dark mode" · "light mode" · "refresh"
              </div>
            </>
          )}
        </FloatPanel>
      )}

      {/* Collaboration */}
      {showCollaborators && (
        <FloatPanel title="👥 Collaboration" onClose={() => setShowCollaborators(false)} style={{ top: 80, right: showRightPanel ? 340 : 20, width: 280 }}>
          {!collaborationRoom ? (
            <>
              <div style={{ marginBottom: 10 }}>
                <div className="range-label" style={{ marginBottom: 5 }}><span>Display Name</span></div>
                <input type="text" className="text-input" value={username} onChange={e => setUsername(e.target.value)} placeholder="Your name" />
              </div>
              <div style={{ marginBottom: 12 }}>
                <div className="range-label" style={{ marginBottom: 5 }}><span>Room</span></div>
                <input type="text" className="text-input" value={roomInput} onChange={e => setRoomInput(e.target.value)} placeholder="Room name" />
              </div>
              <button className="full-btn full-btn-primary" onClick={joinCollaboration}>Join Room</button>
            </>
          ) : (
            <>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--green)", marginBottom: 12 }}>
                ● Connected · {collaborationRoom}
              </div>
              <SectionLabel>Active Users ({collaborators.length + 1})</SectionLabel>
              <div className="collab-user" style={{ color: "var(--accent)" }}>• {username} (you)</div>
              {collaborators.map(c => (
                <div key={c.id} className="collab-user" style={{ color: c.color }}>• {c.name}</div>
              ))}
              <div style={{ marginTop: 16 }}>
                <button className="full-btn full-btn-red" onClick={leaveCollaboration}>Leave Room</button>
              </div>
            </>
          )}
        </FloatPanel>
      )}

      {/* Live Feed */}
      {showLiveFeed && (
        <div className="float-panel live-feed">
          <div className="float-header">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span className="live-dot" style={{ background: "var(--red)", boxShadow: "0 0 6px var(--red)" }} />
              <span className="float-title">Live Incidents</span>
            </div>
            <button className="float-close" onClick={() => setShowLiveFeed(false)}>✕</button>
          </div>
          <div style={{ overflow: "auto", maxHeight: 280, padding: "10px 14px" }}>
            {liveFeedItems.length === 0 ? (
              <div style={{ textAlign: "center", color: "var(--text-3)", padding: "20px", fontFamily: "var(--font-mono)", fontSize: "0.72rem" }}>
                Awaiting live feed…
              </div>
            ) : liveFeedItems.map(item => (
              <div key={item.id} className="feed-item" 
                style={{ borderLeftColor: SEVERITY_COLORS[item.severity] || "var(--accent)", cursor: (item as any).event ? "pointer" : "default" }}
                onClick={() => {
                  const ev = (item as any).event;
                  if (ev) { setSelectedEvent(ev); focusLocation(ev.lat, ev.lon, 1.5); setActiveRightTab("details"); }
                }}>
                <div className="feed-item-top">
                  <span className="feed-type" style={{ color: CATEGORY_COLORS[item.type.toLowerCase()] || "var(--text-2)" }}>{item.type}</span>
                  <span className="feed-time">{item.time.toLocaleTimeString()}</span>
                </div>
                <div className="feed-msg">{item.message}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Camera Viewer Modal ── */}
      {cameraViewer && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 9999,
          background: "rgba(0,0,0,0.85)",
          display: "flex", alignItems: "center", justifyContent: "center",
          backdropFilter: "blur(4px)",
        }} onClick={() => setCameraViewer(null)}>
          <div style={{
            background: "#0f172a",
            border: "1px solid #1e293b",
            borderRadius: 12, overflow: "hidden",
            width: "min(900px, 90vw)",
            boxShadow: "0 25px 60px rgba(0,0,0,0.8)",
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid #1e293b" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#fff" }}>{cameraViewer.event.type}</div>
                <div style={{ fontSize: "0.7rem", color: "#64748b", marginTop: 2 }}>
                  {cameraViewer.event.source} · {cameraViewer.event.country || ""} · {cameraViewer.event.lat.toFixed(4)}, {cameraViewer.event.lon.toFixed(4)}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <a href={cameraViewer.url} target="_blank" rel="noopener noreferrer"
                  style={{ padding: "6px 12px", background: "#3b82f6", color: "#fff", borderRadius: 6, fontSize: "0.72rem", textDecoration: "none", fontWeight: 600 }}>
                  ↗ Open
                </a>
                <button onClick={() => setCameraViewer(null)}
                  style={{ padding: "6px 12px", background: "#1e293b", color: "#fff", border: "none", borderRadius: 6, fontSize: "0.72rem", cursor: "pointer" }}>
                  ✕
                </button>
              </div>
            </div>
            <div style={{ position: "relative", paddingBottom: "56.25%", height: 0 }}>
              <iframe
                src={cameraViewer.url}
                style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={cameraViewer.event.type}
              />
            </div>
            <div style={{ padding: "10px 18px", fontSize: "0.7rem", color: "#64748b", borderTop: "1px solid #1e293b" }}>
              {cameraViewer.event.description}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
