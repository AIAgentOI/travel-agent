import { tool } from "ai";
import { z } from "zod";

interface GeocodingResult {
  name: string;
  country?: string;
  admin1?: string;
  latitude: number;
  longitude: number;
  timezone?: string;
  population?: number;
}

export const geocode = tool({
  description:
    "Resolve a city or place name to geographic coordinates. Always call this first to get lat/lon for the weather and attractions tools.",
  inputSchema: z.object({
    place: z.string().describe("City or place name, e.g. 'Lisbon' or 'Kyoto'"),
  }),
  execute: async ({ place }) => {
    const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
    url.searchParams.set("name", place);
    url.searchParams.set("count", "3");
    url.searchParams.set("language", "en");
    url.searchParams.set("format", "json");

    const res = await fetch(url);
    if (!res.ok) {
      return { error: `Geocoding request failed with status ${res.status}` };
    }
    const data = (await res.json()) as { results?: GeocodingResult[] };
    if (!data.results?.length) {
      return { error: `No location found for "${place}"` };
    }
    return {
      matches: data.results.map((r) => ({
        name: r.name,
        region: r.admin1,
        country: r.country,
        latitude: r.latitude,
        longitude: r.longitude,
        timezone: r.timezone,
      })),
    };
  },
});
