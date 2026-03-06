import axios from "axios";

export interface EventData {
  id: string;
  lat: number;
  lon: number;
  date: string;
  type: string;
  description: string;
  source: string;
  category: "conflict" | "maritime" | "air" | "cyber" | "land" | "space" | "radio";
}

export async function fetchGDELTConflicts(): Promise<EventData[]> {
  try {
    const response = await axios.get(
      "https://api.gdeltproject.org/api/v2/doc/doc?query=event%20domaincode:1%20SOURCESOUNDEXACT:-GNS&mode=artlist&maxrecords=25&format=json",
      { timeout: 10000 }
    );
    
    if (!response.data?.articles) return [];
    
    return response.data.articles.map((article: any, index: number) => ({
      id: `gdelt-${index}`,
      lat: article.se_lat || 0,
      lon: article.se_lon || 0,
      date: article.seenddate || new Date().toISOString().split('T')[0],
      type: article.title?.substring(0, 50) || "Conflict Event",
      description: article.title || "Conflict event from GDELT",
      source: article.domain || "GDELT",
      category: "conflict" as const
    })).filter((e: EventData) => e.lat !== 0 && e.lon !== 0);
  } catch (error) {
    console.error("GDELT fetch error:", error);
    return [];
  }
}

export async function fetchUCDPConflicts(): Promise<EventData[]> {
  try {
    const response = await axios.get(
      "https://ucdp.uu.se/api/gedevents/20?pagesize=25",
      { timeout: 10000 }
    );
    
    if (!response.data?.data) return [];
    
    return response.data.data.map((event: any, index: number) => ({
      id: `ucdp-${event.id}`,
      lat: event.lat || 0,
      lon: event.lon || 0,
      date: event.date_start || "",
      type: `UCDP: ${event.type_of_violence || "Violence"}`,
      description: `Conflict in ${event.country || "unknown"} - ${event.region || "region"}`,
      source: "UCDP",
      category: "conflict" as const
    })).filter((e: EventData) => e.lat !== 0 && e.lon !== 0);
  } catch (error) {
    console.error("UCDP fetch error:", error);
    return [];
  }
}
