import { EventData } from "./conflict";

export async function fetchInfrastructure(): Promise<EventData[]> {
  const events: EventData[] = [];
  
  const infrastructure = [
    { name: "Nuclear Plant - USA", lat: 35.994, lon: -84.274, desc: "Oak Ridge Nuclear Plant" },
    { name: "Military Base - US", lat: 38.8719, lon: -77.0563, desc: "Pentagon, Washington DC" },
    { name: "Naval Base - US", lat: 32.6996, lon: -117.1931, desc: "Naval Base San Diego" },
    { name: "Air Base - UK", lat: 51.8719, lon: -0.3683, desc: "RAF Mildenhall" },
    { name: "Air Base - Germany", lat: 49.4722, lon: 8.5144, desc: "Ramstein Air Base" },
    { name: "Port - Singapore", lat: 1.2644, lon: 103.8198, desc: "Singapore Port" },
    { name: "Port - Rotterdam", lat: 51.9225, lon: 4.4792, desc: "Port of Rotterdam" },
    { name: "Port - Shanghai", lat: 31.3661, lon: 121.6019, desc: "Yangshan Deep Water Port" },
    { name: "Dam - Egypt", lat: 23.9707, lon: 32.8772, desc: "Aswan High Dam" },
    { name: "Pipeline - Europe", lat: 48.0, lon: 14.0, desc: "Trans-European gas pipeline" },
    { name: "Telecom Hub - UK", lat: 51.5074, lon: -0.1278, desc: "London Telehouse" },
    { name: "Telecom Hub - US", lat: 40.7128, lon: -74.006, desc: "NYC Telehouse" },
    { name: "Data Center - Iceland", lat: 64.1466, lon: -21.9426, desc: "Keflavik Data Center" },
    { name: "Spaceport - US", lat: 28.5721, lon: -80.648, desc: "Kennedy Space Center" },
    { name: "Radar Station - Alaska", lat: 64.8378, lon: -147.7164, desc: "Eielson AFB Radar" },
  ];
  
  for (const inf of infrastructure) {
    events.push({
      id: `infra-${events.length}`,
      lat: inf.lat,
      lon: inf.lon,
      date: new Date().toISOString(),
      type: inf.name,
      description: inf.desc,
      source: "Infrastructure Database",
      category: "land"
    });
  }
  
  return events;
}

export async function fetchPowerGrid(): Promise<EventData[]> {
  const grids = [
    { lat: 33.4484, lon: -112.074, name: "US Western Grid", desc: "Western Interconnection" },
    { lat: 39.0997, lon: -94.5786, name: "US Eastern Grid", desc: "Eastern Interconnection" },
    { lat: 48.8566, lon: 2.3522, name: "European Grid", desc: "ENTSO-E Network" },
    { lat: 35.6762, lon: 139.6503, name: "Japanese Grid", desc: "TEPCO Network" },
    { lat: 39.9042, lon: 116.4074, name: "Chinese Grid", desc: "State Grid Corp" },
    { lat: 22.3193, lon: 114.1694, name: "Hong Kong Grid", desc: "CLP Power Grid" },
    { lat: -33.8688, lon: 151.2093, name: "Australian Grid", desc: "AEMO Network" },
  ];
  
  return grids.map((g, i) => ({
    id: `power-${i}`,
    lat: g.lat,
    lon: g.lon,
    date: new Date().toISOString(),
    type: "Power Grid Node",
    description: g.desc,
    source: "Power Grid Map",
    category: "land"
  }));
}

export async function fetchCriticalInfrastructure(): Promise<EventData[]> {
  const critical = [
    { lat: 34.0522, lon: -118.2437, type: "Critical Infrastructure", desc: "Hollywood Water Facility" },
    { lat: 40.7128, lon: -74.006, type: "Government Facility", desc: "NYC Emergency Services" },
    { lat: 51.4700, lon: -0.4543, type: "Transport Hub", desc: "London Heathrow Airport" },
    { lat: 35.5494, lon: 139.7798, type: "Transport Hub", desc: "Tokyo Haneda Airport" },
    { lat: 25.2532, lon: 55.3657, type: "Critical Infrastructure", desc: "Dubai Water Desalination" },
  ];
  
  return critical.map((c, i) => ({
    id: `critical-${i}`,
    lat: c.lat,
    lon: c.lon,
    date: new Date().toISOString(),
    type: c.type,
    description: c.desc,
    source: "Critical Infrastructure Map",
    category: "land"
  }));
}
