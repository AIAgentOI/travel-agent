import type { Score } from "autoevals";
import type { AgentRun } from "../lib/harness.js";
import type { TravelerProfile } from "../../src/profile.js";

/**
 * What a trajectory case expects the agent to *do*, independent of what it
 * writes. Every field is optional - a case only asserts what it cares about,
 * and scorers return `null` (skipped) for the fields it leaves out.
 */
export interface TrajectoryExpectation {
  /** Tools that must each be called at least once. */
  tools?: string[];
  /** Tools that must not be called at all. */
  forbiddenTools?: string[];
  /** Interest categories the `attractions` tool should cover. */
  attractionCategories?: string[];
  /** Expected subset of the `budget` tool's input. */
  budgetArgs?: { destination?: string; days?: number; travelers?: number; style?: string };
  /** Expected merged result of the agent's updateProfile writes, or null for "must not write". */
  profileWrite?: TravelerProfile | null;
}

type Args = { output: AgentRun; expected?: TrajectoryExpectation };

const skip = (name: string, reason: string): Score => ({ name, score: null, metadata: { skipped: reason } });

/**
 * The system prompt says geocode comes first - everything downstream needs the
 * coordinates it returns.
 */
export function geocodeFirst({ output, expected }: Args): Score {
  const name = "geocode_first";
  if (!expected?.tools?.includes("geocode")) return skip(name, "case does not expect geocode");
  const first = output.toolCalls[0]?.toolName;
  return { name, score: first === "geocode" ? 1 : 0, metadata: { firstToolCall: first ?? null } };
}

/** Recall over the tools the case says are required. */
export function expectedToolsCalled({ output, expected }: Args): Score {
  const name = "expected_tools_called";
  const wanted = expected?.tools;
  if (!wanted?.length) return skip(name, "case lists no required tools");
  const called = new Set(output.toolCalls.map((c) => c.toolName));
  const missing = wanted.filter((t) => !called.has(t));
  return {
    name,
    score: (wanted.length - missing.length) / wanted.length,
    metadata: { missing, called: [...called] },
  };
}

/** Guards against over-eager tools - e.g. budgeting a trip of unknown length. */
export function noForbiddenTools({ output, expected }: Args): Score {
  const name = "no_forbidden_tools";
  const forbidden = expected?.forbiddenTools;
  if (!forbidden?.length) return skip(name, "case lists no forbidden tools");
  const called = new Set(output.toolCalls.map((c) => c.toolName));
  const violations = forbidden.filter((t) => called.has(t));
  return { name, score: violations.length === 0 ? 1 : 0, metadata: { violations } };
}

/** Did attractions get called for the interests the user actually stated? */
export function attractionCoverage({ output, expected }: Args): Score {
  const name = "attraction_coverage";
  const wanted = expected?.attractionCategories;
  if (!wanted?.length) return skip(name, "case lists no expected categories");
  const seen = new Set(
    output.toolCalls.filter((c) => c.toolName === "attractions").map((c) => String(c.input.category)),
  );
  const missing = wanted.filter((c) => !seen.has(c));
  return {
    name,
    score: (wanted.length - missing.length) / wanted.length,
    metadata: { missing, searched: [...seen] },
  };
}

/**
 * The budget tool is where slot-filling errors surface: a wrong `days` or a
 * defaulted `travelers` produces a confidently wrong number in the itinerary.
 */
export function budgetArgsCorrect({ output, expected }: Args): Score {
  const name = "budget_args_correct";
  const wanted = expected?.budgetArgs;
  if (!wanted) return skip(name, "case makes no claim about budget args");
  const call = output.toolCalls.find((c) => c.toolName === "budget");
  if (!call) return { name, score: 0, metadata: { reason: "budget was never called" } };

  const mismatches: Record<string, { expected: unknown; actual: unknown }> = {};
  let matched = 0;
  for (const [key, want] of Object.entries(wanted)) {
    const got = call.input[key];
    const ok = typeof want === "string" ? String(got).toLowerCase().includes(want.toLowerCase()) : got === want;
    if (ok) matched++;
    else mismatches[key] = { expected: want, actual: got ?? null };
  }
  return { name, score: matched / Object.keys(wanted).length, metadata: { mismatches, args: call.input } };
}

/**
 * Memory writes are the feature most likely to regress silently: too eager and
 * a one-off trip becomes a standing preference, too shy and nothing persists.
 */
export function profileWriteCorrect({ output, expected }: Args): Score {
  const name = "profile_write_correct";
  if (expected?.profileWrite === undefined) return skip(name, "case makes no claim about memory writes");

  if (expected.profileWrite === null) {
    return {
      name,
      score: output.profileWrites.length === 0 ? 1 : 0,
      metadata: { unexpectedWrites: output.profileWrites },
    };
  }
  if (output.profileWrites.length === 0) {
    return { name, score: 0, metadata: { reason: "updateProfile was never called" } };
  }

  const merged = Object.assign({}, ...output.profileWrites) as Record<string, unknown>;
  const wanted = expected.profileWrite as Record<string, unknown>;
  const mismatches: Record<string, { expected: unknown; actual: unknown }> = {};
  let matched = 0;
  for (const [key, want] of Object.entries(wanted)) {
    const got = merged[key];
    const ok = Array.isArray(want)
      ? Array.isArray(got) && want.every((w) => got.some((g) => String(g).toLowerCase().includes(String(w).toLowerCase())))
      : got === want;
    if (ok) matched++;
    else mismatches[key] = { expected: want, actual: got ?? null };
  }
  return { name, score: matched / Object.keys(wanted).length, metadata: { mismatches, merged } };
}

/**
 * Identical repeated calls burn a step from the 10-step budget and usually mean
 * the agent lost track of a result it already had.
 */
export function noRepeatedToolCalls({ output }: Args): Score {
  const name = "no_repeated_tool_calls";
  if (output.toolCalls.length === 0) return skip(name, "no tool calls");
  const seen = new Set<string>();
  const duplicates: string[] = [];
  for (const call of output.toolCalls) {
    const key = `${call.toolName}:${stableStringify(call.input)}`;
    if (seen.has(key)) duplicates.push(call.toolName);
    seen.add(key);
  }
  return {
    name,
    score: 1 - duplicates.length / output.toolCalls.length,
    metadata: { duplicates, totalCalls: output.toolCalls.length },
  };
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(",")}}`;
}
