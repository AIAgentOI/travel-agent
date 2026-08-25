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

/**
 * The highest-value judge here. The agent is told to build itineraries out of
 * tool results; a plausible-sounding restaurant that Overpass never returned is
 * exactly the failure a structural scorer cannot see.
 */
export const groundedInToolResults = reportFailures(LLMClassifierFromTemplate<{ itinerary: string; places: string }>({
  name: "grounded_in_tool_results",
  model: JUDGE_MODEL,
  useCoT: true,
  promptTemplate: `A travel agent was given this list of places from a points-of-interest lookup, and told to build the itinerary out of them:

<available_places>
{{{places}}}
</available_places>

Here is the itinerary it wrote:

<itinerary>
{{{itinerary}}}
</itinerary>

Consider only *specific named venues* - restaurants, museums, landmarks, parks, bars. Ignore generic references ("your hotel", "the old town", "a local cafe"), neighbourhoods, transport (metro, tram 28), and the destination city itself.

Which best describes the named venues in the itinerary?
A: Every named venue appears in the available places list.
B: All but one named venue appears in the list; the exception is a well-known public site rather than a specific business.
C: Two or more named venues do not appear in the list.`,
  choiceScores: { A: 1, B: 0.5, C: 0 },
}));

/** The four-part output contract from the system prompt, graded as a whole. */
export const followsItineraryFormat = reportFailures(LLMClassifierFromTemplate<{ itinerary: string }>({
  name: "follows_itinerary_format",
  model: JUDGE_MODEL,
  useCoT: true,
  promptTemplate: `A travel planning agent is required to produce markdown with all four of these parts:
1. A one-line trip summary stating its assumptions.
2. A day-by-day plan, each day structured as morning / afternoon / evening, with named places, plus a weather note per day.
3. A budget table with per-day costs by category and a trip total.
4. Two or three practical tips (packing, local transport, timing).

Here is what it produced:

<itinerary>
{{{itinerary}}}
</itinerary>

How many of the four parts are present and substantive?
A: All four.
B: Three of the four.
C: Two of the four.
D: Fewer than two.`,
  choiceScores: { A: 1, B: 0.67, C: 0.33, D: 0 },
}));

/**
 * Pace resists a regex: the prompt mandates a morning/afternoon/evening
 * skeleton for both paces, so the difference shows up in how much is packed
 * into each slot rather than in the structure. Counting bullets or place-name
 * mentions measures the fixture list, not the plan - a judge reading the days
 * is the only honest version of this check.
 */
export const paceMatchesRequest = reportFailures(
  LLMClassifierFromTemplate<{ itinerary: string; pace: string; days: string }>({
    name: "pace_matches_request",
    model: JUDGE_MODEL,
    useCoT: true,
    promptTemplate: `A traveler asked for a **{{pace}}** pace over {{days}} days. The planner's own rule is: relaxed means about 2 major activities per day, packed means 4 or more.

<itinerary>
{{{itinerary}}}
</itinerary>

Count only major activities - named venues, sights, or substantial outings. Ignore meals taken for their own sake, transit, check-in, and downtime.

How well does the plan's density match the requested {{pace}} pace?
A: Every day, or all but one, sits at the right density.
B: Roughly half the days sit at the right density.
C: The plan is consistently at the wrong density for the requested pace.`,
    choiceScores: { A: 1, B: 0.5, C: 0 },
  }),
);
