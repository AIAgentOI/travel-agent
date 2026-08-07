import crypto from "node:crypto";
import bcrypt from "bcrypt";
import type { Request, Response, NextFunction } from "express";
import { sql } from "./db.js";

const SESSION_COOKIE = "session_id";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days, sliding
const BCRYPT_ROUNDS = 12;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

function generateSessionId(): string {
  return crypto.randomBytes(32).toString("hex");
}

export async function createSession(userId: string): Promise<{ id: string; expiresAt: Date }> {
  const id = generateSessionId();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await sql`insert into sessions (id, user_id, expires_at) values (${id}, ${userId}, ${expiresAt})`;
  return { id, expiresAt };
}

export async function destroySession(sessionId: string): Promise<void> {
  await sql`delete from sessions where id = ${sessionId}`;
}

function setSessionCookie(res: Response, id: string, expiresAt: Date) {
  res.cookie(SESSION_COOKIE, id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });
}

export function setSession(res: Response, session: { id: string; expiresAt: Date }) {
  setSessionCookie(res, session.id, session.expiresAt);
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(SESSION_COOKIE, { path: "/" });
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const sessionId = req.cookies?.[SESSION_COOKIE] as string | undefined;
  if (!sessionId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const [session] = await sql<{ user_id: string; expires_at: Date }[]>`
    select user_id, expires_at from sessions where id = ${sessionId}
  `;
  if (!session || session.expires_at.getTime() < Date.now()) {
    clearSessionCookie(res);
    res.status(401).json({ error: "Session expired" });
    return;
  }

  // Sliding expiration: push the session forward on every authenticated request.
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await sql`update sessions set expires_at = ${expiresAt} where id = ${sessionId}`;
  setSessionCookie(res, sessionId, expiresAt);

  req.userId = session.user_id;
  next();
}
