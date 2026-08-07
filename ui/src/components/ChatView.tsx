import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { createConversation } from "../api.js";
import { MessagePart } from "./MessagePart.js";

const SUGGESTIONS = [
  "Plan a 5-day trip to Lisbon in October",
  "Weekend food tour in Mexico City",
  "One week in Japan, temples and hiking",
];

export function ChatView({
  conversationId,
  initialMessages,
  onConversationCreated,
  onMessageSettled,
  onOpenSidebar,
}: {
  conversationId: string | null;
  initialMessages: UIMessage[];
  onConversationCreated: (id: string) => void;
  onMessageSettled: () => void;
  onOpenSidebar: () => void;
}) {
  const [input, setInput] = useState("");
  const [creating, setCreating] = useState(false);
  const convIdRef = useRef<string | null>(conversationId);

  const { messages, sendMessage, status } = useChat({
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: () => ({ conversationId: convIdRef.current }),
    }),
  });

  const isBusy = creating || status === "submitted" || status === "streaming";
  const wasBusy = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (wasBusy.current && !isBusy) onMessageSettled();
    wasBusy.current = isBusy;
  }, [isBusy, onMessageSettled]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  async function submitText(text: string) {
    if (!text.trim() || isBusy) return;
    // Lazy creation: the conversation row only exists once the user actually sends something.
    if (!convIdRef.current) {
      setCreating(true);
      try {
        const { id } = await createConversation();
        convIdRef.current = id;
        onConversationCreated(id);
      } catch {
        return;
      } finally {
        setCreating(false);
      }
    }
    sendMessage({ text: text.trim() });
    setInput("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    void submitText(input);
  }

  return (
    <div className="chat-view">
      <div className="mobile-topbar">
        <button className="icon-btn" onClick={onOpenSidebar} title="Open menu" aria-label="Open menu">
          ☰
        </button>
        <span className="mobile-topbar-title">Travel Planner</span>
      </div>
      <div className="messages">
        {messages.length === 0 && (
          <div className="empty-state">
            <div className="empty-title">Where to next?</div>
            <div className="empty-sub">
              Tell me where you'd like to go, and I'll help you plan the trip.
            </div>
            <div className="suggestions">
              {SUGGESTIONS.map((s) => (
                <button key={s} className="suggestion-chip" onClick={() => void submitText(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((message) => (
          <div key={message.id} className={`message message-${message.role}`}>
            {message.parts.map((part, i) => (
              <MessagePart key={i} part={part} />
            ))}
          </div>
        ))}
        {isBusy && (
          <div className="thinking">
            <span className="dot" />
            <span className="dot" />
            <span className="dot" />
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <form className="composer" onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Plan a 5-day trip to Lisbon…"
          disabled={isBusy}
        />
        <button type="submit" disabled={isBusy || !input.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}
