import { Eval } from "braintrust";
import { generateTitle } from "../src/agent.js";
import { TITLE_CASES } from "./datasets/titles.js";
import { PROJECT } from "./project.js";
import { titleIsDescriptive } from "./scorers/judges.js";
import { mentionsDestination, titleFormat } from "./scorers/title.js";

// Cheapest suite in the set - one model call per case, no tools. Good smoke
// test that credentials and the Braintrust wiring work before spending money
// on the agent suites.
Eval(PROJECT, {
  experimentName: "conversation-titles",
  description: "Sidebar titles generated from a traveler's first message.",
  data: () =>
    TITLE_CASES.map((c) => ({
      input: c.message,
      expected: c.destination,
      metadata: { case: c.name },
    })),
  task: (message) => generateTitle(message),
  scores: [
    titleFormat,
    mentionsDestination,
    ({ input, output }) => titleIsDescriptive({ output, message: input, title: output }),
  ],
  maxConcurrency: 4,
});
