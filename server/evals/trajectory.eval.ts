import { Eval } from "braintrust";
import { TRAJECTORY_CASES } from "./datasets/trajectory.js";
import { runAgentCase, usingLiveTools } from "./lib/harness.js";
import { PROJECT } from "./project.js";
import { degradesGracefully, respectsKnownProfile } from "./scorers/judges.js";
import {
  attractionCoverage,
  budgetArgsCorrect,
  expectedToolsCalled,
  geocodeFirst,
  noForbiddenTools,
  noRepeatedToolCalls,
  profileWriteCorrect,
} from "./scorers/trajectory.js";

// Grades what the agent *does* rather than what it writes: which tools it
// reaches for, in what order, with which arguments. Runs against pinned tool
// fixtures so a slow Overpass day cannot look like a prompt regression.
Eval(PROJECT, {
  experimentName: "tool-trajectory",
  description: "Tool selection, argument slot-filling, and memory writes.",
  metadata: { toolMode: usingLiveTools() ? "live" : "fixtures" },
  data: () =>
    TRAJECTORY_CASES.map((c) => ({
      input: c.input,
      expected: c.expected,
      metadata: { case: c.name, probes: c.probes },
    })),
  task: (input) => runAgentCase(input),
  scores: [
    geocodeFirst,
    expectedToolsCalled,
    noForbiddenTools,
    attractionCoverage,
    budgetArgsCorrect,
    profileWriteCorrect,
    noRepeatedToolCalls,
    ({ input, output }) => {
      if (!input.profile) {
        return { name: "respects_known_profile", score: null, metadata: { skipped: "case has no stored profile" } };
      }
      // A plain fact list, not the prompt fragment - the prompt's trailing
      // "don't re-ask for this" line reads to a judge like more known context.
      const knownFacts = Object.entries(input.profile)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
        .join("\n");
      return respectsKnownProfile({ output: output.text, profile: knownFacts, reply: output.text });
    },
    ({ input, output }) => {
      const failed = input.failing?.[0];
      if (!failed) {
        return { name: "degrades_gracefully", score: null, metadata: { skipped: "no tool was forced to fail" } };
      }
      return degradesGracefully({ output: output.text, reply: output.text, failedTool: failed });
    },
  ],
  maxConcurrency: 3,
});
