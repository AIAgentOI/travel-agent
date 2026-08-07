import { openai } from "@ai-sdk/openai";
import { streamText, generateText, stepCountIs, type ModelMessage } from "ai";
import { buildSystemPrompt } from "./prompts.js";
import { createTravelTools } from "./tools/index.js";

export function runAgent(messages: ModelMessage[], profileContext: string, userId: string) {
  return streamText({
    model: openai("gpt-5-mini"),
    system: buildSystemPrompt(profileContext),
    messages,
    tools: createTravelTools(userId),
    stopWhen: stepCountIs(10),
  });
}

export async function generateTitle(firstUserMessage: string): Promise<string> {
  const { text } = await generateText({
    model: openai("gpt-5-mini"),
    system:
      "Generate a short, descriptive title (3-6 words) for a trip-planning chat, based on the user's message. Focus on the destination and trip type. Reply with the title only - no quotes, no trailing punctuation, no markdown.",
    prompt: firstUserMessage,
  });
  return text.trim();
}
