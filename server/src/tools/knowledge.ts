import { embed, tool } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

const EMBEDDING_MODEL = "text-embedding-3-small";

type ExperienceRow = {
  city: string;
  country: string;
  author_would_return: boolean | null;
  alternative_places: string[];
  food: string[];
  activities: string[];
  chunk_text: string;
  similarity?: number;
};

/**
 * Shapes DB rows into the tool's output format.
 * `matchType` tells the model HOW a result was found:
 * - "exact_city": found by exact city-name lookup — confirms location,
 *   but says nothing about relevance to the specific query asked.
 * - "semantic": found by embedding similarity — `similarity` reflects
 *   how closely the row's content matches the query's meaning.
 */
function mapRows(rows: ExperienceRow[], matchType: "exact_city" | "semantic") {
  return rows.map((row) => ({
    city: row.city,
    country: row.country,
    matchType,
    similarity: row.similarity !== undefined ? Number(row.similarity) : undefined,
    wouldReturn: row.author_would_return,
    alternativePlaces: row.alternative_places,
    food: row.food,
    activities: row.activities,
    context: row.chunk_text,
  }));
}

/** Semantic search over the destination experiences written by the ingest job. */
export const searchTravelKnowledge = tool({
  description:
    "Search the curated travel-experience memory for destination-specific recommendations, local food, activities, alternative places, and whether a contributor would return. Use after the destination is known and before making personalized recommendations. Treat results as supporting local context, not live facts.",
  inputSchema: z.object({
    query: z.string().min(2).describe("What local travel knowledge to look up"),
    destination: z
      .string()
      .optional()
      .describe("A specific city (not a country or region) to narrow results, if known"),
    limit: z.number().int().min(1).max(5).default(3),
  }),
  execute: async ({ query, destination, limit }) => {
    const { sql } = await import("../db.js");

    // --- Fast path: exact city match ---
    // If we already know the city, an embedding call + vector similarity scan
    // is unnecessary overhead for *finding* the row. Try a cheap, deterministic
    // lookup first. Note: this filters by city name only (not country), so if
    // two rows share a city name in different countries, more than one row can
    // come back — the model gets `country` on each to disambiguate.
    // This path does NOT rank by relevance to `query` — it confirms location,
    // not query-specific relevance, hence matchType: "exact_city" rather than
    // a similarity score.
    if (destination) {
      const exactRows = await sql<ExperienceRow[]>`
        select city, country, author_would_return, alternative_places, food,
               activities, chunk_text
        from travel_experiences
        where lower(city) = lower(${destination})
        limit ${limit}
      `;
      if (exactRows.length > 0) {
        return {
          query,
          results: mapRows(exactRows, "exact_city"),
          note: "Curated traveler experience; verify time-sensitive details with live tools.",
        };
      }
      // No exact match — e.g. a country was passed instead of a city, or a
      // spelling variant that doesn't match any row's `city` value exactly.
      // Fall through to semantic search below rather than returning empty.
    }

    // --- Fallback path: semantic search ---
    // Reached when there's no destination at all, or the exact match above
    // found nothing. Ranks all rows by cosine similarity between the query's
    // embedding and each row's stored embedding.
    const { embedding } = await embed({
      model: openai.embedding(EMBEDDING_MODEL),
      value: destination ? `${destination}: ${query}` : query,
    });
    const vector = JSON.stringify(embedding);
    const rows = await sql<ExperienceRow[]>`
      select city, country, author_would_return, alternative_places, food,
             activities, chunk_text,
             1 - (embedding <=> ${vector}::vector) as similarity
      from travel_experiences
      where embedding is not null
      order by embedding <=> ${vector}::vector
      limit ${limit}
    `;
    return {
      query,
      results: mapRows(rows, "semantic"),
      note: "Curated traveler experience; verify time-sensitive details with live tools.",
    };
  },
});