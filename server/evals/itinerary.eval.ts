import { Eval } from "braintrust";
import { ITINERARY_CASES } from "./datasets/itinerary.js";
import { runAgentCase, usingLiveTools } from "./lib/harness.js";
import { PROJECT } from "./project.js";
import { followsItineraryFormat, groundedInToolResults, paceMatchesRequest } from "./scorers/judges.js";
import {
  budgetTotalMatchesTool,
  coversEveryDay,
  hasBudgetTable,
  statesFlightsExcluded,
  toolPlaceNames,
  usesToolPlaces,
} from "./scorers/itinerary.js";

// Grades the artifact the user actually reads. Structure is checked
// deterministically; grounding and overall format compliance need a judge.
Eval(PROJECT, {
  experimentName: "itinerary-quality",
  description: "The final markdown itinerary: structure, grounding, and budget arithmetic.",
  metadata: { toolMode: usingLiveTools() ? "live" : "fixtures" },
  data: () =>
    ITINERARY_CASES.map((c) => ({
      input: c.input,
      expected: c.expected,
      metadata: { case: c.name, probes: c.probes },
    })),
  task: (input) => runAgentCase(input),
  scores: [
    coversEveryDay,
    hasBudgetTable,
    statesFlightsExcluded,
    budgetTotalMatchesTool,
    usesToolPlaces,
    ({ output }) =>
      groundedInToolResults({
        output: output.text,
        itinerary: output.text,
        places: toolPlaceNames(output).join("\n") || "(the lookup returned no places)",
      }),
    ({ output }) => followsItineraryFormat({ output: output.text, itinerary: output.text }),
    ({ output, expected }) => {
      if (!expected.pace) {
        return { name: "pace_matches_request", score: null, metadata: { skipped: "case states no pace" } };
      }
      return paceMatchesRequest({
        output: output.text,
        itinerary: output.text,
        pace: expected.pace,
        days: String(expected.days),
      });
    },
  ],
  maxConcurrency: 3,
});
