import axios from "axios";
import { EventData } from "./conflict";

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;
const N8N_API_KEY = process.env.N8N_API_KEY;

export async function fetchFromN8nWorkflow(): Promise<EventData[]> {
  if (!N8N_WEBHOOK_URL) {
    return [];
  }

  try {
    const headers: Record<string, string> = {};
    if (N8N_API_KEY) {
      headers["X-N8N-API-KEY"] = N8N_API_KEY;
    }

    const resp = await axios.get(N8N_WEBHOOK_URL, {
      headers,
      timeout: 15000,
    });

    const data = resp.data;
    if (!data) return [];

    const events: EventData[] = Array.isArray(data) ? data : [data];
    console.log(`[n8n] Fetched ${events.length} events from webhook`);
    
    return events
      .filter((e: any) => e.lat && e.lon)
      .map((e: any) => ({
        id: e.id || `n8n-${Date.now()}`,
        lat: parseFloat(e.lat),
        lon: parseFloat(e.lon),
        date: e.date || new Date().toISOString(),
        type: e.type || "n8n Event",
        description: e.description || "",
        source: "n8n",
        category: e.category || "conflict",
        severity: e.severity || "medium",
      }));
  } catch (err: any) {
    console.error("[n8n] Error:", err.message);
    return [];
  }
}

export async function sendToN8nWebhook(events: EventData[]): Promise<boolean> {
  if (!N8N_WEBHOOK_URL) return false;

  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (N8N_API_KEY) {
      headers["X-N8N-API-KEY"] = N8N_API_KEY;
    }

    await axios.post(N8N_WEBHOOK_URL, { events, timestamp: new Date().toISOString() }, { headers });
    console.log(`[n8n] Sent ${events.length} events to webhook`);
    return true;
  } catch (err: any) {
    console.error("[n8n] Send error:", err.message);
    return false;
  }
}
