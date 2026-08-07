import type { ConversationSummary } from "../api.js";

function relativeDate(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  return `${diffDay}d ago`;
}

export function Sidebar({
  conversations,
  activeId,
  open,
  onSelect,
  onNew,
  onDelete,
  onOpenProfile,
  onClose,
}: {
  conversations: ConversationSummary[];
  activeId: string | null;
  open: boolean;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onOpenProfile: () => void;
  onClose: () => void;
}) {
  return (
    <div className={`sidebar ${open ? "sidebar-open" : ""}`}>
      <div className="sidebar-brand">
        <span className="brand-mark">✈</span>
        <span className="brand-name">Travel Planner</span>
        <button className="icon-btn sidebar-close" onClick={onClose} title="Close menu">
          ×
        </button>
      </div>
      <button className="new-chat" onClick={onNew}>
        + New trip
      </button>
      <div className="conversation-list">
        {conversations.map((c) => (
          <div
            key={c.id}
            className={`conversation-item ${c.id === activeId ? "active" : ""}`}
            onClick={() => onSelect(c.id)}
          >
            <div className="conversation-title">{c.title}</div>
            <div className="conversation-meta">
              <span>{relativeDate(c.updated_at)}</span>
              <button
                className="delete-btn"
                title="Delete conversation"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(c.id);
                }}
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
      <button className="profile-btn" onClick={onOpenProfile}>
        <span className="profile-avatar">☺</span>
        <span>Profile &amp; memory</span>
      </button>
    </div>
  );
}
