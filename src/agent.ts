import { openai } from "@ai-sdk/openai";
import { streamText, stepCountIs, type ModelMessage } from "ai";
import { SYSTEM_PROMPT } from "./prompts.js";
import { travelTools } from "./tools/index.js";

export function runAgent(messages: ModelMessage[]) {
  return streamText({
    model: openai("gpt-5-mini"),
    system: SYSTEM_PROMPT,
    messages,
    tools: travelTools,
    stopWhen: stepCountIs(10),
  });
}
