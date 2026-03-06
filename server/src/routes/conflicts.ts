import { Router } from "express";
import { fetchGDELTConflicts, fetchUCDPConflicts, EventData } from "../services/conflict";
import { fetchVesselData, fetchMarineAlerts, fetchVesselPositions, fetchNavalVessels, fetchPiracyZones } from "../services/maritime";
import { fetchAirTraffic } from "../services/air";
import { fetchCyberThreats, fetchThreatFeeds, fetchShodanIntel, fetchCensysIntel, fetchGreyNoiseIntel, fetchVulnerabilityIntel } from "../services/cyber";
import { fetchRSSNews, fetchDefenseNews } from "../services/rss";
import { fetchStarlinkSatellites, fetchGPSSatellites, fetchMilitarySatellites } from "../services/satellites";
import { fetchHackerNewsIntel, fetchRedditGeoPosts, fetchGlobalIncidents } from "../services/osint";
import { fetchInfrastructure, fetchPowerGrid, fetchCriticalInfrastructure } from "../services/land";
import { fetchISSTracking, fetchN2YOSatellites, fetchSpaceDebris, fetchSatellitePasses, fetchRocketLaunches } from "../services/space";
import { fetchSDRSignals, fetchRadioHFMidEast, fetchRadioUkraine, fetchGlobalSDRNodes, fetchHFActiveFrequencies, fetchAirbandFrequencies, fetchSignalIntel } from "../services/radio";
import { fetchADSBExchange, fetchMilitaryAircraft, fetchPrivateJets } from "../services/adsb";
import { fetchEarthquakes, fetchWeatherAlerts, fetchVolcanoAlerts, fetchNuclearFacilities } from "../services/geo";
import { fetchTwitterGeoAlerts, fetchRedditLiveThreads, fetchTelegramChannels, fetchWebIntrusionAlerts, fetchDarkWebAlerts } from "../services/social";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const allEvents: EventData[] = [];
    
    const results = await Promise.allSettled([
      // News & OSINT
      fetchRSSNews(),
      fetchDefenseNews(),
      fetchRedditGeoPosts(),
      fetchGlobalIncidents(),
      fetchHackerNewsIntel(),
      fetchTwitterGeoAlerts(),
      fetchRedditLiveThreads(),
      fetchTelegramChannels(),
      
      // Conflict data
      fetchGDELTConflicts(),
      fetchUCDPConflicts(),
      
      // Maritime
      fetchVesselData(),
      fetchMarineAlerts(),
      fetchVesselPositions(),
      fetchNavalVessels(),
      fetchPiracyZones(),
      
      // Air
      fetchAirTraffic(),
      fetchStarlinkSatellites(),
      fetchGPSSatellites(),
      fetchMilitarySatellites(),
      fetchADSBExchange(),
      fetchMilitaryAircraft(),
      fetchPrivateJets(),
      
      // Cyber
      fetchCyberThreats(),
      fetchThreatFeeds(),
      fetchShodanIntel(),
      fetchCensysIntel(),
      fetchGreyNoiseIntel(),
      fetchVulnerabilityIntel(),
      fetchWebIntrusionAlerts(),
      fetchDarkWebAlerts(),
      
      // Land/Infrastructure
      fetchInfrastructure(),
      fetchPowerGrid(),
      fetchCriticalInfrastructure(),
      fetchEarthquakes(),
      fetchWeatherAlerts(),
      fetchVolcanoAlerts(),
      fetchNuclearFacilities(),
      
      // Space
      fetchISSTracking(),
      fetchN2YOSatellites(),
      fetchSpaceDebris(),
      fetchSatellitePasses(),
      fetchRocketLaunches(),
      
      // Radio/Signals
      fetchSDRSignals(),
      fetchRadioHFMidEast(),
      fetchRadioUkraine(),
      fetchGlobalSDRNodes(),
      fetchHFActiveFrequencies(),
      fetchAirbandFrequencies(),
      fetchSignalIntel(),
    ]);
    
    results.forEach((result) => {
      if (result.status === "fulfilled") {
        allEvents.push(...result.value);
      }
    });
    
    res.json({ 
      events: allEvents,
      summary: {
        total: allEvents.length,
        conflicts: allEvents.filter(e => e.category === "conflict").length,
        maritime: allEvents.filter(e => e.category === "maritime").length,
        air: allEvents.filter(e => e.category === "air").length,
        cyber: allEvents.filter(e => e.category === "cyber").length,
        land: allEvents.filter(e => e.category === "land").length,
        space: allEvents.filter(e => e.category === "space").length,
        radio: allEvents.filter(e => e.category === "radio").length
      }
    });
  } catch (error) {
    console.error("Error fetching events:", error);
    res.json({ events: [], error: "Failed to fetch data sources" });
  }
});

router.get("/conflicts", async (_req, res) => {
  const [rss, defense, gdelt, ucdp, reddit, incidents, twitter, telegram] = await Promise.allSettled([
    fetchRSSNews(),
    fetchDefenseNews(),
    fetchGDELTConflicts(),
    fetchUCDPConflicts(),
    fetchRedditGeoPosts(),
    fetchGlobalIncidents(),
    fetchTwitterGeoAlerts(),
    fetchTelegramChannels()
  ]);
  
  const events: EventData[] = [];
  if (rss.status === "fulfilled") events.push(...rss.value);
  if (defense.status === "fulfilled") events.push(...defense.value);
  if (gdelt.status === "fulfilled") events.push(...gdelt.value);
  if (ucdp.status === "fulfilled") events.push(...ucdp.value);
  if (reddit.status === "fulfilled") events.push(...reddit.value);
  if (incidents.status === "fulfilled") events.push(...incidents.value);
  if (twitter.status === "fulfilled") events.push(...twitter.value);
  if (telegram.status === "fulfilled") events.push(...telegram.value);
  
  res.json({ events });
});

