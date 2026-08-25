import { tool } from "ai";
import { z } from "zod";
import type { TravelerProfile } from "../profile.js";

// Injected rather than imported so the agent can be driven without a database
// (evals pass an in-memory recorder; the server passes the Postgres upsert).
export type SaveProfile = (partial: TravelerProfile) => Promise<TravelerProfile>;

export function createUpdateProfileTool(save: SaveProfile) {
  return tool({
    description:
      "Save or update the user's persistent traveler profile (budget style, interests, pace, travelers) so future sessions remember it. Call when the user states or confirms a new or changed preference. Only pass the fields that changed.",
    inputSchema: z.object({
      budgetStyle: z.enum(["backpacker", "mid-range", "luxury"]).optional(),
      interests: z.array(z.string()).optional().describe("e.g. ['food', 'history', 'nature']"),
      pace: z.enum(["relaxed", "packed"]).optional(),
      travelers: z.number().int().min(1).max(12).optional(),
    }),
    execute: async (partial) => {
      const saved = await save(partial);
      return { saved: true, profile: saved };
    },
  });
}
