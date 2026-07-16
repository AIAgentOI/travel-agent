import "dotenv/config";
import readline from "node:readline/promises";
import type { ModelMessage } from "ai";
import { runAgent } from "./agent.js";

if (!process.env.OPENAI_API_KEY) {
  console.error("Missing OPENAI_API_KEY. Add it to your .env file.");
  process.exit(1);
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const history: ModelMessage[] = [];

console.log("✈️  AI Travel Planner — tell me about the trip you have in mind.");
console.log("   (type 'exit' to quit)\n");

while (true) {
  const input = (await rl.question("you> ")).trim();
  if (!input) continue;
  if (input.toLowerCase() === "exit") break;

  history.push({ role: "user", content: input });

  const result = runAgent(history);

  process.stdout.write("\nplanner> ");
  for await (const part of result.fullStream) {
    switch (part.type) {
      case "text-delta":
        process.stdout.write(part.text);
        break;
      case "tool-call":
        process.stdout.write(`\n  [tool: ${part.toolName}(${JSON.stringify(part.input)})]\n`);
        break;
      case "error":
        console.error(`\n  [error: ${String(part.error)}]`);
        break;
    }
  }
  process.stdout.write("\n\n");

  // Append assistant + tool messages so follow-up turns have full context
  const response = await result.response;
  history.push(...response.messages);
}

rl.close();
console.log("Safe travels! 👋");
