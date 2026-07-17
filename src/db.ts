import postgres from "postgres";

if (!process.env.DATABASE_URL) {
  console.error("Missing DATABASE_URL. Add your connection string to .env.");
  process.exit(1);
}

export const sql = postgres(process.env.DATABASE_URL);

export async function ensureSchema() {
  await sql`
    create table if not exists traveler_profile (
      id boolean primary key default true check (id),
      budget_style text,
      interests text[],
      pace text,
      travelers integer,
      updated_at timestamptz not null default now()
    )
  `;
}
