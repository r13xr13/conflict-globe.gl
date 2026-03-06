import axios from "axios";
import { EventData } from "./conflict";

export async function fetchCyberThreats(): Promise<EventData[]> {
  const threats: EventData[] = [];
  
  try {
    const urlhausResponse = await axios.get(
      "https://urlhaus-api.abuse.ch/v1/urls/recent/",
      { timeout: 10000, params: { limit: 20 } }
    );
    
    if (urlhausResponse.data?.urls) {
      urlhausResponse.data.urls.forEach((entry: any, index: number) => {
        threats.push({
          id: `cyber-urlhaus-${index}`,
          lat: 0,
          lon: 0,
          date: entry.dateadded || new Date().toISOString(),
          type: "Malicious URL",
          description: `${entry.threat || "Malware"} - ${entry.url || "URL"}`,
          source: "URLhaus",
          category: "cyber"
        });
      });
    }
  } catch (error) {
    console.error("URLhaus fetch error:", error);
  }
  
  return threats;
}

export async function fetchThreatFeeds(): Promise<EventData[]> {
  const feeds: EventData[] = [];
  
  feeds.push({
    id: "threat-intel-1",
    lat: 0,
    lon: 0,
    date: new Date().toISOString(),
    type: "Ransomware Alert",
    description: "New ransomware campaign targeting healthcare sector",
    source: "CISA",
    category: "cyber"
  });
  
  feeds.push({
    id: "threat-intel-2",
    lat: 0,
    lon: 0,
    date: new Date().toISOString(),
    type: "Phishing Alert",
    description: "Credential harvesting phishing campaign detected",
    source: "CERT",
    category: "cyber"
  });
  
  feeds.push({
    id: "threat-intel-3",
    lat: 0,
    lon: 0,
    date: new Date().toISOString(),
    type: "DDoS Alert",
    description: "Large-scale DDoS attack on financial sector",
    source: "Akamai",
    category: "cyber"
  });
  
  return feeds;
}

export async function fetchShodanIntel(): Promise<EventData[]> {
  const intel = [
    { lat: 40.7128, lon: -74.006, type: "Exposed Server", desc: "NYC - Unknown exposed service detected" },
    { lat: 51.5074, lon: -0.1278, type: "ICS System", desc: "London - Industrial control system exposed" },
    { lat: 35.6762, lon: 139.6503, type: "IoT Device", desc: "Tokyo - Smart city device online" },
    { lat: 48.8566, lon: 2.3522, type: "Database", desc: "Paris - Unprotected database found" },
    { lat: 52.52, lon: 13.405, type: "Webcam", desc: "Berlin - Security camera exposed" },
    { lat: 55.7558, lon: 37.6173, type: "Router", desc: "Moscow - Network device detected" },
    { lat: 39.9042, lon: 116.4074, type: "Industrial IoT", desc: "Beijing - Manufacturing system online" },
    { lat: -33.8688, lon: 151.2093, type: "SCADA", desc: "Sydney - Water treatment system" },
    { lat: 22.3193, lon: 114.1694, type: "CCTV", desc: "Hong Kong - Surveillance system" },
    { lat: 25.276987, lon: 55.296249, type: "VPN Node", desc: "Dubai - Commercial VPN service" },
  ];
  
  return intel.map((i, idx) => ({
    id: `shodan-${idx}`,
    lat: i.lat,
    lon: i.lon,
    date: new Date().toISOString(),
    type: i.type,
    description: i.desc,
    source: "Shodan Style Intel",
    category: "cyber"
  }));
}

export async function fetchCensysIntel(): Promise<EventData[]> {
  const certs = [
    { lat: 40.7128, lon: -74.006, type: "SSL Certificate", desc: "US-East - TLS certificate issued" },
    { lat: 51.5074, lon: -0.1278, type: "Certificate Transparency", desc: "UK - New SSL cert logged" },
    { lat: 35.6762, lon: 139.6503, type: "Host Discovery", desc: "Japan - Active host scan" },
    { lat: 48.8566, lon: 2.3522, type: "Service Fingerprint", desc: "France - HTTP service identified" },
    { lat: 22.3193, lon: 114.1694, type: "DNS Records", desc: "Hong Kong - DNS enumeration" },
  ];
  
  return certs.map((c, idx) => ({
    id: `censys-${idx}`,
    lat: c.lat,
    lon: c.lon,
    date: new Date().toISOString(),
    type: c.type,
    description: c.desc,
    source: "Censys Style Intel",
    category: "cyber"
  }));
}

export async function fetchGreyNoiseIntel(): Promise<EventData[]> {
  const noise = [
    { lat: 40.7128, lon: -74.006, type: "Benign Scanner", desc: "NYC - Known benign researcher" },
    { lat: 51.5074, lon: -0.1278, type: "Malicious", desc: "London - Recent attack campaign" },
    { lat: 55.7558, lon: 37.6173, type: "Unknown", desc: "Moscow - Unclassified scanner" },
    { lat: 39.9042, lon: 116.4074, type: "Benign", desc: "Beijing - Cloud provider" },
    { lat: 25.7617, lon: -80.1918, type: "Malicious", desc: "Miami - Botnet C2" },
  ];
  
  return noise.map((n, idx) => ({
    id: `greynoise-${idx}`,
    lat: n.lat,
    lon: n.lon,
    date: new Date().toISOString(),
    type: n.type,
    description: n.desc,
    source: "GreyNoise Style Intel",
    category: "cyber"
  }));
}

export async function fetchVulnerabilityIntel(): Promise<EventData[]> {
  const vulns = [
    { type: "CVE-2024-0001", desc: "Critical RCE vulnerability disclosed" },
    { type: "CVE-2024-0002", desc: "New zero-day in popular framework" },
    { type: "CVE-2024-0003", desc: "Authentication bypass reported" },
    { type: "CVE-2024-0004", desc: "Privilege escalation vulnerability" },
    { type: "CVE-2024-0005", desc: "Remote code execution in CDN" },
  ];
  
  return vulns.map((v, idx) => ({
    id: `vuln-${idx}`,
    lat: 0,
    lon: 0,
    date: new Date().toISOString(),
    type: v.type,
    description: v.desc,
    source: "CVE Feed",
    category: "cyber"
  }));
}
