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

export interface AuthUser {
  id: string;
  email: string;
}

async function authRequest(path: string, email: string, password: string): Promise<AuthUser> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Request failed");
  }
  return res.json();
}

export function signup(email: string, password: string): Promise<AuthUser> {
  return authRequest("/api/auth/signup", email, password);
}

export function login(email: string, password: string): Promise<AuthUser> {
  return authRequest("/api/auth/login", email, password);
}

export async function logout(): Promise<void> {
  await fetch("/api/auth/logout", { method: "POST" });
}

export async function getMe(): Promise<AuthUser | null> {
  const res = await fetch("/api/auth/me");
  if (!res.ok) return null;
  return res.json();
}
