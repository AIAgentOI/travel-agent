import { Router } from "express";
import { z } from "zod";
import { sql } from "../db.js";
import {
  createSession,
  destroySession,
  hashPassword,
  verifyPassword,
  setSession,
  clearSessionCookie,
  requireAuth,
} from "../auth.js";

export const authRouter = Router();

// A real bcrypt hash (unknown password) so a login attempt for a
// non-existent email still pays the full bcrypt cost, instead of
// short-circuiting fast and leaking which emails are registered via timing.
const DUMMY_HASH = "$2b$12$3Kiu5B48DvyCTbuCGB66.ugmtHkvvhGonAenlrtB7528MC4MskWsC";

const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

authRouter.post("/auth/signup", async (req, res) => {
  const parsed = credentialsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message });
    return;
  }
  const { email, password } = parsed.data;

  const [existing] = await sql`select id from users where email = ${email}`;
  if (existing) {
    res.status(409).json({ error: "An account with that email already exists" });
    return;
  }

  const passwordHash = await hashPassword(password);
  const [user] = await sql<{ id: string; email: string }[]>`
    insert into users (email, password_hash) values (${email}, ${passwordHash})
    returning id, email
  `;
  const session = await createSession(user.id);
  setSession(res, session);
  res.status(201).json({ id: user.id, email: user.email });
});

authRouter.post("/auth/login", async (req, res) => {
  const parsed = credentialsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid email or password" });
    return;
  }
  const { email, password } = parsed.data;

  const [user] = await sql<{ id: string; email: string; password_hash: string }[]>`
    select id, email, password_hash from users where email = ${email}
  `;
  // Always run a full bcrypt compare, even for an unknown email, so the
  // response time doesn't leak which emails are registered.
  const validPassword = await verifyPassword(password, user?.password_hash ?? DUMMY_HASH);
  if (!user || !validPassword) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const session = await createSession(user.id);
  setSession(res, session);
  res.json({ id: user.id, email: user.email });
});

authRouter.post("/auth/logout", async (req, res) => {
  const sessionId = req.cookies?.session_id as string | undefined;
  if (sessionId) await destroySession(sessionId);
  clearSessionCookie(res);
  res.status(204).end();
});

authRouter.get("/auth/me", requireAuth, async (req, res) => {
  const [user] = await sql<{ id: string; email: string }[]>`
    select id, email from users where id = ${req.userId!}
  `;
  res.json(user);
});
