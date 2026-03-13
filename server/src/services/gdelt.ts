import axios from "axios";
import { EventData } from "./conflict";

const GDELT_URL = "https://api.gdeltproject.org/api/v2/doc/doc";

export async function fetchGdeltevents(): Promise<EventData[]> {
  try {
    const resp = await axios.get(GDELT_URL, {
      params: {
        query: "military OR conflict OR war OR attack OR troops",
        mode: "artlist",
        maxrecords: 50,
        format: "json",
        sort: "DateDesc",
      },
      timeout: 15000,
    });

    if (!resp.data?.articles) return [];

    const events: EventData[] = resp.data.articles
      .filter((a: any) => a.segmented && a.country && a.location)
      .slice(0, 30)
      .map((a: any) => ({
        id: `gdelt-${a.url}`,
        lat: a.location?.lat || 0,
        lon: a.location?.lon || 0,
        date: a.segmented?.date || new Date().toISOString(),
        type: "Event: " + (a.domain || "GDELT"),
        description: (a.title || "").slice(0, 300),
        source: "GDELT",
        category: "conflict" as const,
        severity: "medium" as const,
      }))
      .filter((e: EventData) => e.lat !== 0 && e.lon !== 0);

    console.log(`[GDELT] Fetched ${events.length} events`);
    return events;
  } catch (err: any) {
    console.error("[GDELT] Error:", err.message);
    return [];
  }
}
