import { tool } from "ai";
import { z } from "zod";

// Maps interest categories to OpenStreetMap tag filters for the Overpass API
const CATEGORY_FILTERS: Record<string, string[]> = {
  history: [
    'node["historic"]',
    'way["historic"]',
    'node["tourism"="museum"]',
    'way["tourism"="museum"]',
  ],
  museums: ['node["tourism"="museum"]', 'way["tourism"="museum"]'],
  nature: [
    'node["leisure"="park"]',
    'way["leisure"="park"]',
    'node["natural"="beach"]',
    'way["natural"="beach"]',
    'node["tourism"="viewpoint"]',
  ],
  food: ['node["amenity"="restaurant"]["cuisine"]', 'node["amenity"="marketplace"]'],
  nightlife: ['node["amenity"="bar"]', 'node["amenity"="pub"]', 'node["amenity"="nightclub"]'],
  landmarks: [
    'node["tourism"="attraction"]',
    'way["tourism"="attraction"]',
    'node["tourism"="viewpoint"]',
  ],
  religion: ['node["amenity"="place_of_worship"]', 'way["amenity"="place_of_worship"]'],
  shopping: ['node["shop"="mall"]', 'node["amenity"="marketplace"]'],
};

const CATEGORIES = Object.keys(CATEGORY_FILTERS) as [string, ...string[]];

interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

export const attractions = tool({
  description:
    "Find points of interest near coordinates from OpenStreetMap, filtered by interest category. Use after geocoding the destination. Call once per relevant category.",
  inputSchema: z.object({
    latitude: z.number(),
    longitude: z.number(),
    category: z
      .enum(CATEGORIES)
      .describe("Interest category to search for"),
    radiusMeters: z.number().int().min(500).max(20000).default(5000),
    limit: z.number().int().min(1).max(25).default(15),
  }),
  execute: async ({ latitude, longitude, category, radiusMeters, limit }) => {
    const filters = CATEGORY_FILTERS[category];
    // Use a bbox instead of (around:...) - radius filters on ways routinely
    // time out server-side on the public Overpass instance
    const dLat = radiusMeters / 111320;
    const dLon = radiusMeters / (111320 * Math.cos((latitude * Math.PI) / 180));
    const bbox = [latitude - dLat, longitude - dLon, latitude + dLat, longitude + dLon]
      .map((n) => n.toFixed(5))
      .join(",");
    const query = `
[out:json][timeout:20][bbox:${bbox}];
(
${filters.map((f) => `  ${f}["name"];`).join("\n")}
);
out center ${limit * 3};
`;
    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        // Overpass rejects Node's default UA with 406 - a descriptive UA is required
        "User-Agent": "trave-agent/0.1 (travel planner CLI)",
      },
      body: `data=${encodeURIComponent(query)}`,
    });
    if (!res.ok) {
      return { error: `Overpass request failed with status ${res.status}` };
    }
    const data = (await res.json()) as { elements?: OverpassElement[] };
    if (!data.elements?.length) {
      return { results: [], note: `No ${category} POIs found within ${radiusMeters}m` };
    }

    // Dedupe by name, prefer elements with richer tags (wikipedia tag ≈ notability)
    const seen = new Set<string>();
    const results = data.elements
      .filter((e) => e.tags?.name)
      .sort((a, b) => {
        const score = (e: OverpassElement) =>
          (e.tags?.wikipedia ? 2 : 0) + (e.tags?.wikidata ? 1 : 0);
        return score(b) - score(a);
      })
      .filter((e) => {
        const name = e.tags!.name;
        if (seen.has(name)) return false;
        seen.add(name);
        return true;
      })
      .slice(0, limit)
      .map((e) => ({
        name: e.tags!.name,
        kind:
          e.tags!.historic ??
          e.tags!.tourism ??
          e.tags!.amenity ??
          e.tags!.leisure ??
          e.tags!.natural ??
          category,
        cuisine: e.tags!.cuisine,
        latitude: e.lat ?? e.center?.lat,
        longitude: e.lon ?? e.center?.lon,
        website: e.tags!.website,
      }));

    return { category, results };
  },
});
