import { embed, tool } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

const KNOWLEDGE_MODEL = "text-embedding-3-small";

/** Semantic search over the destination experiences written by the ingest job. */
export const searchTravelKnowledge = tool({
  description:
    "Search the curated travel-experience memory for destination-specific recommendations, local food, activities, alternative places, and whether a contributor would return. Use after the destination is known and before making personalized recommendations. Treat results as supporting local context, not live facts.",
  inputSchema: z.object({
    query: z.string().min(2).describe("What local travel knowledge to look up"),
    destination: z.string().optional().describe("City to narrow results, if known"),
    limit: z.number().int().min(1).max(5).default(3),
  }),
  execute: async ({ query, destination, limit }) => {
    const { embedding } = await embed({
      model: openai.embedding(KNOWLEDGE_MODEL),
      value: destination ? `${destination}: ${query}` : query,
    });
    const { sql } = await import("../db.js");
    const vector = JSON.stringify(embedding);
    const rows = await sql`
      select city, country, author_would_return, alternative_places, food,
             activities, chunk_text,
             1 - (embedding <=> ${vector}::vector) as similarity
      from travel_experiences
      where embedding is not null
        and (${destination ?? null}::text is null or lower(city) = lower(${destination ?? ""}))
      order by embedding <=> ${vector}::vector
      limit ${limit}
    `;
    return {
      query,
      results: rows.map((row) => ({
        city: row.city,
        country: row.country,
        similarity: Number(row.similarity),
        wouldReturn: row.author_would_return,
        alternativePlaces: row.alternative_places,
        food: row.food,
        activities: row.activities,
        context: row.chunk_text,
      })),
      note: "Curated traveler experience; verify time-sensitive details with live tools.",
    };
  },
});
