import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { embedMany } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { ensureSchema, sql } from "../src/db.js";

const ExperienceSchema = z.object({
  city: z.string().min(1),
  country: z.string().min(1),
  author_would_return: z.union([z.enum(["yes", "no"]), z.string()]).nullable().optional(),
  would_return: z.union([z.enum(["yes", "no"]), z.string()]).nullable().optional(),
  alternative_places: z.array(z.string()),
  food: z.array(z.string()),
  activities: z.array(z.string()),
  chunk_text: z.string().min(1),
});

const ExperiencesSchema = z.array(ExperienceSchema);

type Experience = z.infer<typeof ExperienceSchema>;

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const localInput = path.resolve(scriptDir, "../data/experience.json");
const exampleInput = path.resolve(scriptDir, "../data/experience.example.json");

async function resolveInputPath(rawPath: string | undefined): Promise<string> {
  if (!rawPath) {
    try {
      await fs.access(localInput);
      return localInput;
    } catch {
      return exampleInput;
    }
  }
  return path.isAbsolute(rawPath) ? rawPath : path.resolve(process.cwd(), rawPath);
}

function normalizeAuthorWouldReturn(value: Experience["author_would_return"] | Experience["would_return"]): boolean | null {
  if (value === "yes") return true;
  if (value === "no") return false;
  return null;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("Missing DATABASE_URL. Add your connection string to server/.env.");
  }
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY. Add it to server/.env.");
  }

  const inputPath = await resolveInputPath(process.argv[2]);
  const raw = await fs.readFile(inputPath, "utf8");
  const parsed = ExperiencesSchema.parse(JSON.parse(raw));
  const { embeddings } = await embedMany({
    model: openai.embedding("text-embedding-3-small"),
    values: parsed.map((record) => record.chunk_text),
  });

  await ensureSchema();

  let ingested = 0;
  for (const record of parsed) {
    await sql`
      insert into travel_experiences (
        city,
        country,
        author_would_return,
        alternative_places,
        food,
        activities,
        chunk_text,
        embedding,
        raw,
        updated_at
      )
      values (
        ${record.city},
        ${record.country},
        ${normalizeAuthorWouldReturn(record.author_would_return ?? record.would_return)},
        ${record.alternative_places},
        ${record.food},
        ${record.activities},
        ${record.chunk_text},
        ${JSON.stringify(embeddings[ingested])}::vector,
        ${sql.json(record)},
        now()
      )
      on conflict (city, country) do update set
        author_would_return = excluded.author_would_return,
        alternative_places = excluded.alternative_places,
        food = excluded.food,
        activities = excluded.activities,
        chunk_text = excluded.chunk_text,
        embedding = excluded.embedding,
        raw = excluded.raw,
        updated_at = now()
    `;
    ingested += 1;
  }

  console.log(`Ingested ${ingested} travel experiences from ${path.relative(process.cwd(), inputPath)}`);
}

main().catch((err: unknown) => {
  console.error("Ingest failed:", err);
  process.exitCode = 1;
});
