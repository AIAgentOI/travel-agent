import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import { ensureSchema, startKeepalive } from "./db.js";
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
startKeepalive();

const app = express();
app.use(express.json({ limit: "5mb" }));
app.use(cookieParser());
app.use("/api", authRouter);
app.use("/api", requireAuth, chatRouter);
app.use("/api", requireAuth, conversationsRouter);
app.use("/api", requireAuth, profileRouter);

const port = 3001;
app.listen(port, () => {
  console.log(`Travel agent server listening on http://localhost:${port}`);
});
