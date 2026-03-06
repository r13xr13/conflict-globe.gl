export type ConflictEvent = {
  id: string;
  lat: number;
  lon: number;
  date: string;
  type: string;
  description: string;
  source?: string;
  category: "conflict" | "maritime" | "air" | "cyber" | "land" | "space" | "radio" | "weather" | "earthquakes" | "social";
};

export type Summary = {
  total: number;
  conflicts: number;
  maritime: number;
  air: number;
  cyber: number;
  land: number;
  space: number;
  radio: number;
  weather: number;
  earthquakes: number;
  social: number;
};

export async function fetchConflicts(): Promise<ConflictEvent[]> {
  const res = await fetch("/api/conflicts");
  if (!res.ok) throw new Error("Failed to load conflicts");
  const data = await res.json();
  return data.events as ConflictEvent[];
}

export async function fetchByCategory(category: string): Promise<ConflictEvent[]> {
  const res = await fetch(`/api/conflicts/${category}`);
  if (!res.ok) throw new Error("Failed to load data");
  const data = await res.json();
  return data.events as ConflictEvent[];
}
