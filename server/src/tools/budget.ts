import { tool } from "ai";
import { z } from "zod";

type Tier = "budget" | "moderate" | "expensive" | "very-expensive";

// Per-day base rates in USD for a mid-range traveler, by cost tier
const TIER_RATES: Record<Tier, { lodging: number; food: number; transport: number; activities: number }> = {
  budget: { lodging: 35, food: 20, transport: 6, activities: 12 },
  moderate: { lodging: 70, food: 40, transport: 12, activities: 25 },
  expensive: { lodging: 140, food: 70, transport: 20, activities: 40 },
  "very-expensive": { lodging: 220, food: 100, transport: 30, activities: 55 },
};

const STYLE_MULTIPLIER = {
  backpacker: 0.6,
  "mid-range": 1.0,
  luxury: 2.5,
} as const;

// Known destinations → tier. City match first, then country fallback; unknown → moderate.
const CITY_TIERS: Record<string, Tier> = {
  hanoi: "budget", bangkok: "budget", "chiang mai": "budget", delhi: "budget",
  mumbai: "budget", kathmandu: "budget", "mexico city": "budget", medellin: "budget",
  "buenos aires": "budget", cairo: "budget", marrakech: "budget", istanbul: "budget",
  "ho chi minh city": "budget", bali: "budget", denpasar: "budget", tbilisi: "budget",
  lisbon: "moderate", porto: "moderate", madrid: "moderate", barcelona: "moderate",
  seville: "moderate", athens: "moderate", prague: "moderate", budapest: "moderate",
  krakow: "moderate", warsaw: "moderate", berlin: "moderate", osaka: "moderate",
  seoul: "moderate", taipei: "moderate", "kuala lumpur": "moderate", montevideo: "moderate",
  santiago: "moderate", "cape town": "moderate", valencia: "moderate", naples: "moderate",
  paris: "expensive", london: "expensive", rome: "expensive", amsterdam: "expensive",
  vienna: "expensive", dublin: "expensive", tokyo: "expensive", kyoto: "expensive",
  "hong kong": "expensive", "tel aviv": "expensive", dubai: "expensive", milan: "expensive",
  munich: "expensive", stockholm: "expensive", helsinki: "expensive", "los angeles": "expensive",
  chicago: "expensive", miami: "expensive", toronto: "expensive", vancouver: "expensive",
  sydney: "expensive", melbourne: "expensive", auckland: "expensive", edinburgh: "expensive",
  zurich: "very-expensive", geneva: "very-expensive", oslo: "very-expensive",
  copenhagen: "very-expensive", reykjavik: "very-expensive", "new york": "very-expensive",
  "san francisco": "very-expensive", singapore: "very-expensive", monaco: "very-expensive",
};

const COUNTRY_TIERS: Record<string, Tier> = {
  vietnam: "budget", thailand: "budget", india: "budget", nepal: "budget",
  indonesia: "budget", mexico: "budget", colombia: "budget", egypt: "budget",
  morocco: "budget", turkey: "budget", georgia: "budget", cambodia: "budget",
  portugal: "moderate", spain: "moderate", greece: "moderate", poland: "moderate",
  hungary: "moderate", "czech republic": "moderate", czechia: "moderate",
  "south korea": "moderate", taiwan: "moderate", malaysia: "moderate",
  chile: "moderate", argentina: "moderate", "south africa": "moderate",
  france: "expensive", "united kingdom": "expensive", italy: "expensive",
  germany: "expensive", netherlands: "expensive", austria: "expensive",
  ireland: "expensive", japan: "expensive", israel: "expensive",
  "united arab emirates": "expensive", canada: "expensive", australia: "expensive",
  "new zealand": "expensive", "united states": "expensive", sweden: "expensive",
  finland: "expensive",
  switzerland: "very-expensive", norway: "very-expensive", denmark: "very-expensive",
  iceland: "very-expensive", singapore: "very-expensive", monaco: "very-expensive",
};

function resolveTier(destination: string, country?: string): { tier: Tier; source: string } {
  const d = destination.trim().toLowerCase();
  if (CITY_TIERS[d]) return { tier: CITY_TIERS[d], source: `city match: ${destination}` };
  const c = country?.trim().toLowerCase();
  if (c && COUNTRY_TIERS[c]) return { tier: COUNTRY_TIERS[c], source: `country match: ${country}` };
  return { tier: "moderate", source: "default (destination not in dataset)" };
}

export const budget = tool({
  description:
    "Estimate a trip's ground costs (lodging, food, local transport, activities) in USD using cost-of-living tiers. Does NOT include flights - state that to the user. Call once the destination, trip length, and travel style are known.",
  inputSchema: z.object({
    destination: z.string().describe("City name"),
    country: z.string().optional().describe("Country, improves tier matching for lesser-known cities"),
    days: z.number().int().min(1).max(60),
    travelers: z.number().int().min(1).max(12).default(1),
    style: z.enum(["backpacker", "mid-range", "luxury"]).default("mid-range"),
  }),
  execute: async ({ destination, country, days, travelers, style }) => {
    const { tier, source } = resolveTier(destination, country);
    const rates = TIER_RATES[tier];
    const mult = STYLE_MULTIPLIER[style];

    // Lodging is roughly shareable; assume 2 people per room
    const rooms = Math.ceil(travelers / 2);
    const perDay = {
      lodging: Math.round(rates.lodging * mult * rooms),
      food: Math.round(rates.food * mult * travelers),
      transport: Math.round(rates.transport * mult * travelers),
      activities: Math.round(rates.activities * mult * travelers),
    };
    const perDayTotal = Object.values(perDay).reduce((a, b) => a + b, 0);

    return {
      destination,
      costTier: tier,
      tierSource: source,
      style,
      travelers,
      days,
      currency: "USD",
      perDay,
      perDayTotal,
      tripTotal: perDayTotal * days,
      note: "Estimate covers ground costs only - flights not included. Based on cost-of-living tiers, not live prices.",
    };
  },
});
