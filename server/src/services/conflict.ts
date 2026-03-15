import axios from "axios";

export interface EventData {
  id: string;
  lat: number;
  lon: number;
  date: string;
  type: string;
  description: string;
  source: string;
  category: "conflict" | "maritime" | "air" | "cyber" | "land" | "space" | "radio" | "weather" | "earthquakes" | "social" | "cameras";
  endLat?: number;
  endLon?: number;
  severity?: "low" | "medium" | "high" | "critical";
  country?: string;
  region?: string;
  entities?: string[];
  streamUrl?: string;
  thumbUrl?: string;
  // Additional metadata for extended services
  buildingHeight?: number;
  buildingFloors?: number;
  buildingYear?: number;
  buildingUsage?: string;
  buildingName?: string;
  buildingCity?: string;
  buildingCountry?: string;
  cityPopulation?: number;
  cityHeight?: number;
  cityFloors?: number;
  cityName?: string;
  urbanRegion?: string;
  wikidataId?: string;
  // Antenna-specific metadata
  frequency?: number;
  power?: number;
  bandwidth?: number;
  modulation?: string;
  signalType?: string;
  antennaId?: string;
  confidence?: number;
  version?: string;
  status?: string;
  uptime?: string;
  signalsPerMinute?: number;
  conflictMonitoringActive?: boolean;
}

// Real GDELT API - returns geolocated articles about conflict events
export async function fetchGDELTConflicts(): Promise<EventData[]> {
  try {
    const response = await axios.get(
      "https://api.gdeltproject.org/api/v2/doc/doc?query=conflict%20OR%20war%20OR%20attack%20OR%20military&mode=artlist&maxrecords=50&format=json&sort=DateDesc",
      { timeout: 15000 }
    );

    if (!response.data?.articles) return [];

    return response.data.articles
      .filter((a: any) => a.longitude && a.latitude && a.latitude !== 0)
      .map((a: any, i: number) => ({
        id: `gdelt-${i}-${Date.now()}`,
        lat: parseFloat(a.latitude) || 0,
        lon: parseFloat(a.longitude) || 0,
        date: a.seenddate
          ? `${a.seenddate.substring(0, 4)}-${a.seenddate.substring(4, 6)}-${a.seenddate.substring(6, 8)}`
          : new Date().toISOString(),
        type: (a.title || "Conflict Event").substring(0, 60),
        description: (a.title || "Conflict event detected via GDELT").substring(0, 200),
        source: a.domain || "GDELT",
        category: "conflict" as const,
        severity: "medium" as const,
        country: a.sourcecountry || undefined,
      }))
      .filter((e: EventData) => e.lat !== 0 && e.lon !== 0);
  } catch (error) {
    console.error("GDELT fetch error:", error);
    return [];
  }
}

// UCDP GED - Uppsala Conflict Data Program, real conflict events database
export async function fetchUCDPConflicts(): Promise<EventData[]> {
  try {
    const year = new Date().getFullYear() - 1; // UCDP lags ~1 year
    const response = await axios.get(
      `https://ucdpapi.pcr.uu.se/api/gedevents/${year}?pagesize=100&page=1`,
      { timeout: 15000 }
    );

    if (!response.data?.Result) return [];

    return response.data.Result
      .filter((e: any) => e.latitude && e.longitude)
      .map((e: any) => ({
        id: `ucdp-${e.id}`,
        lat: parseFloat(e.latitude),
        lon: parseFloat(e.longitude),
        date: e.date_start || new Date().toISOString(),
        type: `${e.type_of_violence === 1 ? "State-Based" : e.type_of_violence === 2 ? "Non-State" : "One-Sided"} Conflict`,
        description: `${e.dyad_name || "Armed group"} — ${e.country || "Unknown country"} (${e.deaths_a + e.deaths_b + e.deaths_civilians || 0} casualties)`,
        source: "UCDP",
        category: "conflict" as const,
        severity: (e.deaths_a + e.deaths_b + e.deaths_civilians) > 50 ? "critical"
          : (e.deaths_a + e.deaths_b + e.deaths_civilians) > 10 ? "high"
          : "medium" as any,
        country: e.country,
        region: e.region,
        entities: [e.side_a, e.side_b].filter(Boolean),
      }));
  } catch (error) {
    console.error("UCDP fetch error:", error);
    return [];
  }
}

// ACLED-style via ReliefWeb API (free, no key needed)
export async function fetchReliefWebConflicts(): Promise<EventData[]> {
  try {
    const response = await axios.post(
      "https://api.reliefweb.int/v1/reports?appname=conflictglobe",
      {
        filter: {
          operator: "AND",
          conditions: [
            { field: "theme.name", value: "Conflict and Violence" },
          ],
        },
        fields: { include: ["title", "date", "country", "body-html"] },
        sort: ["date:desc"],
        limit: 30,
      },
      { timeout: 15000 }
    );

    if (!response.data?.data) return [];

    const GEO: Record<string, [number, number]> = {
      "Ukraine": [48.3794, 31.1656], "Sudan": [12.8628, 30.2176],
      "Myanmar": [21.9162, 95.956], "Ethiopia": [9.145, 40.4897],
      "Syria": [34.8021, 38.9968], "Yemen": [15.5527, 48.5164],
      "Somalia": [5.1521, 46.1996], "DRC": [-4.0383, 21.7587],
      "Mali": [17.5707, -3.9962], "Niger": [17.6078, 8.0817],
      "Afghanistan": [33.9391, 67.7099], "Iraq": [33.3152, 44.3661],
      "Libya": [26.3351, 17.2283], "Nigeria": [9.0820, 8.6753],
      "Mozambique": [-18.6657, 35.5296], "Haiti": [18.9712, -72.2852],
      "Palestine": [31.3547, 34.3088], "Lebanon": [33.8547, 35.8623],
    };

    return response.data.data
      .map((item: any, i: number) => {
        const country = item.fields?.country?.[0]?.name || "";
        const geo = GEO[country] || null;
        if (!geo) return null;
        return {
          id: `reliefweb-${item.id || i}`,
          lat: geo[0] + (Math.random() - 0.5) * 2,
          lon: geo[1] + (Math.random() - 0.5) * 2,
          date: item.fields?.date?.created || new Date().toISOString(),
          type: (item.fields?.title || "Conflict Report").substring(0, 60),
          description: (item.fields?.title || "ReliefWeb conflict report").substring(0, 200),
          source: "ReliefWeb",
          category: "conflict" as const,
          severity: "medium" as const,
          country,
        };
      })
      .filter(Boolean) as EventData[];
  } catch (error) {
    console.error("ReliefWeb fetch error:", error);
    return [];
  }
}
