import { useCallback, useEffect, useRef, useState } from "react";
import type { UIMessage } from "ai";
import {
  listConversations,
  getConversation,
  deleteConversation,
  type ConversationSummary,
} from "./api.js";
import { Sidebar } from "./components/Sidebar.js";
import { ChatView } from "./components/ChatView.js";
import { ProfileModal, type Theme } from "./components/ProfileModal.js";

function initialTheme(): Theme {
  const stored = localStorage.getItem("theme");
  return stored === "light" || stored === "terminal" ? stored : "dark";
}

export default function App() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  // null = draft chat: nothing in the DB until the user actually sends a message
  const [activeId, setActiveId] = useState<string | null>(null);
  const [initialMessages, setInitialMessages] = useState<UIMessage[]>([]);
  // Remount key for ChatView. Changes only on explicit switches - not when a
  // draft becomes a real conversation, which must not interrupt the stream.
  const [viewKey, setViewKey] = useState("draft-0");
  const [activeHasMessages, setActiveHasMessages] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const didInit = useRef(false);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("theme", theme);
  }, [theme]);

  async function refreshConversations() {
    const list = await listConversations();
    setConversations(list);
    return list;
  }

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    refreshConversations()
      .then(async (list) => {
        if (list.length > 0) await selectConversation(list[0].id);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function selectConversation(id: string) {
    const { messages } = await getConversation(id);
    setActiveId(id);
    setInitialMessages(messages);
    setActiveHasMessages(messages.length > 0);
    setViewKey(id);
    setSidebarOpen(false);
  }

  function startDraft() {
    setActiveId(null);
    setInitialMessages([]);
    setActiveHasMessages(false);
    setViewKey(`draft-${Date.now()}`);
    setSidebarOpen(false);
  }

  function handleNew() {
    // Current chat is still empty - reuse it instead of stacking up blank tabs.
    if (!activeHasMessages) {
      setSidebarOpen(false);
      return;
    }
    startDraft();
  }

  async function handleDelete(id: string) {
    await deleteConversation(id);
    const list = await refreshConversations();
    if (id === activeId) {
      if (list.length > 0) {
        await selectConversation(list[0].id);
      } else {
        startDraft();
      }
    }
  }

  const handleConversationCreated = useCallback((id: string) => {
    setActiveId(id);
    setActiveHasMessages(true);
    void refreshConversations();
  }, []);

  const handleMessageSettled = useCallback(() => {
    setActiveHasMessages(true);
    void refreshConversations();
  }, []);

  if (loading) {
    return <div className="app-loading">Loading…</div>;
  }

  return (
    <div className="app">
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        open={sidebarOpen}
        showNew={conversations.length > 0}
        onSelect={selectConversation}
        onNew={handleNew}
        onDelete={handleDelete}
        onOpenProfile={() => {
          setProfileOpen(true);
          setSidebarOpen(false);
        }}
        onClose={() => setSidebarOpen(false)}
      />
      {sidebarOpen && <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />}
      <ChatView
        key={viewKey}
        conversationId={activeId}
        initialMessages={initialMessages}
        onConversationCreated={handleConversationCreated}
        onMessageSettled={handleMessageSettled}
        onOpenSidebar={() => setSidebarOpen(true)}
      />
      {profileOpen && (
        <ProfileModal theme={theme} onThemeChange={setTheme} onClose={() => setProfileOpen(false)} />
      )}
    </div>
  );
}
