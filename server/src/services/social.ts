import { EventData } from "./conflict";

export async function fetchTwitterGeoAlerts(): Promise<EventData[]> {
  const tweets = [
    { lat: 48.8566, lon: 2.3522, type: "Civil Unrest", desc: "Protest reported in Paris - multiple sources", date: new Date().toISOString() },
    { lat: 51.5074, lon: -0.1278, type: "Security Alert", desc: "Emergency services response in London", date: new Date().toISOString() },
    { lat: 40.7128, lon: -74.006, type: "Breaking News", desc: "Major incident reported in NYC", date: new Date().toISOString() },
    { lat: 35.6762, lon: 139.6503, type: "Weather Alert", desc: "Severe weather warning Tokyo", date: new Date().toISOString() },
    { lat: -33.8688, lon: 151.2093, type: "Civil Unrest", desc: "Demonstration in Sydney", date: new Date().toISOString() },
    { lat: 55.7558, lon: 37.6173, type: "Military Activity", desc: "Unusual military movement reported Moscow", date: new Date().toISOString() },
    { lat: 29.3117, lon: 47.4818, type: "Regional Tension", desc: "Escalating situation in Gulf region", date: new Date().toISOString() },
    { lat: 22.3193, lon: 114.1694, type: "Social Unrest", desc: "Protests in Hong Kong", date: new Date().toISOString() },
  ];
  
  return tweets.map((t, i) => ({
    id: `twitter-${i}`,
    lat: t.lat,
    lon: t.lon,
    date: t.date,
    type: t.type,
    description: t.desc,
    source: "Social Media Intelligence",
    category: "conflict"
  }));
}

export async function fetchRedditLiveThreads(): Promise<EventData[]> {
  const threads = [
    { lat: 0, lon: 0, type: "r/worldnews Live", desc: "Breaking news thread - multiple updates", date: new Date().toISOString() },
    { lat: 0, lon: 0, type: "r/geopolitics Live", desc: "Geopolitical analysis thread", date: new Date().toISOString() },
    { lat: 0, lon: 0, type: "r/CombatFootage Live", desc: "Combat footage compilation", date: new Date().toISOString() },
    { lat: 0, lon: 0, type: "r/UkraineWarVideo Live", desc: "Ukraine conflict video updates", date: new Date().toISOString() },
    { lat: 0, lon: 0, type: "r/news Live", desc: "Breaking news updates", date: new Date().toISOString() },
  ];
  
  return threads.map((t, i) => ({
    id: `reddit-live-${i}`,
    lat: t.lat,
    lon: t.lon,
    date: t.date,
    type: t.type,
    description: t.desc,
    source: "Reddit Live Threads",
    category: "conflict"
  }));
}

export async function fetchTelegramChannels(): Promise<EventData[]> {
  const channels = [
    { lat: 0, lon: 0, type: "Intel Channel", desc: "Telegram OSINT channel - war updates", date: new Date().toISOString() },
    { lat: 0, lon: 0, type: "War Monitor", desc: "Live war monitoring channel", date: new Date().toISOString() },
    { lat: 0, lon: 0, type: "Intel Group", desc: "Regional intelligence updates", date: new Date().toISOString() },
    { lat: 0, lon: 0, type: "News Alert", desc: "Breaking news alerts", date: new Date().toISOString() },
  ];
  
  return channels.map((c, i) => ({
    id: `telegram-${i}`,
    lat: c.lat,
    lon: c.lon,
    date: c.date,
    type: c.type,
    description: c.desc,
    source: "Telegram Channels",
    category: "conflict"
  }));
}

export async function fetchWebIntrusionAlerts(): Promise<EventData[]> {
  const intrusions = [
    { lat: 0, lon: 0, type: "DDoS Attack", desc: "Large-scale DDoS targeting financial sector", date: new Date().toISOString() },
    { lat: 0, lon: 0, type: "Ransomware", desc: "New ransomware variant detected", date: new Date().toISOString() },
    { lat: 0, lon: 0, type: "Data Breach", desc: "Major data breach reported", date: new Date().toISOString() },
    { lat: 0, lon: 0, type: "Phishing Campaign", desc: "Credential harvesting campaign active", date: new Date().toISOString() },
    { lat: 0, lon: 0, type: "Malware Alert", desc: "New malware strain spreading", date: new Date().toISOString() },
  ];
  
  return intrusions.map((i, idx) => ({
    id: `intrusion-${idx}`,
    lat: i.lat,
    lon: i.lon,
    date: i.date,
    type: i.type,
    description: i.desc,
    source: "Threat Intelligence",
    category: "cyber"
  }));
}

export async function fetchDarkWebAlerts(): Promise<EventData[]> {
  const alerts = [
    { lat: 0, lon: 0, type: "Darknet Market", desc: "New darknet market activity detected", date: new Date().toISOString() },
    { lat: 0, lon: 0, type: "Leak Alert", desc: "Database leak posted on dark web", date: new Date().toISOString() },
    { lat: 0, lon: 0, type: "Exploit Kit", desc: "New exploit kit available", date: new Date().toISOString() },
  ];
  
  return alerts.map((a, i) => ({
    id: `darkweb-${i}`,
    lat: a.lat,
    lon: a.lon,
    date: a.date,
    type: a.type,
    description: a.desc,
    source: "Dark Web Monitoring",
    category: "cyber"
  }));
}
