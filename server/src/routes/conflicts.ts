import { Router } from "express";
import { fetchGDELTConflicts, fetchUCDPConflicts, fetchReliefWebConflicts, EventData } from "../services/conflict";
import { fetchACLEDEvents } from "../services/acled";
import { fetchVesselData, fetchMarineAlerts, fetchVesselPositions, fetchNavalVessels, fetchPiracyZones } from "../services/maritime";
import { fetchAirTraffic, fetchISSTracking, fetchMilitaryAircraft, fetchRocketLaunches as fetchAirRocketLaunches } from "../services/air";
import { fetchCyberThreats, fetchThreatFeeds, fetchGreyNoiseIntel, fetchShodanIntel, fetchCensysIntel, fetchVulnerabilityIntel } from "../services/cyber";
import { fetchRSSNews, fetchDefenseNews, fetchUkraineNews, fetchMiddleEastNews } from "../services/rss";
import { fetchStarlinkSatellites, fetchGPSSatellites, fetchMilitarySatellites, fetchSatelliteImagerySources } from "../services/satellites";
import { fetchHackerNewsIntel, fetchRedditGeoPosts, fetchGlobalIncidents } from "../services/osint";
import { fetchInfrastructure, fetchPowerGrid, fetchCriticalInfrastructure } from "../services/land";
import { fetchISSTracking as fetchSpaceISS, fetchN2YOSatellites, fetchSpaceDebris, fetchSatellitePasses, fetchRocketLaunches } from "../services/space";
import { fetchSDRSignals, fetchRadioHFMidEast, fetchRadioUkraine, fetchGlobalSDRNodes, fetchHFActiveFrequencies, fetchAirbandFrequencies, fetchSignalIntel } from "../services/radio";
import { fetchADSBExchange, fetchMilitaryAircraft as fetchADSBMil, fetchPrivateJets } from "../services/adsb";
import { fetchEarthquakes, fetchWeatherAlerts, fetchVolcanoAlerts, fetchNuclearFacilities } from "../services/geo";
import { fetchTwitterGeoAlerts, fetchRedditLiveThreads, fetchTelegramChannels, fetchWebIntrusionAlerts, fetchDarkWebAlerts } from "../services/social";
import { fetchAllScrapedData, fetchEMSCearthquakes, fetchUSGSearthquakes, fetchNOAAweather, fetchOpenSkyNetwork, fetchAISreception } from "../services/scraper";
import { fetchPublicCameras, fetchEarthCamFeeds, fetchWebCamTaxi, fetchWindyCameras } from "../services/cameras";
import { fetchGlobalNews } from "../services/news";
import { fetchGdeltevents } from "../services/gdelt";

const router = Router();

// ── Cache Layer ───────────────────────────────────────────────────────────────
interface CacheEntry { data: any; ts: number; }
const CACHE: Map<string, CacheEntry> = new Map();

// Tiered TTLs: fast-changing data refreshes more often
const TTL = {
  live: 30_000,      // 30s  — aircraft, earthquakes, ISS
  medium: 120_000,   // 2min — news feeds, GDELT
  slow: 600_000,     // 10min — static/curated data
};

async function cached<T>(key: string, ttl: number, fn: () => Promise<T>): Promise<T> {
  const hit = CACHE.get(key);
  if (hit && Date.now() - hit.ts < ttl) return hit.data as T;
  try {
    const data = await fn();
    CACHE.set(key, { data, ts: Date.now() });
    return data;
  } catch (err) {
    if (hit) return hit.data as T; // serve stale on error
    throw err;
  }
}

// ── Grouped fetchers ──────────────────────────────────────────────────────────

async function getConflictEvents(): Promise<EventData[]> {
  return cached("conflicts", TTL.medium, async () => {
    const results = await Promise.allSettled([
      fetchACLEDEvents(),
      fetchGDELTConflicts(), fetchUCDPConflicts(), fetchReliefWebConflicts(),
      fetchRSSNews(), fetchDefenseNews(), fetchUkraineNews(), fetchMiddleEastNews(),
      fetchRedditGeoPosts(), fetchHackerNewsIntel(), fetchGlobalIncidents(),
      fetchRedditLiveThreads(), fetchTelegramChannels(), fetchAllScrapedData(),
    ]);
    return results.flatMap(r => r.status === "fulfilled" ? r.value : []);
  });
}

async function getMaritimeEvents(): Promise<EventData[]> {
  return cached("maritime", TTL.medium, async () => {
    const results = await Promise.allSettled([
      fetchVesselData(), fetchMarineAlerts(), fetchVesselPositions(),
      fetchNavalVessels(), fetchPiracyZones(),
    ]);
    return results.flatMap(r => r.status === "fulfilled" ? r.value : []);
  });
}

async function getAirEvents(): Promise<EventData[]> {
  return cached("air", TTL.live, async () => {
    const results = await Promise.allSettled([
      fetchAirTraffic(), fetchMilitaryAircraft(), fetchADSBExchange(),
      fetchOpenSkyNetwork(),
    ]);
    return results.flatMap(r => r.status === "fulfilled" ? r.value : []);
  });
}

