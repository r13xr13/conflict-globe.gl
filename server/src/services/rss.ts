import axios from "axios";
import { EventData } from "./conflict";

const RSS_FEEDS = [
  { name: "Reuters World", url: "https://feeds.reuters.com/reuters/worldNews" },
  { name: "BBC World", url: "http://feeds.bbci.co.uk/news/world/rss.xml" },
  { name: "Al Jazeera", url: "https://www.aljazeera.com/xml/rss/all.xml" },
  { name: "AP News", url: "https://feeds.apnews.com/apnews/topnews" },
  { name: "Defense News", url: "https://www.defensenews.com/arc/outboundfeeds/rss/" },
  { name: "Arms Control", url: "https://www.armscontrolwonk.com/rss" },
  { name: "War on the Rocks", url: "https://warontherocks.com/feed/" },
  { name: "Small Wars Journal", url: "https://smallwarsjournal.com/blog/rss.xml" },
];

function extractGeoFromText(text: string): { lat: number; lon: number } | null {
  const patterns = [
    /(?:lat|latitude)[\s:=]*(-?\d+\.?\d*)/i,
    /(?:lon|lng|longitude)[\s:=]*(-?\d+\.?\d*)/i,
  ];
  
  const latMatch = text.match(patterns[0]);
  const lonMatch = text.match(patterns[1]);
  
  if (latMatch && lonMatch) {
    const lat = parseFloat(latMatch[1]);
    const lon = parseFloat(lonMatch[1]);
    if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
      return { lat, lon };
    }
  }
  
  const knownLocations: Record<string, { lat: number; lon: number }> = {
    "ukraine": { lat: 48.3794, lon: 31.1656 },
    "russia": { lat: 55.7558, lon: 37.6173 },
    "gaza": { lat: 31.3547, lon: 34.3088 },
    "israel": { lat: 31.0461, lon: 34.8516 },
    "syria": { lat: 34.8021, lon: 38.9968 },
    "iraq": { lat: 33.3152, lon: 44.3661 },
    "afghanistan": { lat: 33.9391, lon: 67.7099 },
    "yemen": { lat: 15.5527, lon: 48.5164 },
    "libya": { lat: 26.3351, lon: 17.2283 },
    "sudan": { lat: 12.8628, lon: 30.2176 },
    "ethiopia": { lat: 9.145, lon: 40.4897 },
    "mali": { lat: 17.5707, lon: -3.9962 },
    "nigeria": { lat: 9.082, lon: 8.6753 },
    "somalia": { lat: 5.1521, lon: 46.1996 },
    "congo": { lat: -4.0383, lon: 21.7587 },
    "haiti": { lat: 18.9712, lon: -72.2852 },
    "venezuela": { lat: 6.4238, lon: -66.5897 },
    "brazil": { lat: -14.235, lon: -51.9253 },
    "mexico": { lat: 23.6345, lon: -102.5528 },
    "china": { lat: 35.8617, lon: 104.1954 },
    "taiwan": { lat: 23.6978, lon: 120.9605 },
    "north korea": { lat: 40.3399, lon: 127.5101 },
    "south korea": { lat: 35.9078, lon: 127.7669 },
    "india": { lat: 20.5937, lon: 78.9629 },
    "pakistan": { lat: 30.3753, lon: 69.3451 },
    "iran": { lat: 32.4279, lon: 53.688 },
    "saudi arabia": { lat: 23.8859, lon: 45.0792 },
    "nato": { lat: 50.8503, lon: 4.3517 },
    "white house": { lat: 38.8977, lon: -77.0365 },
    "pentagon": { lat: 38.8719, lon: -77.0563 },
    "moscow": { lat: 55.7558, lon: 37.6173 },
    "kiev": { lat: 50.4501, lon: 30.5234 },
    "london": { lat: 51.5074, lon: -0.1278 },
    "paris": { lat: 48.8566, lon: 2.3522 },
    "berlin": { lat: 52.52, lon: 13.405 },
    "tokyo": { lat: 35.6762, lon: 139.6503 },
    "beijing": { lat: 39.9042, lon: 116.4074 },
    "washington": { lat: 38.9072, lon: -77.0369 },
    "south china sea": { lat: 15.0, lon: 115.0 },
    "persian gulf": { lat: 26.0, lon: 52.0 },
    "red sea": { lat: 20.0, lon: 38.0 },
    "mediterranean": { lat: 35.0, lon: 18.0 },
    "caribbean": { lat: 15.0, lon: -75.0 },
    "atlantic": { lat: 30.0, lon: -40.0 },
    "pacific": { lat: 0.0, lon: -150.0 },
  };
  
  const lowerText = text.toLowerCase();
  for (const [location, coords] of Object.entries(knownLocations)) {
    if (lowerText.includes(location)) {
      return coords;
    }
  }
  
  return null;
}

export async function fetchRSSNews(): Promise<EventData[]> {
  const events: EventData[] = [];
  
  for (const feed of RSS_FEEDS) {
    try {
      const response = await axios.get(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed.url)}`, {
        timeout: 8000
      });
      
      if (response.data?.status === "ok" && response.data.items) {
        for (const item of response.data.items.slice(0, 5)) {
          const geo = extractGeoFromText(item.title + " " + item.description);
          
          events.push({
            id: `rss-${feed.name}-${events.length}`,
            lat: geo?.lat || 0,
            lon: geo?.lon || 0,
            date: item.pubDate || new Date().toISOString(),
            type: `News: ${feed.name}`,
            description: `${item.title.substring(0, 100)}...`,
            source: feed.name,
              category: "social"
          });
        }
      }
    } catch (error) {
      console.error(`RSS feed error (${feed.name}):`, error);
    }
  }
  
  return events;
}

export async function fetchDefenseNews(): Promise<EventData[]> {
  const events: EventData[] = [];
  
  try {
    const response = await axios.get(
      "https://newsapi.org/v2/top-headlines?category=world&apiKey=demo",
      { timeout: 8000 }
    );
    
    if (response.data?.articles) {
      for (const article of response.data.articles.slice(0, 10)) {
        const geo = extractGeoFromText(article.title + " " + article.description);
        
        if (geo) {
          events.push({
            id: `news-${events.length}`,
            lat: geo.lat,
            lon: geo.lon,
            date: article.publishedAt || new Date().toISOString(),
            type: "Breaking News",
            description: article.title,
            source: article.source?.name || "News API",
              category: "social"
          });
        }
      }
    }
  } catch (error) {
    console.error("Defense news error:", error);
  }
  
  return events;
}
