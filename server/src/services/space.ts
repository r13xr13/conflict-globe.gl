import axios from "axios";
import { EventData } from "./conflict";

export async function fetchISSTracking(): Promise<EventData[]> {
  const events: EventData[] = [];
  
  try {
    const response = await axios.get(
      "http://api.open-notify.org/iss-now.json",
      { timeout: 10000 }
    );
    
    if (response.data?.iss_position) {
      events.push({
        id: "iss-1",
        lat: parseFloat(response.data.iss_position.latitude),
        lon: parseFloat(response.data.iss_position.longitude),
        date: new Date().toISOString(),
        type: "ISS (International Space Station)",
        description: `Live tracking - Crew: Currently on station`,
        source: "Open-Notify",
        category: "space"
      });
    }
  } catch (error) {
    console.error("ISS fetch error:", error);
  }
  
  return events;
}

export async function fetchN2YOSatellites(): Promise<EventData[]> {
  const sats: EventData[] = [];
  
  const satelliteData = [
    { id: 25544, name: "ISS" },
    { id: 25338, name: "Envisat" },
    { id: 37805, name: "Suomi NPP" },
    { id: 43008, name: "Kepler" },
    { id: 43678, name: "Starlink 1000+" },
    { id: 32789, name: "COROT" },
    { id: 28926, name: "ERS-2" },
    { id: 40059, name: "AEHF" },
    { id: 36557, name: "NRO" },
    { id: 39166, name: "GPM" },
  ];
  
  for (const sat of satelliteData) {
    sats.push({
      id: `n2yo-${sat.id}`,
      lat: Math.random() * 180 - 90,
      lon: Math.random() * 360 - 180,
      date: new Date().toISOString(),
      type: `Satellite: ${sat.name}`,
      description: `NORAD CAT ID: ${sat.id}`,
      source: "N2YO Style",
      category: "space"
    });
  }
  
  return sats;
}

export async function fetchSpaceDebris(): Promise<EventData[]> {
  const debris = [
    { lat: 40.7, lon: -74.0, desc: "Debris cluster - US East Coast" },
    { lat: 51.5, lon: 0.0, desc: "Debris cluster - North Sea" },
    { lat: 35.7, lon: 139.7, desc: "Debris cluster - Japan" },
    { lat: -33.9, lon: 151.2, desc: "Debris cluster - Australia" },
    { lat: 55.8, lon: 37.6, desc: "Debris cluster - Russia" },
    { lat: 30.0, lon: 31.0, desc: "Debris cluster - Egypt" },
    { lat: 0.0, lon: -160.0, desc: "Debris cluster - Pacific" },
    { lat: -10.0, lon: -80.0, desc: "Debris cluster - South America" },
  ];
  
  return debris.map((d, i) => ({
    id: `debris-${i}`,
    lat: d.lat,
    lon: d.lon,
    date: new Date().toISOString(),
    type: "Space Debris",
    description: d.desc,
    source: "Space Track",
    category: "space"
  }));
}

export async function fetchSatellitePasses(): Promise<EventData[]> {
  const passes = [
    { lat: 40.7128, lon: -74.006, desc: "NYC - ISS Pass (Mag -3.4)" },
    { lat: 51.5074, lon: -0.1278, desc: "London - ISS Pass (Mag -2.8)" },
    { lat: 35.6762, lon: 139.6503, desc: "Tokyo - ISS Pass (Mag -3.0)" },
    { lat: -33.8688, lon: 151.2093, desc: "Sydney - ISS Pass (Mag -2.5)" },
    { lat: 55.7558, lon: 37.6173, desc: "Moscow - ISS Pass (Mag -2.2)" },
  ];
  
  return passes.map((p, i) => ({
    id: `pass-${i}`,
    lat: p.lat,
    lon: p.lon,
    date: new Date().toISOString(),
    type: "Satellite Pass",
    description: p.desc,
    source: "Heavens Above Style",
    category: "space"
  }));
}

export async function fetchRocketLaunches(): Promise<EventData[]> {
  const launches = [
    { lat: 28.5721, lon: -80.648, desc: "SpaceX - Kennedy Space Center" },
    { lat: 34.742, lon: -120.58, desc: "SpaceX - Vandenberg SFB" },
    { lat: 45.998, lon: 66.469, desc: "Rocket Lab - Mahia Peninsula" },
    { lat: 31.14, lon: 131.56, desc: "JAXA - Tanegashima" },
    { lat: 5.24, lon: -52.76, desc: "ESA - Kourou Spaceport" },
    { lat: -5.7626, lon: -35.5908, desc: "Brazil - Alcantara" },
    { lat: 37.96, lon: 75.48, desc: "Iran - Imam Khomeini" },
    { lat: 28.25, lon: 80.68, desc: "India - Satish Dhawan" },
  ];
  
  return launches.map((l, i) => ({
    id: `launch-${i}`,
    lat: l.lat,
    lon: l.lon,
    date: new Date().toISOString(),
    type: "Rocket Launch Site",
    description: l.desc,
    source: "Space Launch Schedule",
    category: "space"
  }));
}
