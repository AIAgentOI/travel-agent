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
  await sql`
    create table if not exists conversations (
      id uuid primary key,
      title text not null default 'New trip',
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `;
  await sql`
    create table if not exists messages (
      id text primary key,
      conversation_id uuid not null references conversations(id) on delete cascade,
      role text not null,
      parts jsonb not null,
      created_at timestamptz not null default now()
    )
  `;
  await sql`
    create index if not exists messages_conversation_idx
      on messages (conversation_id, created_at)
  `;
}

const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;

// Supabase (and similar free-tier hosts) pause projects after a period of
// inactivity. A trivial periodic query keeps the connection/project alive.
export function startKeepalive() {
  setInterval(() => {
    sql`select 1`.catch((err) => console.error("Keepalive query failed:", err));
  }, FIVE_DAYS_MS);
}
