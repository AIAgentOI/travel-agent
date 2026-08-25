import type { Score } from "autoevals";
import type { AgentRun } from "../lib/harness.js";

export interface ItineraryExpectation {
  /** How many days the itinerary should cover. */
  days: number;
  /** "relaxed" caps activities per day at 2-3; "packed" wants 4+. */
  pace?: "relaxed" | "packed";
}

type Args = { output: AgentRun; expected?: ItineraryExpectation };

const skip = (name: string, reason: string): Score => ({ name, score: null, metadata: { skipped: reason } });

/** Distinct day numbers the itinerary actually breaks out, from headings or bold labels. */
function parseDayNumbers(text: string): number[] {
  const days = new Set<number>();
  for (const match of text.matchAll(/(?:^#{1,6}\s*|^\s*\*\*|^\s*\|\s*)?\bday\s*(\d{1,2})\b/gim)) {
    days.add(Number(match[1]));
  }
  return [...days].sort((a, b) => a - b);
}

/**
 * The single most common failure for a long trip: the model summarises days
 * 6-10 as "repeat as above" instead of planning them.
 */
export function coversEveryDay({ output, expected }: Args): Score {
  const name = "covers_every_day";
  if (!expected?.days) return skip(name, "case does not state a day count");
  const found = parseDayNumbers(output.text);
  const missing = Array.from({ length: expected.days }, (_, i) => i + 1).filter((d) => !found.includes(d));
  return {
    name,
    score: (expected.days - missing.length) / expected.days,
    metadata: { expectedDays: expected.days, missing, found },
  };
}

/** Format spec item 3: a per-category budget table with a trip total. */
export function hasBudgetTable({ output }: Args): Score {
  const rows = output.text.split("\n").filter((l) => l.trim().startsWith("|"));
  const table = rows.join("\n").toLowerCase();
  const hasTotal = /\btotal\b/.test(table);
  const categories = ["lodging", "food", "transport", "activities"].filter((c) => table.includes(c));
  const score = rows.length >= 3 ? (hasTotal ? 0.5 : 0) + 0.5 * (categories.length / 4) : 0;
  return { name: "has_budget_table", score, metadata: { tableRows: rows.length, hasTotal, categories } };
}

/** The budget tool's note says flights are excluded; the prompt says to repeat it. */
export function statesFlightsExcluded({ output }: Args): Score {
  const sentences = output.text.split(/(?<=[.!?])\s+|\n/);
  const stated = sentences.some(
    (s) => /flight/i.test(s) && /(not included|excluded|exclude[sd]?|does ?n[o']t include|do not include)/i.test(s),
  );
  return { name: "states_flights_excluded", score: stated ? 1 : 0 };
}

/**
 * Grounding check with no judge required: the trip total the agent printed has
 * to be the number the budget tool actually returned.
 */
export function budgetTotalMatchesTool({ output }: Args): Score {
  const name = "budget_total_matches_tool";
  const budgetOut = output.toolOutputs.find((r) => r.toolName === "budget")?.output as
    | { tripTotal?: number; perDayTotal?: number }
    | undefined;
  if (!budgetOut?.tripTotal) return skip(name, "budget tool returned no total");

  const digits = output.text.replace(/[,\s](?=\d{3}\b)/g, "");
  const present = (n: number) => new RegExp(`\\b${n}\\b`).test(digits);
  const tripOk = present(budgetOut.tripTotal);
  const perDayOk = budgetOut.perDayTotal ? present(budgetOut.perDayTotal) : true;
  return {
    name,
    score: tripOk ? (perDayOk ? 1 : 0.75) : 0,
    metadata: { tripTotal: budgetOut.tripTotal, perDayTotal: budgetOut.perDayTotal, tripOk, perDayOk },
  };
}

/** Every place name the attractions tool returned, flattened. */
export function toolPlaceNames(output: AgentRun): string[] {
  const names: string[] = [];
  for (const result of output.toolOutputs) {
    if (result.toolName !== "attractions") continue;
    const payload = result.output as { results?: { name?: string }[] } | undefined;
    for (const poi of payload?.results ?? []) if (poi.name) names.push(poi.name);
  }
  return [...new Set(names)];
}

/**
 * The prompt says to build days out of named places from the attractions
 * results. At minimum, each day should get one.
 */
export function usesToolPlaces({ output, expected }: Args): Score {
  const name = "uses_tool_places";
  const available = toolPlaceNames(output);
  if (!available.length) return skip(name, "attractions returned no places");
  const lower = output.text.toLowerCase();
  const used = available.filter((n) => lower.includes(n.toLowerCase()));
  const target = expected?.days ?? 1;
  return {
    name,
    score: Math.min(1, used.length / target),
    metadata: { used: used.length, available: available.length, target },
  };
}
