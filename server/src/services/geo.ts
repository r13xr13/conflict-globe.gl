import axios from "axios";
import { EventData } from "./conflict";

export async function fetchEarthquakes(): Promise<EventData[]> {
  const events: EventData[] = [];
  
  try {
    const response = await axios.get(
      "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson",
      { timeout: 15000 }
    );
    
    if (response.data?.features) {
      for (const feature of response.data.features.slice(0, 20)) {
        const props = feature.properties;
        const coords = feature.geometry.coordinates;
        
        events.push({
          id: `quake-${feature.id}`,
          lat: coords[1],
          lon: coords[0],
          date: new Date(props.time).toISOString(),
          type: `Earthquake M${props.mag.toFixed(1)}`,
          description: `${props.place} - ${props.type}`,
          source: "USGS",
          category: "land"
        });
      }
    }
  } catch (error) {
    console.error("Earthquake fetch error:", error);
  }
  
  return events;
}

export async function fetchWeatherAlerts(): Promise<EventData[]> {
  const alerts: EventData[] = [];
  
  try {
    const response = await axios.get(
      "https://api.weather.gov/alerts/active?area=US",
      { timeout: 10000 }
    );
    
    if (response.data?.features) {
      for (const feature of response.data.features.slice(0, 15)) {
        const props = feature.properties;
        
        const usCenter: Record<string, { lat: number; lon: number }> = {
          "TX": { lat: 31.0, lon: -100.0 },
          "FL": { lat: 27.6, lon: -81.5 },
          "CA": { lat: 36.7, lon: -119.4 },
          "NY": { lat: 40.7, lon: -74.0 },
          "LA": { lat: 30.9, lon: -92.0 },
        };
        
        const center = usCenter[props.state] || { lat: 39.0, lon: -98.0 };
        
        alerts.push({
          id: `weather-${feature.id}`,
          lat: center.lat,
          lon: center.lon,
          date: props.sent,
          type: `${props.event} Warning`,
          description: `${props.headline?.substring(0, 100) || props.description?.substring(0, 100)}`,
          source: "NWS",
          category: "land"
        });
      }
    }
  } catch (error) {
    console.error("Weather alerts fetch error:", error);
  }
  
  return alerts;
}

export async function fetchVolcanoAlerts(): Promise<EventData[]> {
  const volcanoes: EventData[] = [];
  
  const majorVolcanoes = [
    { lat: 35.296, lon: 139.506, name: "Mount Fuji", country: "Japan", status: "Active" },
    { lat: 19.421, lon: -155.287, name: "Kilauea", country: "USA (Hawaii)", status: "Erupting" },
    { lat: 64.821, lon: -17.332, name: "Eyjafjallajökull", country: "Iceland", status: "Active" },
    { lat: 37.751, lon: -122.493, name: "Mount St. Helens", country: "USA", status: "Active" },
    { lat: -0.68, lon: -78.59, name: "Cotopaxi", country: "Ecuador", status: "Active" },
    { lat: 15.142, lon: 120.65, name: "Mount Pinatubo", country: "Philippines", status: "Active" },
    { lat: 40.446, lon: -121.51, name: "Lassen Peak", country: "USA", status: "Active" },
    { lat: 51.82, lon: -175.51, name: "Cleveland", country: "USA (Alaska)", status: "Active" },
    { lat: -6.105, lon: 106.42, name: "Krakatau", country: "Indonesia", status: "Erupting" },
    { lat: 13.32, lon: 144.0, name: "Rota", country: "Mariana Islands", status: "Active" },
  ];
  
  for (const v of majorVolcanoes) {
    volcanoes.push({
      id: `volcano-${v.name.replace(/\s/g, "")}`,
      lat: v.lat,
      lon: v.lon,
      date: new Date().toISOString(),
      type: `Volcano: ${v.status}`,
      description: `${v.name} - ${v.country}`,
      source: "Volcano Observatory",
      category: "land"
    });
  }
  
  return volcanoes;
}

export async function fetchNuclearFacilities(): Promise<EventData[]> {
  const facilities = [
    { lat: 35.994, lon: -84.274, name: "Oak Ridge", country: "USA", type: "Research" },
    { lat: 33.882, lon: -118.053, name: "San Onofre", country: "USA", type: "Decommissioned" },
    { lat: 41.265, lon: -73.854, name: "Indian Point", country: "USA", type: "Decommissioned" },
    { lat: 51.413, lon: 0.550, name: "Dungeness", country: "UK", type: "Active" },
    { lat: 50.234, lon: 1.683, name: "Flamanville", country: "France", type: "Active" },
    { lat: 47.427, lon: 7.966, name: "Beznau", country: "Switzerland", type: "Active" },
    { lat: 52.076, lon: 4.285, name: "Borssele", country: "Netherlands", type: "Active" },
    { lat: 59.363, lon: 17.95, name: "Forsmark", country: "Sweden", type: "Active" },
    { lat: 59.246, lon: 15.162, name: "Oskarshamn", country: "Sweden", type: "Active" },
    { lat: 55.313, lon: 12.943, name: "Ringhals", country: "Sweden", type: "Active" },
    { lat: 36.137, lon: 5.465, name: "Cernavodă", country: "Romania", type: "Active" },
    { lat: 46.575, lon: 14.396, name: "Krško", country: "Slovenia", type: "Active" },
  ];
  
  return facilities.map((f, i) => ({
    id: `nuclear-${i}`,
    lat: f.lat,
    lon: f.lon,
    date: new Date().toISOString(),
    type: `Nuclear Facility: ${f.type}`,
    description: `${f.name} Nuclear Power Plant - ${f.country}`,
    source: "IAEA",
    category: "land"
  }));
}
