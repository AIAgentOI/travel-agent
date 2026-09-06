import postgres from "postgres";

if (!process.env.DATABASE_URL) {
  console.error("Missing DATABASE_URL. Add your connection string to .env.");
  process.exit(1);
}

export const sql = postgres(process.env.DATABASE_URL);

export async function ensureSchema() {
  await sql`create extension if not exists vector`;
  // Pre-auth dev schema used a global singleton profile/conversations with no
  // owner - incompatible with per-user data. Drop and recreate rather than
  // migrate; there are no real users yet on this project.
  const [{ exists: hasLegacyProfile }] = await sql<{ exists: boolean }[]>`
    select exists (
      select 1 from information_schema.columns
      where table_name = 'traveler_profile' and column_name = 'id' and data_type = 'boolean'
    )
  `;
  if (hasLegacyProfile) {
    await sql`drop table if exists messages`;
    await sql`drop table if exists conversations`;
    await sql`drop table if exists traveler_profile`;
  }

  await sql`
    create table if not exists users (
      id uuid primary key default gen_random_uuid(),
      email text unique not null,
      password_hash text not null,
      created_at timestamptz not null default now()
    )
  `;
  await sql`
    create table if not exists sessions (
      id text primary key,
      user_id uuid not null references users(id) on delete cascade,
      expires_at timestamptz not null,
      created_at timestamptz not null default now()
    )
  `;
  await sql`
    create index if not exists sessions_expires_idx on sessions (expires_at)
  `;
  await sql`
    create table if not exists traveler_profile (
      user_id uuid primary key references users(id) on delete cascade,
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
      user_id uuid not null references users(id) on delete cascade,
      title text not null default 'New trip',
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `;
  await sql`
    create index if not exists conversations_user_idx on conversations (user_id, updated_at desc)
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
  await sql`
    create table if not exists travel_experiences (
      id uuid primary key default gen_random_uuid(),
      city text not null,
      country text not null,
      author_would_return boolean,
      alternative_places text[] not null default '{}',
      food text[] not null default '{}',
      activities text[] not null default '{}',
      chunk_text text not null,
      embedding vector(1536),
      raw jsonb not null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      unique (city, country)
    )
  `;
  await sql`
    do $$
    begin
      if exists (select 1 from information_schema.columns where table_name = 'travel_experiences' and column_name = 'would_return')
         and not exists (select 1 from information_schema.columns where table_name = 'travel_experiences' and column_name = 'author_would_return') then
        alter table travel_experiences rename column would_return to author_would_return;
      end if;
    end
    $$;
  `;
  await sql`
    alter table travel_experiences
    add column if not exists embedding vector(1536)
  `;
}
