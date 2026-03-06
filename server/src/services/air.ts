import axios from "axios";
import { EventData } from "./conflict";

export async function fetchAirTraffic(): Promise<EventData[]> {
  try {
    const response = await axios.get(
      "https://opensky-network.org/api/states/all",
      { 
        timeout: 10000,
        params: { 
          lamin: -90,
          lamax: 90,
          lomin: -180,
          lomax: 180
        }
      }
    );
    
    if (!response.data?.states) return [];
    
    const flights = response.data.states
      .slice(0, 20)
      .map((state: any, index: number) => ({
        id: `flight-${index}`,
        lat: state[6] || 0,
        lon: state[5] || 0,
        date: new Date().toISOString(),
        type: `Flight: ${state[1] || "Unknown"}`,
        description: `From ${state[2] || "unknown origin"} to ${state[3] || "unknown destination"} | Altitude: ${Math.round(state[7] || 0)}m`,
        source: "OpenSky",
        category: "air" as const
      }));
    
    return flights.filter((f: EventData) => f.lat !== 0 && f.lon !== 0);
  } catch (error) {
    console.error("Air traffic fetch error:", error);
    return getSampleAirData();
  }
}

function getSampleAirData(): EventData[] {
  return [
    {
      id: "flight-sample-1",
      lat: 40.7128,
      lon: -74.006,
      date: new Date().toISOString(),
      type: "Commercial Flight",
      description: "Boeing 737 - New York area",
      source: "Sample Data",
      category: "air"
    },
    {
      id: "flight-sample-2",
      lat: 51.4700,
      lon: -0.4543,
      date: new Date().toISOString(),
      type: "Commercial Flight",
      description: "Airbus A320 - London Heathrow",
      source: "Sample Data",
      category: "air"
    },
    {
      id: "flight-sample-3",
      lat: 35.5494,
      lon: 139.7798,
      date: new Date().toISOString(),
      type: "Commercial Flight",
      description: "Boeing 777 - Tokyo Haneda",
      source: "Sample Data",
      category: "air"
    },
    {
      id: "flight-sample-4",
      lat: -33.9399,
      lon: 151.1753,
      date: new Date().toISOString(),
      type: "Commercial Flight",
      description: "Airbus A380 - Sydney",
      source: "Sample Data",
      category: "air"
    }
  ];
}
