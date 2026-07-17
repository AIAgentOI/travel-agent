import { openai } from "@ai-sdk/openai";
import { streamText, stepCountIs, type ModelMessage } from "ai";
import { buildSystemPrompt } from "./prompts.js";
import { travelTools } from "./tools/index.js";

export function runAgent(messages: ModelMessage[], profileContext: string) {
  return streamText({
    model: openai("gpt-5-mini"),
    system: buildSystemPrompt(profileContext),
    messages,
    tools: travelTools,
    stopWhen: stepCountIs(10),
  });
}
