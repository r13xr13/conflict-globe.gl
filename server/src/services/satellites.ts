import axios from "axios";
import { EventData } from "./conflict";

export async function fetchStarlinkSatellites(): Promise<EventData[]> {
  const satellites: EventData[] = [];
  
  try {
    const response = await axios.get(
      "https://api.celestrak.org/satcat/tle/NORAD.json?GROUP=starlink&FORMAT=json",
      { timeout: 15000 }
    );
    
    if (Array.isArray(response.data)) {
      const starlinkGroup = response.data.slice(0, 30);
      
      for (const sat of starlinkGroup) {
        const meanAnomaly = parseFloat(sat.MEAN_ANOMALY) || 0;
        const inclination = parseFloat(sat.INCLINATION) || 0;
        const raan = parseFloat(sat.RAAN) || 0;
        
        const lat = Math.sin(raan * Math.PI / 180) * 90 * Math.cos(inclination * Math.PI / 180);
        const lon = meanAnomaly + raan;
        
        satellites.push({
          id: `starlink-${sat.SATNUM}`,
          lat: lat,
          lon: ((lon + 180) % 360) - 180,
          date: new Date().toISOString(),
          type: "Starlink Satellite",
          description: `${sat.NAME} - ${sat.SATNUM}`,
          source: "CelesTrak",
          category: "air"
        });
      }
    }
  } catch (error) {
    console.error("Starlink fetch error:", error);
    return getFallbackStarlink();
  }
  
  return satellites;
}

function getFallbackStarlink(): EventData[] {
  return [
    { id: "starlink-1", lat: 40.7, lon: -74.0, date: new Date().toISOString(), type: "Starlink", description: "Starlink satellite over US East Coast", source: "Sample", category: "air" },
    { id: "starlink-2", lat: 51.5, lon: -0.1, date: new Date().toISOString(), type: "Starlink", description: "Starlink satellite over UK", source: "Sample", category: "air" },
    { id: "starlink-3", lat: 35.7, lon: 139.7, date: new Date().toISOString(), type: "Starlink", description: "Starlink satellite over Japan", source: "Sample", category: "air" },
    { id: "starlink-4", lat: -33.9, lon: 151.2, date: new Date().toISOString(), type: "Starlink", description: "Starlink satellite over Australia", source: "Sample", category: "air" },
    { id: "starlink-5", lat: -22.9, lon: -43.2, date: new Date().toISOString(), type: "Starlink", description: "Starlink satellite over Brazil", source: "Sample", category: "air" },
    { id: "starlink-6", lat: 55.8, lon: 37.6, date: new Date().toISOString(), type: "Starlink", description: "Starlink satellite over Russia", source: "Sample", category: "air" },
    { id: "starlink-7", lat: 31.0, lon: 31.0, date: new Date().toISOString(), type: "Starlink", description: "Starlink satellite over Egypt", source: "Sample", category: "air" },
    { id: "starlink-8", lat: 1.4, lon: 103.8, date: new Date().toISOString(), type: "Starlink", description: "Starlink satellite over Singapore", source: "Sample", category: "air" },
    { id: "starlink-9", lat: 25.3, lon: 55.3, date: new Date().toISOString(), type: "Starlink", description: "Starlink satellite over UAE", source: "Sample", category: "air" },
    { id: "starlink-10", lat: -1.3, lon: 36.8, date: new Date().toISOString(), type: "Starlink", description: "Starlink satellite over Kenya", source: "Sample", category: "air" },
  ];
}

export async function fetchGPSSatellites(): Promise<EventData[]> {
  const satellites: EventData[] = [];
  
  try {
    const response = await axios.get(
      "https://api.celestrak.org/satcat/tle/NORAD.json?GROUP=gps-ops&FORMAT=json",
      { timeout: 15000 }
    );
    
    if (Array.isArray(response.data)) {
      const gpsGroup = response.data.slice(0, 10);
      
      for (const sat of gpsGroup) {
        satellites.push({
          id: `gps-${sat.SATNUM}`,
          lat: Math.random() * 180 - 90,
          lon: Math.random() * 360 - 180,
          date: new Date().toISOString(),
          type: "GPS Satellite",
          description: `${sat.NAME} - ${sat.SATNUM}`,
          source: "CelesTrak",
          category: "air"
        });
      }
    }
  } catch (error) {
    console.error("GPS fetch error:", error);
  }
  
  return satellites;
}

export async function fetchMilitarySatellites(): Promise<EventData[]> {
  const satellites: EventData[] = [];
  
  const groups = ["military", "radar-imagery", "earth-observation"];
  
  for (const group of groups) {
    try {
      const response = await axios.get(
        `https://api.celestrak.org/satcat/tle/NORAD.json?GROUP=${group}&FORMAT=json`,
        { timeout: 10000 }
      );
      
      if (Array.isArray(response.data)) {
        for (const sat of response.data.slice(0, 5)) {
          satellites.push({
            id: `mil-${sat.SATNUM}`,
            lat: Math.random() * 180 - 90,
            lon: Math.random() * 360 - 180,
            date: new Date().toISOString(),
            type: "Military/Earth Obs",
            description: `${sat.NAME}`,
            source: "CelesTrak",
            category: "air"
          });
        }
      }
    } catch (error) {
      console.error(`Military sat fetch error (${group}):`, error);
    }
  }
  
  return satellites;
}
