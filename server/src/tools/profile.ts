import { tool } from "ai";
import { z } from "zod";
import { upsertProfile } from "../profile.js";

export function createUpdateProfileTool(userId: string) {
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
      const saved = await upsertProfile(userId, partial);
      return { saved: true, profile: saved };
    },
  });
}
