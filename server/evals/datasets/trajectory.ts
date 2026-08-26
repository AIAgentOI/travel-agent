import type { ModelMessage } from "ai";
import type { AgentCase } from "../lib/harness.js";
import type { TrajectoryExpectation } from "../scorers/trajectory.js";

export interface TrajectoryCase {
  name: string;
  /** What this case is actually testing, shown as experiment metadata. */
  probes: string;
  input: AgentCase;
  expected: TrajectoryExpectation;
}

const turn = (role: "user" | "assistant", content: string): ModelMessage => ({ role, content }) as ModelMessage;

export const TRAJECTORY_CASES: TrajectoryCase[] = [
  {
    name: "complete-brief",
    probes: "every slot supplied in one turn - the happy path",
    input: {
      messages:
        "Plan a 5-day trip to Lisbon in October. Mid-range budget, two of us, we're into food and history, and we'd like a relaxed pace.",
    },
    expected: {
      tools: ["geocode", "weather", "attractions", "budget", "updateProfile"],
      attractionCategories: ["food", "history"],
      budgetArgs: { destination: "Lisbon", days: 5, travelers: 2, style: "mid-range" },
      profileWrite: { budgetStyle: "mid-range", interests: ["food", "history"], pace: "relaxed", travelers: 2 },
    },
  },
  {
    name: "underspecified-destination",
    probes: "no trip length or style yet - must ask, not guess a budget",
    input: { messages: "I'm thinking of going to Japan at some point. What do you reckon?" },
    expected: {
      forbiddenTools: ["budget"],
      profileWrite: null,
    },
  },
  {
    name: "profile-fills-the-gaps",
    probes: "known preferences should be used silently instead of re-asked",
    input: {
      messages: "We've got 7 days in Porto next month - can you put something together?",
      profile: { budgetStyle: "mid-range", interests: ["food", "museums"], pace: "relaxed", travelers: 2 },
    },
    expected: {
      tools: ["geocode", "weather", "attractions", "budget"],
      attractionCategories: ["food", "museums"],
      budgetArgs: { destination: "Porto", days: 7, travelers: 2, style: "mid-range" },
      profileWrite: null,
    },
  },
  {
    name: "preference-change",
    probes:
      "a stated change of style must be written to memory, not just held in context - deliberately does not require the rest of the pipeline, since interests and pace are still missing and asking for them is legitimate",
    input: {
      messages: [
        turn("user", "Thinking about Kyoto for 4 days."),
        turn(
          "assistant",
          "Kyoto for 4 days sounds great. I have you down as mid-range for two - shall I plan around that?",
        ),
        turn("user", "Actually, for this one we're going all out - make it luxury. Still just the two of us."),
      ],
      profile: { budgetStyle: "mid-range", travelers: 2 },
    },
    expected: {
      tools: ["updateProfile"],
      profileWrite: { budgetStyle: "luxury" },
    },
  },
  {
    name: "narrow-question",
    probes: "a one-line factual question should not trigger the full planning pipeline",
    input: { messages: "What's the weather looking like in Rome at the moment?" },
    expected: {
      tools: ["geocode", "weather"],
      forbiddenTools: ["budget", "attractions", "updateProfile"],
      profileWrite: null,
    },
  },
  {
    name: "attractions-lookup-fails",
    probes: "graceful degradation when the POI lookup is down",
    input: {
      messages:
        "3 days in Kyoto starting next Monday - backpacker budget, solo, packed pace, mostly history. Build the itinerary now, don't ask me anything else.",
      failing: ["attractions"],
    },
    expected: {
      tools: ["geocode", "weather", "attractions", "budget"],
      budgetArgs: { destination: "Kyoto", days: 3, travelers: 1, style: "backpacker" },
    },
  },
  {
    name: "solo-packed-trip",
    probes: "single-traveler slot filling and a non-default pace",
    input: {
      messages:
        "Solo trip, 3 days in Kyoto, backpacker budget - I want to cram in as much history and nightlife as I can.",
    },
    expected: {
      tools: ["geocode", "weather", "attractions", "budget", "updateProfile"],
      attractionCategories: ["history", "nightlife"],
      budgetArgs: { destination: "Kyoto", days: 3, travelers: 1, style: "backpacker" },
      profileWrite: { budgetStyle: "backpacker", pace: "packed", travelers: 1 },
    },
  },
];
