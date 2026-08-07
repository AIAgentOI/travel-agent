import type { UIMessage } from "ai";

export interface ConversationSummary {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export async function listConversations(): Promise<ConversationSummary[]> {
  const res = await fetch("/api/conversations");
  if (!res.ok) throw new Error("Failed to load conversations");
  return res.json();
}

export async function createConversation(): Promise<{ id: string }> {
  const res = await fetch("/api/conversations", { method: "POST" });
  if (!res.ok) throw new Error("Failed to create conversation");
  return res.json();
}

export async function getConversation(
  id: string,
): Promise<{ conversation: ConversationSummary; messages: UIMessage[] }> {
  const res = await fetch(`/api/conversations/${id}`);
  if (!res.ok) throw new Error("Failed to load conversation");
  return res.json();
}

export async function deleteConversation(id: string): Promise<void> {
  const res = await fetch(`/api/conversations/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete conversation");
}

export interface TravelerProfile {
  budgetStyle?: string;
  interests?: string[];
  pace?: string;
  travelers?: number;
}

export async function fetchProfile(): Promise<TravelerProfile> {
  const res = await fetch("/api/profile");
  if (!res.ok) throw new Error("Failed to load profile");
  return res.json();
}

export async function saveProfile(profile: TravelerProfile): Promise<TravelerProfile> {
  const res = await fetch("/api/profile", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(profile),
  });
  if (!res.ok) throw new Error("Failed to save profile");
  return res.json();
}
