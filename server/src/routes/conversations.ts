import { Router } from "express";
import type { UIMessage } from "ai";
import type postgres from "postgres";
import { sql } from "../db.js";
import { generateTitle } from "../agent.js";

interface ConversationRow {
  id: string;
  title: string;
  created_at: Date;
  updated_at: Date;
}

interface MessageRow {
  id: string;
  role: string;
  parts: UIMessage["parts"];
}

export const conversationsRouter = Router();

conversationsRouter.get("/conversations", async (req, res) => {
  const rows = await sql<ConversationRow[]>`
    select id, title, created_at, updated_at from conversations
    where user_id = ${req.userId!}
    order by updated_at desc
  `;
  res.json(rows);
});

conversationsRouter.post("/conversations", async (req, res) => {
  const id = crypto.randomUUID();
  await sql`insert into conversations (id, user_id) values (${id}, ${req.userId!})`;
  res.status(201).json({ id });
});

conversationsRouter.get("/conversations/:id", async (req, res) => {
  const [conversation] = await sql<ConversationRow[]>`
    select id, title, created_at, updated_at from conversations
    where id = ${req.params.id} and user_id = ${req.userId!}
  `;
  if (!conversation) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }
  const rows = await sql<MessageRow[]>`
    select id, role, parts from messages where conversation_id = ${req.params.id} order by created_at asc
  `;
  const messages: UIMessage[] = rows.map((row) => ({
    id: row.id,
    role: row.role as UIMessage["role"],
    parts: row.parts,
  }));
  res.json({ conversation, messages });
});

conversationsRouter.delete("/conversations/:id", async (req, res) => {
  await sql`delete from conversations where id = ${req.params.id} and user_id = ${req.userId!}`;
  res.status(204).end();
});

export async function conversationBelongsToUser(id: string, userId: string): Promise<boolean> {
  const [row] = await sql`select 1 from conversations where id = ${id} and user_id = ${userId}`;
  return Boolean(row);
}

function firstUserText(messages: UIMessage[]): string | null {
  const firstUserMessage = messages.find((m) => m.role === "user");
  const firstTextPart = firstUserMessage?.parts.find((p) => p.type === "text");
  if (!firstTextPart || firstTextPart.type !== "text") return null;
  const text = firstTextPart.text.trim();
  return text || null;
}

function truncate(text: string): string {
  return text.length > 60 ? `${text.slice(0, 60)}…` : text;
}

export async function saveMessages(conversationId: string, messages: UIMessage[]) {
  for (const message of messages) {
    await sql`
      insert into messages (id, conversation_id, role, parts)
      values (${message.id}, ${conversationId}, ${message.role}, ${sql.json(message.parts as unknown as postgres.JSONValue)})
      on conflict (id) do update set parts = excluded.parts
    `;
  }

  const [conversation] = await sql<{ title: string }[]>`
    select title from conversations where id = ${conversationId}
  `;

  let title: string | null = null;
  if (conversation?.title === "New trip") {
    const text = firstUserText(messages);
    if (text) {
      title = await generateTitle(text).catch(() => truncate(text));
    }
  }

  if (title) {
    await sql`
      update conversations set title = ${title}, updated_at = now() where id = ${conversationId}
    `;
  } else {
    await sql`update conversations set updated_at = now() where id = ${conversationId}`;
  }
}
