import axios from "axios";
import { EventData } from "./conflict";

const WIKIDATA_ENDPOINT = "https://query.wikidata.org/sparql";

export async function fetchWikidataConflicts(): Promise<EventData[]> {
  try {
    // Query for recent armed conflicts and battles
    const query = `
      SELECT ?item ?itemLabel ?location ?locationLabel ?startTime ?endTime WHERE {
        ?item wdt:P31/wdt:P279* wd:Q178561;  # instances of war or subclasses
        OPTIONAL { ?item wdt:P585 ?startTime. }  # start time
        OPTIONAL { ?item wdt:P582 ?endTime. }    # end time
        OPTIONAL { ?item wdt:P276 ?location. }   # location
        FILTER (!CONTAINS(LCASE(?startTime || ""), "xxxx"))
        SAMPLE(?itemLabel) ?locationLabel
      }
      GROUP BY ?item ?location ?startTime ?endTime ?itemLabel ?locationLabel
      ORDER BY DESC(?startTime)
      LIMIT 20
    `;
    
    const response = await axios.get(WIKIDATA_ENDPOINT, {
      params: {
        query: query,
        format: "json"
      },
      headers: {
        "User-Agent": "ConflictGlobe/2.0 (https://github.com/r13xr13/conflict-globe.gl)"
      },
      timeout: 15000
    });

    if (!response.data?.results?.bindings) return [];

    return response.data.results.bindings
      .map((binding: any) => {
        const startTime = binding.startTime?.value;
        const endTime = binding.endTime?.value;
        const date = startTime || endTime || new Date().toISOString();
        
        return {
          id: `wikidata-${binding.item.value.split("/").pop()}`,
          lat: 0,  // Will need to get coordinates from location separately
          lon: 0,
          date: date,
          type: binding.itemLabel?.value || "Wikidata Conflict Event",
          description: `Conflict: ${binding.itemLabel?.value || ""} ${binding.locationLabel?.value ? `in ${binding.locationLabel.value}` : ""}`,
          source: "Wikidata",
          category: "conflict" as const,
          severity: "medium" as const,
        };
      })
      .filter(item => item.lat !== 0 && item.lon !== 0);  // Filter out items without coordinates
  } catch (error) {
    console.error("Wikidata conflicts fetch error:", error);
    return [];
  }
}

// Get coordinates for locations from Wikidata
export async function fetchWikidataLocations(): Promise<EventData[]> {
  try {
    // Query for cities with populations over 1 million and their coordinates
    const query = `
      SELECT ?city ?cityLabel ?lat ?lon ?population WHERE {
        ?city wdt:P31/wdt:P279* wd:Q515.  # instances of city
        ?city wdt:P1082 ?population.      # population
        ?city wdt:P625 ?coord.            # coordinates
        ?city rdfs:label ?cityLabel.
        FILTER (LANG(?cityLabel) = "en")
        FILTER (?population > 1000000)
        BIND(STRBEFORE(STR(?coord), "Point(") AS @dummy)
        BIND(STRAFTER(STR(?coord), "Point(") AS @coords)
        BIND(STRBEFORE(@coords, ")") AS @clean)
        BIND(SPLIT(@clean, " ") AS @parts)
        BIND(@parts[0] AS ?lon)
        BIND(@parts[1] AS ?lat)
      }
      ORDER BY DESC(?population)
      LIMIT 50
    `;
    
    const response = await axios.get(WIKIDATA_ENDPOINT, {
      params: {
        query: query,
        format: "json"
      },
      headers: {
        "User-Agent": "ConflictGlobe/2.0 (https://github.com/r13xr13/conflict-globe.gl)"
      },
      timeout: 15000
    });

    if (!response.data?.results?.bindings) return [];

    return response.data.results.bindings
      .map((binding: any) => {
        return {
          id: `wikidata-city-${binding.city.value.split("/").pop()}`,
          lat: parseFloat(binding.lat?.value),
          lon: parseFloat(binding.lon?.value),
          date: new Date().toISOString(),
          type: `🏙️ ${binding.cityLabel?.value || "Unknown City"}`,
          description: `${binding.cityLabel?.value} - Population: ${parseInt(binding.population?.value || "0").toLocaleString()}`,
          source: "Wikidata",
          category: "land" as const,
          severity: "low" as const,
        };
      })
      .filter(item => !isNaN(item.lat) && !isNaN(item.lon));
  } catch (error) {
    console.error("Wikidata locations fetch error:", error);
    return [];
  }
}
