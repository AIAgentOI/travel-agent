import { Router } from "express";
import { convertToModelMessages, generateId, type UIMessage } from "ai";
import { runAgent } from "../agent.js";
import { getProfile, formatProfileContext } from "../profile.js";
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
  const result = runAgent(modelMessages, profileContext, userId);

  await result.pipeUIMessageStreamToResponse(res, {
    originalMessages: messages,
    generateMessageId: generateId,
    onEnd: async ({ messages: updated }) => {
      await saveMessages(conversationId, updated);
    },
  });
});
