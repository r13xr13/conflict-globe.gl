import axios from "axios";
import { EventData } from "./conflict";

const NEWS_API_KEY = process.env.NEWSAPI_KEY;
const NEWS_API_URL = "https://newsapi.org/v2";

export async function fetchGlobalNews(): Promise<EventData[]> {
  if (!NEWS_API_KEY) {
    console.log("[NewsAPI] No API key configured");
    return [];
  }

  try {
    const keywords = [
      "military", "conflict", "war", "attack", "troops", "invasion",
      "ceasefire", "peace", "terrorism", "armed", "battle"
    ];

    const queries = keywords.slice(0, 3);
    const allNews: EventData[] = [];

    for (const query of queries) {
      const resp = await axios.get(`${NEWS_API_URL}/everything`, {
        params: {
          q: query,
          language: "en",
          sortBy: "publishedAt",
          pageSize: 15,
          apiKey: NEWS_API_KEY,
        },
        timeout: 10000,
      });

      if (resp.data?.articles) {
        for (const article of resp.data.articles) {
          if (!article.title || !article.url) continue;
          
          const lat = article.lat || 0;
          const lon = article.lon || 0;

          if (lat !== 0 && lon !== 0) {
            allNews.push({
              id: `news-${article.url}`,
              lat,
              lon,
              date: article.publishedAt || new Date().toISOString(),
              type: "News: " + (article.source?.name || "Unknown"),
              description: article.title + (article.description ? " — " + article.description.slice(0, 200) : ""),
              source: article.source?.name || "NewsAPI",
              category: "social",
              severity: "low",
            });
          }
        }
      }
    }

    console.log(`[NewsAPI] Fetched ${allNews.length} geo-tagged articles`);
    return allNews;
  } catch (err: any) {
    console.error("[NewsAPI] Error:", err.response?.data || err.message);
    return [];
  }
}
