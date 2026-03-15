import axios from "axios";
import { EventData } from "./conflict";

const ANTENA_API_URL = process.env.ANTENA_API_URL || "http://localhost:3000";
const ANTENA_API_KEY = process.env.ANTENA_API_KEY || "ant_agent_c9f01afd59322dc2dca1daf5e436c87b";

// Conflict-relevant signal types and keywords
const CONFLICT_RELEVANT_TYPES = [
  "military", "tactical", "navigation", "communication", "radar", 
  "jammer", "drone", "uav", "missile", "radar", "lidar", "sonar",
  "frequency hopping", "spread spectrum", "encrypted", "digital"
];

const CONFLICT_KEYWORDS = [
  "military", "tactical", "combat", "operation", "exercise", "drone", 
  "uav", "missile", "radar", "jammer", "encrypted", "frequency", 
  "hopping", "spread spectrum", "navigation", "guidance", "targeting"
];

export async function fetchAntennaSignals(): Promise<EventData[]> {
  try {
    // Fetch detected signals/transmissions from antenna system
    const response = await axios.get(
      `${ANTENA_API_URL}/api/signals`,
      {
        headers: {
          "Authorization": `Bearer ${ANTENA_API_KEY}`,
          "Content-Type": "application/json"
        },
        timeout: 10000
      }
    );

    if (!response.data?.signals) return [];

    // Process and filter signals for conflict relevance
    const signals = response.data.signals
      .map((signal: any) => {
        // Convert antenna signal data to EventData format
        const signalType = signal.type || "";
        const description = signal.description || "";
        const frequency = signal.frequency || 0;
        
        // Determine if signal is conflict-relevant
        const isConflictRelevant = 
          CONFLICT_RELEVANT_TYPES.some(type => 
            signalType.toLowerCase().includes(type) || 
            description.toLowerCase().includes(type)
          ) ||
          CONFLICT_KEYWORDS.some(keyword => 
            description.toLowerCase().includes(keyword)
          ) ||
          // Military frequency bands (HF, VHF, UHF, L-band, S-band, C-band, X-band, Ku-band, Ka-band)
          (frequency >= 3 && frequency <= 30) || // HF: 3-30 MHz
          (frequency >= 30 && frequency <= 300) || // VHF: 30-300 MHz
          (frequency >= 300 && frequency <= 3000) || // UHF: 300-3000 MHz
          (frequency >= 1000 && frequency <= 2000) || // L-band: 1-2 GHz
          (frequency >= 2000 && frequency <= 4000) || // S-band: 2-4 GHz
          (frequency >= 4000 && frequency <= 8000) || // C-band: 4-8 GHz
          (frequency >= 8000 && frequency <= 12000) || // X-band: 8-12 GHz
          (frequency >= 12000 && frequency <= 18000) || // Ku-band: 12-18 GHz
          (frequency >= 18000 && frequency <= 26500) || // Ka-band: 18-26.5 GHz
          frequency >= 26500; // Above Ka-band

        return {
          id: `antenna-${signal.id || Math.random().toString(36).substr(2, 9)}`,
          lat: signal.latitude || 0,
          lon: signal.longitude || 0,
          date: signal.timestamp || new Date().toISOString(),
          type: `📡 ${signalType || "Radio Signal"}`,
          description: `${description || ""} Frequency: ${frequency || "Unknown"} MHz, Power: ${signal.power || "Unknown"} dBm`,
          source: "Antenna Array",
          category: "radio" as const,
          severity: isConflictRelevant ? "high" : signal.severity || "medium" as const,
          // Additional metadata for antenna-specific visualization
          frequency: signal.frequency,
          power: signal.power,
          bandwidth: signal.bandwidth,
          modulation: signal.modulation,
          signalType: signal.type,
          antennaId: signal.antenna_id,
          confidence: signal.confidence,
          // Conflict relevance flag
          conflictRelevant: isConflictRelevant
        };
      })
      .filter(signal => 
        // Filter out invalid coordinates
        !isNaN(signal.lat) && !isNaN(signal.lon) && 
        signal.lat !== 0 && signal.lon !== 0 &&
        signal.lat >= -90 && signal.lat <= 90 &&
        signal.lon >= -180 && signal.lon <= 180
      );

    // Sort by relevance and confidence (highest first)
    return signals.sort((a, b) => {
      const relevanceA = (a.conflictRelevant ? 1 : 0) * 10 + (a.confidence || 0);
      const relevanceB = (b.conflictRelevant ? 1 : 0) * 10 + (b.confidence || 0);
      return relevanceB - relevanceA; // Descending order
    });
  } catch (error) {
    console.error("Antenna signals fetch error:", error);
    return [];
  }
}

// Get antenna array status and health
export async function fetchAntennaStatus(): Promise<EventData[]> {
  try {
    const response = await axios.get(
      `${ANTENA_API_URL}/api/status`,
      {
        headers: {
          "Authorization": `Bearer ${ANTENA_API_KEY}`,
          "Content-Type": "application/json"
        },
        timeout: 5000
      }
    );

    if (!response.data) return [];

    // Determine if antenna status indicates conflict monitoring activity
    const isActive = response.data.status === "online" && 
                    (response.data.signalsPerMinute || 0) > 0;
                    
    return [
      {
        id: "antenna-status",
        lat: response.data.latitude || 0,
        lon: response.data.longitude || 0,
        date: new Date().toISOString(),
        type: `📡 Antenna Array Status`,
        description: `Status: ${response.data.status || "Unknown"} | Uptime: ${response.data.uptime || "Unknown"} | Signals/min: ${response.data.signalsPerMinute || 0} | Conflict-relevant: ${isActive ? "Yes" : "No"}`,
        source: "Antenna Array",
        category: "radio" as const,
        severity: response.data.status === "online" && (response.data.signalsPerMinute || 0) > 10 ? "high" : 
                  response.data.status === "online" ? "low" : 
                  response.data.status === "degraded" ? "medium" : "high" as const,
        // Additional metadata
        antennaId: response.data.antenna_id,
        version: response.data.version,
        status: response.data.status,
        uptime: response.data.uptime,
        signalsPerMinute: response.data.signalsPerMinute,
        // Conflict monitoring flag
        conflictMonitoringActive: isActive
      }
    ];
  } catch (error) {
    console.error("Antenna status fetch error:", error);
    return [];
  }
}
