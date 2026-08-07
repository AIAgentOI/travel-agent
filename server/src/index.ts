import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cookieParser from "cookie-parser";
import { ensureSchema, sql } from "./db.js";
import { requireAuth } from "./auth.js";
import { authRouter } from "./routes/auth.js";
import { chatRouter } from "./routes/chat.js";
import { conversationsRouter } from "./routes/conversations.js";
import { profileRouter } from "./routes/profile.js";

if (!process.env.OPENAI_API_KEY) {
  console.error("Missing OPENAI_API_KEY. Add it to server/.env.");
  process.exit(1);
}

await ensureSchema();

const app = express();
app.use(express.json({ limit: "5mb" }));
app.use(cookieParser());

// Unauthenticated health check. An external uptime pinger hits this to keep
// the Render service from idling; the query keeps Supabase from pausing.
app.get("/health", async (_req, res) => {
  try {
    await sql`select 1`;
    res.json({ ok: true });
  } catch (err) {
    console.error("Health check failed:", err);
    res.status(503).json({ ok: false });
  }
});

app.use("/api", authRouter);
app.use("/api", requireAuth, chatRouter);
app.use("/api", requireAuth, conversationsRouter);
app.use("/api", requireAuth, profileRouter);

// In production the UI is built into ui/dist and served from the same
// origin as the API, so no CORS/cross-site cookie config is needed.
if (process.env.NODE_ENV === "production") {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const uiDist = path.join(__dirname, "../../ui/dist");
  app.use(express.static(uiDist));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(uiDist, "index.html"));
  });
}

const port = process.env.PORT ?? 3001;
app.listen(port, () => {
  console.log(`Travel agent server listening on http://localhost:${port}`);
});
