import type { ModelMessage } from "ai";
import { runAgent } from "../../src/agent.js";
import { formatProfileContext } from "../../src/prompts.js";
import { createTravelTools } from "../../src/tools/index.js";
import type { SaveProfile } from "../../src/tools/profile.js";
import type { TravelerProfile } from "../../src/profile.js";
import { createStubTools } from "./stub-tools.js";

/**
 * Set EVAL_LIVE_TOOLS=1 to run the evals against the real Open-Meteo and
 * Overpass endpoints instead of the fixtures. Slower, rate-limited, and the
 * weather answers change daily - useful as an integration smoke test, not as
 * the default for scored runs.
 */
export function usingLiveTools(): boolean {
  return process.env.EVAL_LIVE_TOOLS === "1";
}

export interface AgentCase {
  /** Conversation so far. A bare string is shorthand for one user turn. */
  messages: string | ModelMessage[];
  /** Profile the agent should already know about, as if from a past session. */
  profile?: TravelerProfile | null;
  /** Tool names forced to return an error, to exercise graceful degradation. */
  failing?: string[];
}

export interface ToolCallRecord {
  toolName: string;
  input: Record<string, unknown>;
}

export interface AgentRun {
  /** The assistant's final reply. */
  text: string;
  toolCalls: ToolCallRecord[];
  /** Tool outputs, in call order - what the reply is supposed to be grounded in. */
  toolOutputs: { toolName: string; output: unknown }[];
  /** Partial updates the agent pushed through updateProfile. */
  profileWrites: TravelerProfile[];
  stepCount: number;
  usedLiveTools: boolean;
}

export async function runAgentCase(testCase: AgentCase): Promise<AgentRun> {
  const profileWrites: TravelerProfile[] = [];
  let current: TravelerProfile = { ...(testCase.profile ?? {}) };
  const saveProfile: SaveProfile = async (partial) => {
    profileWrites.push(partial);
    // Mirror the Postgres upsert: partial fields merge onto what's known.
    current = { ...current, ...dropUndefined(partial) };
    return current;
  };

  const tools = usingLiveTools()
    ? createTravelTools(saveProfile)
    : createStubTools(saveProfile, { failing: testCase.failing });

  const result = runAgent(toModelMessages(testCase.messages), formatProfileContext(testCase.profile ?? null), tools);
  await result.consumeStream();

  const [text, toolCalls, toolResults, steps] = await Promise.all([
    result.text,
    result.toolCalls,
    result.toolResults,
    result.steps,
  ]);

  return {
    text,
    toolCalls: toolCalls.map((c) => ({ toolName: c.toolName, input: (c.input ?? {}) as Record<string, unknown> })),
    toolOutputs: toolResults.map((r) => ({ toolName: r.toolName, output: r.output })),
    profileWrites,
    stepCount: steps.length,
    usedLiveTools: usingLiveTools(),
  };
}

export function toModelMessages(messages: string | ModelMessage[]): ModelMessage[] {
  return typeof messages === "string" ? [{ role: "user", content: messages }] : messages;
}

/** The last user turn, for scorers that need to know what was actually asked. */
export function lastUserMessage(messages: string | ModelMessage[]): string {
  const list = toModelMessages(messages);
  for (let i = list.length - 1; i >= 0; i--) {
    const m = list[i];
    if (m.role === "user") return typeof m.content === "string" ? m.content : JSON.stringify(m.content);
  }
  return "";
}

function dropUndefined<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>;
}
