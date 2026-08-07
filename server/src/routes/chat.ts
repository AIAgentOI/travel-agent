import { Router } from "express";
import { convertToModelMessages, generateId, type UIMessage } from "ai";
import { runAgent } from "../agent.js";
import { getProfile, formatProfileContext } from "../profile.js";
import { saveMessages } from "./conversations.js";

export const chatRouter = Router();

chatRouter.post("/chat", async (req, res) => {
  const { messages, conversationId } = req.body as {
    messages: UIMessage[];
    conversationId: string;
  };

  const profileContext = formatProfileContext(await getProfile());
  const modelMessages = await convertToModelMessages(messages);
  const result = runAgent(modelMessages, profileContext);

  await result.pipeUIMessageStreamToResponse(res, {
    originalMessages: messages,
    generateMessageId: generateId,
    onEnd: async ({ messages: updated }) => {
      await saveMessages(conversationId, updated);
    },
  });
});