router.get("/maritime", async (_req, res) => {
  const [vessels, alerts, positions, naval, piracy] = await Promise.allSettled([
    fetchVesselData(),
    fetchMarineAlerts(),
    fetchVesselPositions(),
    fetchNavalVessels(),
    fetchPiracyZones()
  ]);
  
  const events: EventData[] = [];
  if (vessels.status === "fulfilled") events.push(...vessels.value);
  if (alerts.status === "fulfilled") events.push(...alerts.value);
  if (positions.status === "fulfilled") events.push(...positions.value);
  if (naval.status === "fulfilled") events.push(...naval.value);
  if (piracy.status === "fulfilled") events.push(...piracy.value);
  
  res.json({ events });
});

router.get("/air", async (_req, res) => {
  const [air, starlink, gps, military, adsb, militaryAc, privateJets] = await Promise.allSettled([
    fetchAirTraffic(),
    fetchStarlinkSatellites(),
    fetchGPSSatellites(),
    fetchMilitarySatellites(),
    fetchADSBExchange(),
    fetchMilitaryAircraft(),
    fetchPrivateJets()
  ]);
  
  const events: EventData[] = [];
  if (air.status === "fulfilled") events.push(...air.value);
  if (starlink.status === "fulfilled") events.push(...starlink.value);
  if (gps.status === "fulfilled") events.push(...gps.value);
  if (military.status === "fulfilled") events.push(...military.value);
  if (adsb.status === "fulfilled") events.push(...adsb.value);
  if (militaryAc.status === "fulfilled") events.push(...militaryAc.value);
  if (privateJets.status === "fulfilled") events.push(...privateJets.value);
  
  res.json({ events });
});

router.get("/cyber", async (_req, res) => {
  const [threats, feeds, shodan, censys, greynoise, vulns, intrusion, darkweb] = await Promise.allSettled([
    fetchCyberThreats(),
    fetchThreatFeeds(),
    fetchShodanIntel(),
    fetchCensysIntel(),
    fetchGreyNoiseIntel(),
    fetchVulnerabilityIntel(),
    fetchWebIntrusionAlerts(),
    fetchDarkWebAlerts()
  ]);
  
  const events: EventData[] = [];
  if (threats.status === "fulfilled") events.push(...threats.value);
  if (feeds.status === "fulfilled") events.push(...feeds.value);
  if (shodan.status === "fulfilled") events.push(...shodan.value);
  if (censys.status === "fulfilled") events.push(...censys.value);
  if (greynoise.status === "fulfilled") events.push(...greynoise.value);
  if (vulns.status === "fulfilled") events.push(...vulns.value);
  if (intrusion.status === "fulfilled") events.push(...intrusion.value);
  if (darkweb.status === "fulfilled") events.push(...darkweb.value);
  
  res.json({ events });
});

router.get("/land", async (_req, res) => {
  const [infra, power, critical, earthquakes, weather, volcanoes, nuclear] = await Promise.allSettled([
    fetchInfrastructure(),
    fetchPowerGrid(),
    fetchCriticalInfrastructure(),
    fetchEarthquakes(),
    fetchWeatherAlerts(),
    fetchVolcanoAlerts(),
    fetchNuclearFacilities()
  ]);
  
  const events: EventData[] = [];
  if (infra.status === "fulfilled") events.push(...infra.value);
  if (power.status === "fulfilled") events.push(...power.value);
  if (critical.status === "fulfilled") events.push(...critical.value);
  if (earthquakes.status === "fulfilled") events.push(...earthquakes.value);
  if (weather.status === "fulfilled") events.push(...weather.value);
  if (volcanoes.status === "fulfilled") events.push(...volcanoes.value);
  if (nuclear.status === "fulfilled") events.push(...nuclear.value);
  
  res.json({ events });
});

router.get("/space", async (_req, res) => {
  const [iss, n2yo, debris, passes, launches] = await Promise.allSettled([
    fetchISSTracking(),
    fetchN2YOSatellites(),
    fetchSpaceDebris(),
    fetchSatellitePasses(),
    fetchRocketLaunches()
  ]);
  
  const events: EventData[] = [];
  if (iss.status === "fulfilled") events.push(...iss.value);
  if (n2yo.status === "fulfilled") events.push(...n2yo.value);
  if (debris.status === "fulfilled") events.push(...debris.value);
  if (passes.status === "fulfilled") events.push(...passes.value);
  if (launches.status === "fulfilled") events.push(...launches.value);
  
  res.json({ events });
});

router.get("/radio", async (_req, res) => {
  const [sdr, hfme, ua, globalSDR, hfFreq, airband, sigIntel] = await Promise.allSettled([
    fetchSDRSignals(),
    fetchRadioHFMidEast(),
    fetchRadioUkraine(),
    fetchGlobalSDRNodes(),
    fetchHFActiveFrequencies(),
    fetchAirbandFrequencies(),
    fetchSignalIntel()
  ]);
  
  const events: EventData[] = [];
  if (sdr.status === "fulfilled") events.push(...sdr.value);
  if (hfme.status === "fulfilled") events.push(...hfme.value);
  if (ua.status === "fulfilled") events.push(...ua.value);
  if (globalSDR.status === "fulfilled") events.push(...globalSDR.value);
  if (hfFreq.status === "fulfilled") events.push(...hfFreq.value);
  if (airband.status === "fulfilled") events.push(...airband.value);
  if (sigIntel.status === "fulfilled") events.push(...sigIntel.value);
  
  res.json({ events });
});

export default router;
