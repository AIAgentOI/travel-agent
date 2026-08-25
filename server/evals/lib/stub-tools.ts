import { createTravelTools, type TravelTools } from "../../src/tools/index.js";
import type { SaveProfile } from "../../src/tools/profile.js";
import { findCityByCoords, findCityByName, fixtureDate } from "./fixtures.js";

export interface StubToolOptions {
  /** Tool names that should return an error result, to exercise degradation. */
  failing?: string[];
}

/**
 * The production tool set with only the three network-backed `execute`
 * functions swapped out. Descriptions and input schemas are reused verbatim,
 * so the model sees exactly the tool surface it sees in production - only the
 * responses are pinned.
 */
export function createStubTools(saveProfile: SaveProfile, options: StubToolOptions = {}): TravelTools {
  const real = createTravelTools(saveProfile);
  const failing = new Set(options.failing ?? []);

  const geocode = withExecute(real.geocode, async ({ place }: { place: string }) => {
    if (failing.has("geocode")) return { error: "Geocoding request failed with status 503" };
    const city = findCityByName(place);
    if (!city) return { error: `No location found for "${place}"` };
    return {
      matches: [
        {
          name: city.name,
          region: city.region,
          country: city.country,
          latitude: city.latitude,
          longitude: city.longitude,
          timezone: city.timezone,
        },
      ],
    };
  });

  const weather = withExecute(
    real.weather,
    async ({ latitude, longitude, days }: { latitude: number; longitude: number; days: number }) => {
      if (failing.has("weather")) return { error: "Weather request failed with status 503" };
      const city = findCityByCoords(latitude, longitude);
      if (!city) return { error: "No forecast data returned" };
      return {
        forecast: Array.from({ length: Math.min(days, 16) }, (_, i) => ({
          date: fixtureDate(i),
          conditions: city.conditions[i % city.conditions.length],
          highC: city.highs[i % city.highs.length],
          lowC: city.lows[i % city.lows.length],
          rainChancePct: city.conditions[i % city.conditions.length].includes("rain") ? 60 : 10,
        })),
      };
    },
  );

  const attractions = withExecute(
    real.attractions,
    async (args: { latitude: number; longitude: number; category: string; radiusMeters: number; limit: number }) => {
      const { latitude, longitude, category, radiusMeters, limit } = args;
      if (failing.has("attractions")) return { error: "Overpass request failed with status 504" };
      const city = findCityByCoords(latitude, longitude);
      if (!city) return { results: [], note: `No ${category} POIs found within ${radiusMeters}m` };
      const names = city.pois[category] ?? [];
      if (!names.length) return { results: [], note: `No ${category} POIs found within ${radiusMeters}m` };
      return {
        category,
        results: names.slice(0, limit).map((name, i) => ({
          name,
          kind: category,
          // Scattered deterministically around the centre so the model has
          // something to group geographically.
          latitude: round5(city.latitude + (i % 3) * 0.006 - 0.006),
          longitude: round5(city.longitude + Math.floor(i / 3) * 0.008 - 0.008),
        })),
      };
    },
  );

  // `budget` is a pure local calculator with no network call, so the real one runs.
  return { ...real, geocode, weather, attractions };
}

/** Keeps a tool's description and input schema, replaces only its execute. */
function withExecute<T>(realTool: T, execute: (input: never) => Promise<unknown>): T {
  return { ...realTool, execute } as T;
}

function round5(n: number): number {
  return Math.round(n * 1e5) / 1e5;
}
