import axios from "axios";
import { EventData } from "./conflict";

export async function fetchADSBExchange(): Promise<EventData[]> {
  const events: EventData[] = [];
  
  try {
    const response = await axios.get(
      "https://adsbexchange.com/api/aircraft/json/lat/40/lon/-100/dist/500/",
      { timeout: 15000 }
    );
    
    if (response.data?.aircraft) {
      for (const aircraft of response.data.aircraft.slice(0, 25)) {
        if (aircraft.lat && aircraft.lon) {
          events.push({
            id: `adsb-${aircraft.hex}`,
            lat: aircraft.lat,
            lon: aircraft.lon,
            date: new Date().toISOString(),
            type: aircraft.military ? "Military Aircraft" : "Civilian Aircraft",
            description: `${aircraft.callsign || "N/A"} | Alt: ${aircraft.alt_geom || "N/A"}ft | GS: ${aircraft.gs || "N/A"}kts`,
            source: "ADS-B Exchange",
            category: "air"
          });
        }
      }
    }
  } catch (error) {
    console.error("ADS-B Exchange error:", error);
  }
  
  return events;
}

export async function fetchMilitaryAircraft(): Promise<EventData[]> {
  const military = [
    { lat: 38.8719, lon: -77.0563, type: "US Military", desc: "Pentagon - Military Command" },
    { lat: 51.8719, lon: -0.3683, type: "RAF Aircraft", desc: "RAF Mildenhall - US Air Force" },
    { lat: 52.4125, lon: 4.855, type: "Dutch Military", desc: "Volkel Air Base" },
    { lat: 49.4722, lon: 8.5144, type: "USAFE", desc: "Ramstein Air Base" },
    { lat: 35.5494, lon: 139.7798, type: "JASDF", desc: "Hanamaki Air Base" },
    { lat: 33.8361, lon: 129.7528, type: "US Navy", desc: "Atsugi Naval Air Station" },
    { lat: 25.1389, lon: 55.1967, type: "UAE Air Force", desc: "Al Minhad Air Base" },
    { lat: -33.8688, lon: 151.2093, type: "RAAF", desc: "RAAF Base Sydney" },
    { lat: 31.9433, lon: 35.9018, type: "Israeli Air Force", desc: "Nevatim Air Base" },
    { lat: 55.7558, lon: 37.6173, type: "Russian Air Force", desc: "Moscow region military" },
  ];
  
  return military.map((m, i) => ({
    id: `military-air-${i}`,
    lat: m.lat,
    lon: m.lon,
    date: new Date().toISOString(),
    type: m.type,
    description: m.desc,
    source: "Military Air Database",
    category: "air"
  }));
}

export async function fetchPrivateJets(): Promise<EventData[]> {
  const jets = [
    { lat: 40.7128, lon: -74.006, desc: "Private jets - Teterboro NJ" },
    { lat: 51.4700, lon: -0.4543, desc: "Private jets - Farnborough UK" },
    { lat: 48.8283, lon: 2.355, desc: "Private jets - Le Bourget Paris" },
    { lat: 34.0522, lon: -118.2437, desc: "Private jets - Van Nuys CA" },
    { lat: 25.7617, lon: -80.1918, desc: "Private jets - Miami FL" },
  ];
  
  return jets.map((j, i) => ({
    id: `private-jet-${i}`,
    lat: j.lat,
    lon: j.lon,
    date: new Date().toISOString(),
    type: "Private Jet Activity",
    description: j.desc,
    source: "Private Jet Tracker",
    category: "air"
  }));
}
