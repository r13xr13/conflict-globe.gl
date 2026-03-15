import axios from "axios";
import { EventData } from "./conflict";

interface CityBuilding {
  name: string;
  lat: number;
  lon: number;
  height: number; // meters
  floors: number;
  year: number;
  usage: string; // residential, commercial, mixed, etc.
  city: string;
  country: string;
}

// Major world cities with skyscraper data (simplified - in production would use OSM or Skyscraper Center API)
const MAJOR_CITY_BUILDINGS: CityBuilding[] = [
  // New York City
  { name: "One World Trade Center", lat: 40.7127, lon: -74.0134, height: 541, floors: 94, year: 2014, usage: "commercial", city: "New York", country: "USA" },
  { name: "Empire State Building", lat: 40.7484, lon: -73.9857, height: 381, floors: 102, year: 1931, usage: "office", city: "New York", country: "USA" },
  { name: "Chrysler Building", lat: 40.7505, lon: -73.9666, height: 282, floors: 77, year: 1930, usage: "office", city: "New York", country: "USA" },
  { name: "Bank of America Tower", lat: 40.7531, lon: -73.9814, height: 366, floors: 55, year: 2009, usage: "office", city: "New York", country: "USA" },
  
  // Chicago
  { name: "Willis Tower", lat: 41.8789, lon: -87.6359, height: 442, floors: 108, year: 1973, usage: "office", city: "Chicago", country: "USA" },
  { name: "Trump International Hotel & Tower", lat: 41.8888, lon: -87.6259, height: 423, floors: 98, year: 2009, usage: "hotel/condo", city: "Chicago", country: "USA" },
  { name: "St. Regis Chicago", lat: 41.8553, lon: -87.6188, height: 363, floors: 101, year: 2020, usage: "hotel/condo", city: "Chicago", country: "USA" },
  
  // Dubai
  { name: "Burj Khalifa", lat: 25.1972, lon: 55.2744, height: 828, floors: 163, year: 2010, usage: "mixed", city: "Dubai", country: "UAE" },
  { name: "Marina 101", lat: 25.0899, lon: 55.1550, height: 425, floors: 101, year: 2017, usage: "residential", city: "Dubai", country: "UAE" },
  { name: "Princess Tower", lat: 25.0742, lon: 55.1471, height: 414, floors: 101, year: 2012, usage: "residential", city: "Dubai", country: "UAE" },
  { name: "23 Marina", lat: 25.0593, lon: 55.1358, height: 395, floors: 88, year: 2012, usage: "residential", city: "Dubai", country: "UAE" },
  
  // Shanghai
  { name: "Shanghai Tower", lat: 31.2304, lon: 121.5035, height: 632, floors: 128, year: 2015, usage: "office", city: "Shanghai", country: "China" },
  { name: "Shanghai World Financial Center", lat: 31.2369, lon: 121.5032, height: 492, floors: 101, year: 2008, usage: "office", city: "Shanghai", country: "China" },
  { name: "Jin Mao Tower", lat: 31.2303, lon: 121.5080, height: 421, floors: 88, year: 1999, usage: "office", city: "Shanghai", country: "China" },
  
  // Hong Kong
  { name: "International Commerce Centre", lat: 22.3018, lon: 114.1725, height: 484, floors: 118, year: 2010, usage: "office/hotel", city: "Hong Kong", country: "China" },
  { name: "Two International Finance Centre", lat: 22.2867, lon: 114.1588, height: 415, floors: 88, year: 2003, usage: "financial", city: "Hong Kong", country: "China" },
  
  // Kuala Lumpur
  { name: "Petronas Twin Towers 1", lat: 3.1588, lon: 101.7124, height: 452, floors: 88, year: 1998, usage: "office", city: "Kuala Lumpur", country: "Malaysia" },
  { name: "Petronas Twin Towers 2", lat: 3.1588, lon: 101.7135, height: 452, floors: 88, year: 1998, usage: "office", city: "Kuala Lumpur", country: "Malaysia" },
  { name: "The Exchange 106", lat: 3.1470, lon: 101.7137, height: 445, floors: 95, year: 2019, usage: "office", city: "Kuala Lumpur", country: "Malaysia" },
  
  // Tokyo
  { name: "Toranomon Hills Mori Tower", lat: 35.6586, lon: 139.7477, height: 266, floors: 52, year: 2014, usage: "office", city: "Tokyo", country: "Japan" },
  { name: "Abeno Harukas", lat: 34.6551, lon: 135.5188, height: 300, floors: 60, year: 2014, usage: "mixed", city: "Osaka", country: "Japan" },
  
  // London
  { name: "The Shard", lat: 51.5045, lon: -0.0865, height: 310, floors: 72, year: 2012, usage: "office", city: "London", country: "UK" },
  { name: "22 Bishopsgate", lat: 51.5141, lon: -0.0829, height: 278, floors: 62, year: 2020, usage: "office", city: "London", country: "UK" },
  { name: "Heron Tower", lat: 51.5150, lon: -0.0817, height: 230, floors: 46, year: 2011, usage: "office", city: "London", country: "UK" },
  
  // Moscow
  { name: "Federation Tower East", lat: 55.7456, lon: 37.5426, height: 374, floors: 95, year: 2017, usage: "office", city: "Moscow", country: "Russia" },
  { name: "OKO South Tower", lat: 55.7335, lon: 37.5442, height: 354, floors: 85, year: 2015, usage: "residential", city: "Moscow", country: "Russia" },
  
  // Toronto
  { name: "CN Tower", lat: 43.6426, lon: -79.3871, height: 553, floors: 147, year: 1976, usage: "communications/tourist", city: "Toronto", country: "Canada" },
  { name: "First Canadian Place", lat: 43.6479, lon: -79.3791, height: 298, floors: 72, year: 1975, usage: "office", city: "Toronto", country: "Canada" },
  
  // Sydney
  { name: "Sydney Tower", lat: -33.8688, lon: 151.2093, height: 309, floors: ???, year: 1981, usage: "observation/restaurant", city: "Sydney", country: "Australia" },
  
  // Singapore
  { name: "Guoco Tower", lat: 1.2797, lon: 103.8511, height: 290, floors: 65, year: 2016, usage: "mixed", city: "Singapore", country: "Singapore" },
  { name: "UOB Plaza 1", lat: 1.2822, lon: 103.8516, height: 280, floors: 38, year: 1995, usage: "office", city: "Singapore", country: "Singapore" },
  
  // Mumbai
  { name: "World One", lat: 19.0176, lon: 72.8481, height: 307.5, floors: 76, year: 2020, usage: "residential", city: "Mumbai", country: "India" },
  { name: "World View", lat: 19.0168, lon: 72.8475, height: 280.5, floors: 65, year: 2020, usage: "residential", city: "Mumbai", country: "India" },
  { name: "The Imperial Towers I", lat: 19.0353, lon: 72.8289, height: 256, floors: 60, year: 2010, usage: "residential", city: "Mumbai", country: "India" },
  
  // Sao Paulo
  { name: "Altino Arantes Building", lat: -23.5505, lon: -46.6333, height: 161, floors: 36, year: 1947, usage: "office", city: "Sao Paulo", country: "Brazil" },
  { name: "Banespão", lat: -23.5524, lon: -46.6381, height: 151, floors: 29, year: 1965, usage: "office", city: "Sao Paulo", country: "Brazil" },
  
  // Mexico City
  { name: "Torre Reforma", lat: 19.4186, lon: -99.1749, height: 246, floors: 57, year: 2016, usage: "office", city: "Mexico City", country: "Mexico" },
  { name: "Torre BBVA Mexico", lat: 19.4103, lon: -99.1677, height: 235, floors: 50, year: 2015, usage: "office", city: "Mexico City", country: "Mexico" },
  
  // Istanbul
  { name: "Sapphire", lat: 41.0769, lon: 29.0388, height: 261, floors: 69, year: 2011, usage: "residential", city: "Istanbul", country: "Turkey" },
  { name: "Isbank Tower 1", lat: 41.0312, lon: 28.9788, height: 252, floors: 53, year: 2000, usage: "office", city: "Istanbul", country: "Turkey" },
  
  // Jakarta
  { name: "Autograph Tower", lat: -6.1944, lon: 106.8226, height: 382.9, floors: 75, year: 2022, usage: "office", city: "Jakarta", country: "Indonesia" },
  { name: "The Pacific Place Tower 1", lat: -6.2115, lon: 106.8286, height: 240, floors: 50, year: 1996, usage: "office", city: "Jakarta", country: "Indonesia" },
];

