import { sql } from "./db.js";

export interface TravelerProfile {
  budgetStyle?: string;
  interests?: string[];
  pace?: string;
  travelers?: number;
}

interface ProfileRow {
  budget_style: string | null;
  interests: string[] | null;
  pace: string | null;
  travelers: number | null;
}

function fromRow(row: ProfileRow): TravelerProfile {
  return {
    budgetStyle: row.budget_style ?? undefined,
    interests: row.interests ?? undefined,
    pace: row.pace ?? undefined,
    travelers: row.travelers ?? undefined,
  };
}

export async function getProfile(): Promise<TravelerProfile | null> {
  const rows = await sql<ProfileRow[]>`
    select budget_style, interests, pace, travelers from traveler_profile where id = true
  `;
  return rows[0] ? fromRow(rows[0]) : null;
}

export async function upsertProfile(partial: TravelerProfile): Promise<TravelerProfile> {
  const rows = await sql<ProfileRow[]>`
    insert into traveler_profile (id, budget_style, interests, pace, travelers, updated_at)
    values (true, ${partial.budgetStyle ?? null}, ${partial.interests ?? null}, ${partial.pace ?? null}, ${partial.travelers ?? null}, now())
    on conflict (id) do update set
      budget_style = coalesce(excluded.budget_style, traveler_profile.budget_style),
      interests = coalesce(excluded.interests, traveler_profile.interests),
      pace = coalesce(excluded.pace, traveler_profile.pace),
      travelers = coalesce(excluded.travelers, traveler_profile.travelers),
      updated_at = now()
    returning budget_style, interests, pace, travelers
  `;
  return fromRow(rows[0]);
}

export async function replaceProfile(profile: TravelerProfile): Promise<TravelerProfile> {
  const rows = await sql<ProfileRow[]>`
    insert into traveler_profile (id, budget_style, interests, pace, travelers, updated_at)
    values (true, ${profile.budgetStyle ?? null}, ${profile.interests ?? null}, ${profile.pace ?? null}, ${profile.travelers ?? null}, now())
    on conflict (id) do update set
      budget_style = excluded.budget_style,
      interests = excluded.interests,
      pace = excluded.pace,
      travelers = excluded.travelers,
      updated_at = now()
    returning budget_style, interests, pace, travelers
  `;
  return fromRow(rows[0]);
}

export function formatProfileContext(profile: TravelerProfile | null): string {
  if (!profile) return "";
  const known: string[] = [];
  if (profile.budgetStyle) known.push(`travel style: ${profile.budgetStyle}`);
  if (profile.interests?.length) known.push(`interests: ${profile.interests.join(", ")}`);
  if (profile.pace) known.push(`pace: ${profile.pace}`);
  if (profile.travelers) known.push(`travelers: ${profile.travelers}`);
  if (!known.length) return "";
  return `\n\n## Known traveler profile (from past sessions)\n${known.join("\n")}\nDon't re-ask for this - only confirm if the user's new request seems to contradict it.`;
}
