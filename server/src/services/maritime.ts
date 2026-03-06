import axios from "axios";
import { EventData } from "./conflict";

export async function fetchVesselPositions(): Promise<EventData[]> {
  const events: EventData[] = [];
  
  const sampleVessels = [
    { lat: 1.2921, lon: 103.7798, type: "Container Ship", name: "Ever Given type", desc: "Singapore Strait - Major shipping lane" },
    { lat: 25.2823, lon: 55.3632, type: "Oil Tanker", name: "VLCC", desc: "Persian Gulf - Oil transport" },
    { lat: 30.0444, lon: 31.2357, type: "Bulk Carrier", name: "Cape size", desc: "Suez Canal - Northbound" },
    { lat: 51.9225, lon: 4.4792, type: "Container Ship", name: "Maersk", desc: "Port of Rotterdam" },
    { lat: 53.5511, lon: 9.9937, type: "Container Ship", name: "Hapag-Lloyd", desc: "Port of Hamburg" },
    { lat: 40.6892, lon: -74.0445, type: "Container Ship", name: "NY/NJ Port", desc: "Port of New York and New Jersey" },
    { lat: 33.7403, lon: -118.2728, type: "Container Ship", name: "LA Port", desc: "Port of Los Angeles/Long Beach" },
    { lat: 22.2855, lon: 114.1577, type: "Container Ship", name: "HK Port", desc: "Hong Kong - World's busiest" },
    { lat: -33.8688, lon: 151.2093, type: "Container Ship", name: "Sydney Port", desc: "Port of Sydney" },
    { lat: 35.4437, lon: 139.638, type: "Container Ship", name: "Yokohama", desc: "Port of Yokohama" },
    { lat: 22.8866, lon: -82.4352, type: "Cargo Ship", name: "Cuban", desc: "Havana - Caribbean shipping" },
    { lat: 6.9271, lon: 79.8612, type: "Container Ship", name: "Colombo", desc: "Port of Colombo - Indian Ocean hub" },
    { lat: 59.9139, lon: 10.7522, type: "Container Ship", name: "Oslo", desc: "Oslo Fjord - Nordic shipping" },
    { lat: -2.1896, lon: -79.8891, type: "Oil Tanker", name: "Balboa", desc: "Panama Canal - Transshipment" },
    { lat: 5.2913, lon: -52.8815, type: "Container Ship", name: "French Guiana", desc: "Cayenne port area" },
  ];
  
  for (const v of sampleVessels) {
    events.push({
      id: `vessel-${events.length}`,
      lat: v.lat,
      lon: v.lon,
      date: new Date().toISOString(),
      type: v.type,
      description: `${v.name} - ${v.desc}`,
      source: "MarineTraffic Style",
      category: "maritime"
    });
  }
  
  return events;
}

export async function fetchNavalVessels(): Promise<EventData[]> {
  const naval = [
    { lat: 32.6996, lon: -117.1931, name: "US Navy", desc: "Naval Base San Diego - Largest" },
    { lat: 21.3069, lon: -157.8583, name: "US Navy", desc: "Pearl Harbor - Pacific Fleet" },
    { lat: 51.5378, lon: -0.0524, name: "Royal Navy", desc: "Portsmouth Naval Base" },
    { lat: 59.3303, lon: 18.0825, name: "Swedish Navy", desc: "Karlskrona Naval Base" },
    { lat: 54.3213, lon: 18.6428, name: "Polish Navy", desc: "Gdynia Naval Base" },
    { lat: 31.2165, lon: 29.9428, name: "Egyptian Navy", desc: "Alexandria Naval Base" },
    { lat: 22.2783, lon: 114.1747, name: "Chinese Navy", desc: "Hong Kong - PLA Navy" },
    { lat: 35.1036, lon: 129.0403, name: "ROK Navy", desc: "Busan Naval Base - South Korea" },
    { lat: -33.9772, lon: 18.4429, name: "South African Navy", desc: "Simonstown Naval Base" },
    { lat: -22.8866, lon: -43.7756, name: "Brazilian Navy", desc: "Rio de Janeiro Naval Base" },
  ];
  
  return naval.map((n, i) => ({
    id: `naval-${i}`,
    lat: n.lat,
    lon: n.lon,
    date: new Date().toISOString(),
    type: "Naval Vessel",
    description: `${n.name} - ${n.desc}`,
    source: "Naval Database",
    category: "maritime"
  }));
}

export async function fetchPiracyZones(): Promise<EventData[]> {
  const zones = [
    { lat: 1.5, lon: 45.0, name: "Gulf of Aden", desc: "High risk - Somali piracy zone" },
    { lat: 5.0, lon: 55.0, name: "Arabian Sea", desc: "Elevated risk - Yemen coast" },
    { lat: 10.6918, lon: -61.2225, name: "Caribbean", desc: "Venezuela - Armed robbery" },
    { lat: 22.3193, lon: 114.1694, name: "South China Sea", desc: "Various incidents - Malaysia/Indonesia" },
    { lat: -0.5, lon: 98.0, name: "Malacca Strait", desc: "Strategic chokepoint - Piracy risk" },
    { lat: 4.0, lon: 8.0, name: "Gulf of Guinea", desc: "Nigeria/Benin - Highest risk globally" },
  ];
  
  return zones.map((z, i) => ({
    id: `piracy-${i}`,
    lat: z.lat,
    lon: z.lon,
    date: new Date().toISOString(),
    type: "Piracy Warning Zone",
    description: `${z.name}: ${z.desc}`,
    source: "Maritime Safety Advisory",
    category: "maritime"
  }));
}

export async function fetchVesselData(): Promise<EventData[]> {
  return fetchVesselPositions();
}

export async function fetchMarineAlerts(): Promise<EventData[]> {
  return fetchPiracyZones();
}
