import { tool } from "ai";
import { z } from "zod";

// WMO weather interpretation codes used by Open-Meteo
const WEATHER_CODES: Record<number, string> = {
  0: "clear sky",
  1: "mainly clear",
  2: "partly cloudy",
  3: "overcast",
  45: "fog",
  48: "depositing rime fog",
  51: "light drizzle",
  53: "moderate drizzle",
  55: "dense drizzle",
  61: "slight rain",
  63: "moderate rain",
  65: "heavy rain",
  71: "slight snow",
  73: "moderate snow",
  75: "heavy snow",
  80: "slight rain showers",
  81: "moderate rain showers",
  82: "violent rain showers",
  95: "thunderstorm",
  96: "thunderstorm with slight hail",
  99: "thunderstorm with heavy hail",
};

export const weather = tool({
  description:
    "Get a daily weather forecast (up to 16 days ahead) for coordinates. For trips further out, returns typical climate via the same endpoint's best-effort forecast. Use after geocoding the destination.",
  inputSchema: z.object({
    latitude: z.number(),
    longitude: z.number(),
    days: z
      .number()
      .int()
      .min(1)
      .max(16)
      .default(7)
      .describe("Number of forecast days from today"),
  }),
  execute: async ({ latitude, longitude, days }) => {
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", String(latitude));
    url.searchParams.set("longitude", String(longitude));
    url.searchParams.set(
      "daily",
      "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max"
    );
    url.searchParams.set("forecast_days", String(days));
    url.searchParams.set("timezone", "auto");

    const res = await fetch(url);
    if (!res.ok) {
      return { error: `Weather request failed with status ${res.status}` };
    }
    const data = (await res.json()) as {
      daily?: {
        time: string[];
        weather_code: number[];
        temperature_2m_max: number[];
        temperature_2m_min: number[];
        precipitation_probability_max: (number | null)[];
      };
    };
    if (!data.daily) {
      return { error: "No forecast data returned" };
    }
    const d = data.daily;
    return {
      forecast: d.time.map((date, i) => ({
        date,
        conditions: WEATHER_CODES[d.weather_code[i]] ?? `code ${d.weather_code[i]}`,
        highC: d.temperature_2m_max[i],
        lowC: d.temperature_2m_min[i],
        rainChancePct: d.precipitation_probability_max[i],
      })),
    };
  },
});