async function getCyberEvents(): Promise<EventData[]> {
  return cached("cyber", TTL.medium, async () => {
    const results = await Promise.allSettled([
      fetchCyberThreats(), fetchThreatFeeds(), fetchGreyNoiseIntel(), fetchShodanIntel(),
      fetchTwitterGeoAlerts(),
    ]);
    return results.flatMap(r => r.status === "fulfilled" ? r.value : []);
  });
}

async function getLandEvents(): Promise<EventData[]> {
  return cached("land", TTL.medium, async () => {
    const results = await Promise.allSettled([
      fetchInfrastructure(), fetchPowerGrid(), fetchCriticalInfrastructure(),
      fetchEarthquakes(), fetchWeatherAlerts(), fetchVolcanoAlerts(), fetchNuclearFacilities(),
      fetchUSGSearthquakes(), fetchEMSCearthquakes(), fetchNOAAweather(),
    ]);
    return results.flatMap(r => r.status === "fulfilled" ? r.value : []);
  });
}

async function getSpaceEvents(): Promise<EventData[]> {
  return cached("space", TTL.live, async () => {
    const results = await Promise.allSettled([
      fetchSpaceISS(), fetchStarlinkSatellites(), fetchGPSSatellites(),
      fetchMilitarySatellites(), fetchSatelliteImagerySources(), fetchRocketLaunches(),
    ]);
    return results.flatMap(r => r.status === "fulfilled" ? r.value : []);
  });
}

async function getRadioEvents(): Promise<EventData[]> {
  return cached("radio", TTL.slow, async () => {
    const results = await Promise.allSettled([
      fetchSDRSignals(), fetchRadioHFMidEast(), fetchRadioUkraine(), fetchGlobalSDRNodes(),
    ]);
    return results.flatMap(r => r.status === "fulfilled" ? r.value : []);
  });
}

async function getCameraEvents(): Promise<EventData[]> {
  return cached("cameras", TTL.slow, async () => {
    const results = await Promise.allSettled([fetchPublicCameras(), fetchWindyCameras()]);
    return results.flatMap(r => r.status === "fulfilled" ? r.value : []);
  });
}

// ── Routes ───────────────────────────────────────────────────────────────────

router.get("/", async (_req, res) => {
  try {
    const [conflicts, maritime, air, cyber, land, space, radio, cameras] = await Promise.allSettled([
      getConflictEvents(), getMaritimeEvents(), getAirEvents(), getCyberEvents(),
      getLandEvents(), getSpaceEvents(), getRadioEvents(), getCameraEvents(),
    ]);

    const allEvents: EventData[] = [
      ...(conflicts.status === "fulfilled" ? conflicts.value : []),
      ...(maritime.status === "fulfilled" ? maritime.value : []),
      ...(air.status === "fulfilled" ? air.value : []),
      ...(cyber.status === "fulfilled" ? cyber.value : []),
      ...(land.status === "fulfilled" ? land.value : []),
      ...(space.status === "fulfilled" ? space.value : []),
      ...(radio.status === "fulfilled" ? radio.value : []),
      ...(cameras.status === "fulfilled" ? cameras.value : []),
    ];

    // Deduplicate by ID
    const seen = new Set<string>();
    const unique = allEvents.filter(e => {
      if (seen.has(e.id)) return false;
      seen.add(e.id);
      return true;
    });

    const summary = {
      total: unique.length,
      conflict: unique.filter(e => e.category === "conflict").length,
      maritime: unique.filter(e => e.category === "maritime").length,
      air: unique.filter(e => e.category === "air").length,
      cyber: unique.filter(e => e.category === "cyber").length,
      land: unique.filter(e => e.category === "land").length,
      space: unique.filter(e => e.category === "space").length,
      radio: unique.filter(e => e.category === "radio").length,
      weather: unique.filter(e => e.category === "weather").length,
      earthquakes: unique.filter(e => e.category === "earthquakes").length,
      social: unique.filter(e => e.category === "social").length,
      cameras: unique.filter(e => e.category === "cameras").length,
      cached: CACHE.size,
    };

    console.log(`[API] /api/conflicts → ${unique.length} events (${JSON.stringify(summary)})`);
    res.json({ events: unique, summary });
  } catch (error) {
    console.error("Route error:", error);
    res.status(500).json({ events: [], error: "Failed to aggregate events" });
  }
});

// Category-specific routes
router.get("/conflicts", async (_req, res) => res.json({ events: await getConflictEvents() }));
router.get("/maritime", async (_req, res) => res.json({ events: await getMaritimeEvents() }));
router.get("/air", async (_req, res) => res.json({ events: await getAirEvents() }));
router.get("/cyber", async (_req, res) => res.json({ events: await getCyberEvents() }));
router.get("/land", async (_req, res) => res.json({ events: await getLandEvents() }));
router.get("/space", async (_req, res) => res.json({ events: await getSpaceEvents() }));
router.get("/radio", async (_req, res) => res.json({ events: await getRadioEvents() }));

// Cache stats
router.get("/cache/status", (_req, res) => {
  const status: Record<string, any> = {};
  CACHE.forEach((v, k) => {
    status[k] = { age: Math.round((Date.now() - v.ts) / 1000) + "s", events: v.data?.length || 0 };
  });
  res.json(status);
});

export default router;
