import "dotenv/config";
import express from "express";
import { ensureSchema, startKeepalive } from "./db.js";
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
app.use("/api", chatRouter);
app.use("/api", conversationsRouter);
app.use("/api", profileRouter);

const port = 3001;
app.listen(port, () => {
  console.log(`Travel agent server listening on http://localhost:${port}`);
});
