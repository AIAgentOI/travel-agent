import {
  init,
  LLMClassifierFromTemplate,
  type InitOptions,
  type Score,
  type Scorer,
  type ScorerArgs,
} from "autoevals";
import OpenAI from "openai";

/**
 * Judge model. Kept separate from the agent model on purpose - grading with
 * the same checkpoint you are grading tends to flatter it.
 */
export const JUDGE_MODEL = process.env.EVAL_JUDGE_MODEL ?? "gpt-4o";

// autoevals defaults to the Braintrust AI proxy but sends OPENAI_API_KEY as the
// bearer token, which the proxy rejects with a 401 - and a scorer that throws is
// dropped from the summary rather than reported, so the suite looks like it
// passed with one fewer metric. Point the judges straight at OpenAI instead.
// Set EVAL_USE_BRAINTRUST_PROXY=1 to route through the proxy (for its caching and
// cost tracking) once an OpenAI provider is configured in the Braintrust org.
const useProxy = process.env.EVAL_USE_BRAINTRUST_PROXY === "1";
const judgeClient = new OpenAI(
  useProxy
    ? { apiKey: process.env.BRAINTRUST_API_KEY, baseURL: "https://api.braintrust.dev/v1/proxy" }
    : { apiKey: process.env.OPENAI_API_KEY },
);
init({
  // autoevals ships CommonJS type declarations, so its `OpenAI` and the one this
  // ESM module imports resolve to two nominally distinct copies of the same class.
  client: judgeClient as unknown as NonNullable<InitOptions["client"]>,
  defaultModel: JUDGE_MODEL,
});

/**
 * Braintrust silently omits a scorer that throws. Judges depend on a second
 * network call, so surface the failure instead of quietly losing the metric.
 */
function reportFailures<Args>(
  scorer: Scorer<string, Args>,
): (args: ScorerArgs<string, Args>) => Promise<Score> {
  return async (args) => {
    try {
      return await scorer(args);
    } catch (err) {
      const name = (scorer as { name?: string }).name ?? "judge";
      console.error(`[evals] judge "${name}" failed:`, err instanceof Error ? err.message : err);
      return { name, score: null, metadata: { judgeError: String(err) } };
    }
  };
}

/** For the conversation-title model call, which has no expected string to match. */
export const titleIsDescriptive = reportFailures(LLMClassifierFromTemplate<{ message: string; title: string }>({
  name: "title_is_descriptive",
  model: JUDGE_MODEL,
  useCoT: true,
  promptTemplate: `A trip-planning chat is titled automatically from the traveler's first message. A good title names the destination and hints at the kind of trip, in a few words, the way a chat sidebar entry should read.

<first_message>
{{{message}}}
</first_message>

<title>
{{{title}}}
</title>

Which best describes the title?
A: Names the destination and conveys the kind of trip.
B: Names the destination but is otherwise generic.
C: Does not identify the destination, or misidentifies it.`,
  choiceScores: { A: 1, B: 0.6, C: 0 },
}));
