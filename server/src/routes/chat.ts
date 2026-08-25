import { Router } from "express";
import { convertToModelMessages, generateId, type UIMessage } from "ai";
import { runAgent } from "../agent.js";
import { getProfile, upsertProfile } from "../profile.js";
import { formatProfileContext } from "../prompts.js";
import { createTravelTools } from "../tools/index.js";
import { saveMessages, conversationBelongsToUser } from "./conversations.js";

export const chatRouter = Router();

chatRouter.post("/chat", async (req, res) => {
  const { messages, conversationId } = req.body as {
    messages: UIMessage[];
    conversationId: string;
  };
  const userId = req.userId!;

  if (!(await conversationBelongsToUser(conversationId, userId))) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  const profileContext = formatProfileContext(await getProfile(userId));
  const modelMessages = await convertToModelMessages(messages);
  const tools = createTravelTools((partial) => upsertProfile(userId, partial));
  const result = runAgent(modelMessages, profileContext, tools);

  await result.pipeUIMessageStreamToResponse(res, {
    originalMessages: messages,
    generateMessageId: generateId,
    onEnd: async ({ messages: updated }) => {
      await saveMessages(conversationId, updated);
    },
  });
});