export async function fetchCityBuildings(): Promise<EventData[]> {
  try {
    // Convert city buildings to EventData format for visualization
    const buildings: EventData[] = MAJOR_CITY_BUILDINGS.map(building => ({
      id: `building-${building.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      lat: building.lat,
      lon: building.lon,
      date: new Date().toISOString(),
      type: `🏢 ${building.name}`,
      description: `${building.city}, ${building.country} — ${building.height}m tall (${building.floors} floors, built ${building.year}) — ${building.usage}`,
      source: "Building Database",
      category: "land" as const, // Using land category for buildings
      severity: "low" as const,
      // Additional metadata for potential use in visualization
      buildingHeight: building.height,
      buildingFloors: building.floors,
      buildingYear: building.year,
      buildingUsage: building.usage,
      buildingName: building.name,
      buildingCity: building.city,
      buildingCountry: building.country,
    }));
    
    return buildings;
  } catch (error) {
    console.error("City buildings fetch error:", error);
    return [];
  }
}

// Alternative: Generate procedural city density based on population centers
export async function fetchCityDensityPoints(): Promise<EventData[]> {
  const points: EventData[] = [];
  
  // Major metropolitan areas with approximate population (in millions)
  const metroAreas = [
    { name: "Tokyo-Yokohama", lat: 35.6762, lon: 139.6503, pop: 37.8 },
    { name: "Jakarta", lat: -6.2088, lon: 106.8456, pop: 34.5 },
    { name: "Delhi", lat: 28.7041, lon: 77.1025, pop: 32.2 },
    { name: "Seoul-Incheon", lat: 37.5665, lon: 126.9780, pop: 25.6 },
    { name: "Shanghai", lat: 31.2304, lon: 121.4737, pop: 25.6 },
    { name: "São Paulo", lat: -23.5505, lon: -46.6333, pop: 22.0 },
    { name: "Mexico City", lat: 19.4326, lon: -99.1332, pop: 21.9 },
    { name: "Cairo", lat: 30.0444, lon: 31.2357, pop: 20.9 },
    { name: "Mumbai", lat: 19.0760, lon: 72.8777, pop: 20.7 },
    { name: "Beijing", lat: 39.9042, lon: 116.4074, pop: 20.5 },
    { name: "Dhaka", lat: 23.8103, lon: 90.4125, pop: 20.2 },
    { name: "Osaka-Kobe-Kyoto", lat: 34.6937, lon: 135.5022, pop: 19.3 },
    { name: "New York-Newark", lat: 40.7128, lon: -74.0060, pop: 18.8 },
    { name: "Karachi", lat: 24.8607, lon: 67.0011, pop: 16.1 },
    { name: "Buenos Aires", lat: -34.6037, lon: -58.3816, pop: 15.6 },
    { name: "Chongqing", lat: 29.5630, lon: 106.5516, pop: 15.5 },
    { name: "Istanbul", lat: 41.0082, lon: 28.9674, pop: 15.2 },
    { name: "Kolkata", lat: 22.5726, lon: 88.3639, pop: 14.9 },
    { name: "Lagos", lat: 6.5244, lon: 3.3792, pop: 14.8 },
    { name: "Rio de Janeiro", lat: -22.9068, lon: -43.1729, pop: 13.5 },
    { name: "Los Angeles-Long Beach-Anaheim", lat: 34.0522, lon: -118.2437, pop: 13.2 },
    { name: "Shenzhen", lat: 22.5431, lon: 114.0579, pop: 12.6 },
    { name: "London", lat: 51.5074, lon: -0.1278, pop: 12.1 },
    { name: "Bangalore", lat: 12.9716, lon: 77.5946, pop: 12.0 },
    { name: "Paris", lat: 48.8566, lon: 2.3522, pop: 11.1 },
    { name: "Bogotá", lat: 4.7110, lon: -74.0721, pop: 10.9 },
    { name: "Lahore", lat: 31.5497, lon: 74.3436, pop: 11.1 },
    { name: "Hong Kong", lat: 22.3193, lon: 114.1694, pop: 7.5 },
    { name: "Chicago", lat: 41.8781, lon: -87.6298, pop: 9.5 },
    { name: "Toronto", lat: 43.6532, lon: -79.3832, pop: 6.2 },
    { name: "Sydney", lat: -33.8688, lon: 151.2093, pop: 5.4 },
  ];
  
  metroAreas.forEach(area => {
    // Scale building height roughly with population (log scale)
    const height = Math.log(area.pop) * 20 + 20; // Rough scaling: 20m base + 20m per log pop
    const floors = Math.floor(height / 3.5); // Approx 3.5m per floor
    
    points.push({
      id: `city-${area.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      lat: area.lat,
      lon: area.lon,
      date: new Date().toISOString(),
      type: `🏙️ ${area.name} Metro Area`,
      description: `${area.name} — Population: ${area.pop.toFixed(1)} million — Approximate urban mass representation`,
      source: "Urban Population Data",
      category: "land" as const,
      severity: "low" as const,
      // Metadata for potential visualization scaling
      cityPopulation: area.pop,
      cityHeight: height,
      cityFloors: floors,
      cityName: area.name,
    });
  });
  
  return points;
}

// Alternative: Generate urban extent based on night lights or built-up area proxies
export async function fetchUrbanExtents(): Promise<EventData[]> {
  const extents: EventData[] = [];
  
  // Simplified urban regions - in reality would use GHSL or similar data
  const urbanRegions = [
    { name: "Northeast US Corridor", lat: 40.0, lon: -75.0, width: 10, height: 8 }, // NYC to DC
    { name: "Greater London Area", lat: 51.5, lon: -0.1, width: 2, height: 2 },
    { name: "Randstad (Netherlands)", lat: 52.0, lon: 5.0, width: 3, height: 2 }, // Amsterdam-Rotterdam-Utrecht-The Hague
    { name: "Rhine-Ruhr Region", lat: 51.5, lon: 7.0, width: 5, height: 3 }, // Cologne-Dusseldorf-Essen
    { name: "Taiwan Strait Urban Belt", lat: 24.0, lon: 120.5, width: 8, height: 3 }, // Taipei-Kaohsiung
    { name: "Pearl River Delta", lat: 22.5, lon: 113.8, width: 8, height: 6 }, // Guangzhou-Shenzhen-Hong Kong
    { name: "Yangtze River Delta", lat: 31.0, lon: 121.0, width: 10, height: 8 }, // Shanghai-Hangzhou-Nanjing
    { name: "Kanto Plain", lat: 35.5, lon: 139.5, width: 8, height: 6 }, // Tokyo-Yokohama
    { name: "Gauteng Province", lat: -26.2, lon: 28.0, width: 2, height: 2 }, // Johannesburg-Pretoria
    { name: "San Francisco Bay Area", lat: 37.5, lon: -122.2, width: 5, height: 4 }, // SF-SJ-Oakland
    { name: "Greater Johannesburg", lat: -26.2, lon: 28.0, width: 2, height: 2 },
    { name: "Seoul National Capital Area", lat: 37.5, lon: 127.0, width: 3, height: 3 },
    { name: "Bangkok Metropolitan Region", lat: 13.7, lon: 100.5, width: 4, height: 3 },
    { name: "Greater Cairo Region", lat: 30.0, lon: 31.0, width: 2, height: 2 },
    { name: "Mexico City Metropolitan Area", lat: 19.4, lon: -99.1, width: 2, height: 2 },
    { name: "Greater Kuala Lumpur", lat: 3.1, lon: 101.7, width: 2, height: 2 },
  ];
  
  urbanRegions.forEach(region => {
    // Create a grid of points to represent the urban extent
    const pointsPerSide = 5;
    const latStep = region.height / (pointsPerSide - 1);
    const lonStep = region.width / (pointsPerSide - 1);
    
    for (let i = 0; i < pointsPerSide; i++) {
      for (let j = 0; j < pointsPerSide; j++) {
        const lat = region.lat - region.height/2 + i * latStep;
        const lon = region.lon - region.width/2 + j * lonStep;
        
        extents.push({
          id: `urban-${region.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${i}-${j}`,
          lat: lat,
          lon: lon,
          date: new Date().toISOString(),
          type: `🏘️ ${region.name} Urban Area`,
          description: `${region.name} — Built-up area representing urban extent`,
          source: "Urban Extent Data",
          category: "land" as const,
          severity: "low" as const,
          urbanRegion: region.name,
        });
      }
    }
  });
  
  return extents;
}
