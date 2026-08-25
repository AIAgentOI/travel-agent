import type { AgentCase } from "../lib/harness.js";
import type { ItineraryExpectation } from "../scorers/itinerary.js";

export interface ItineraryCase {
  name: string;
  probes: string;
  input: AgentCase;
  expected: ItineraryExpectation;
}

/**
 * Cases here are deliberately fully-specified: the agent has no excuse to ask a
 * clarifying question instead of producing the itinerary, so a missing plan is
 * a real failure rather than a reasonable conversational move.
 */
export const ITINERARY_CASES: ItineraryCase[] = [
  {
    name: "lisbon-5day-relaxed",
    probes: "the README's headline scenario",
    input: {
      messages:
        "Plan a 5-day trip to Lisbon in October. Mid-range budget, two of us, we love food and history, relaxed pace. Go ahead and write the full itinerary now.",
    },
    expected: { days: 5, pace: "relaxed" },
  },
  {
    name: "kyoto-3day-packed",
    probes: "short packed trip - pace should visibly change the plan density",
    input: {
      messages:
        "Solo backpacker, 3 days in Kyoto, packed pace, into history and nightlife. Write the full day-by-day itinerary now, no questions.",
    },
    expected: { days: 3, pace: "packed" },
  },
  {
    name: "porto-7day-from-memory",
    probes: "longer trip planned from remembered preferences",
    input: {
      messages: "We've got 7 days in Porto next month. Please write the whole itinerary now.",
      profile: { budgetStyle: "mid-range", interests: ["food", "museums"], pace: "relaxed", travelers: 2 },
    },
    expected: { days: 7, pace: "relaxed" },
  },
];
