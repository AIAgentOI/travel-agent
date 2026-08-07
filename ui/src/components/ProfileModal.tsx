import { useEffect, useState } from "react";
import { fetchProfile, saveProfile } from "../api.js";

export type Theme = "dark" | "light" | "terminal";

const THEMES: { id: Theme; label: string; hint: string }[] = [
  { id: "dark", label: "Dark", hint: "Default" },
  { id: "light", label: "Light", hint: "Bright" },
  { id: "terminal", label: "Terminal", hint: "Green on black" },
];

export function ProfileModal({
  theme,
  onThemeChange,
  onClose,
}: {
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [budgetStyle, setBudgetStyle] = useState("");
  const [interests, setInterests] = useState("");
  const [pace, setPace] = useState("");
  const [travelers, setTravelers] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchProfile()
      .then((p) => {
        if (cancelled) return;
        setBudgetStyle(p.budgetStyle ?? "");
        setInterests(p.interests?.join(", ") ?? "");
        setPace(p.pace ?? "");
        setTravelers(p.travelers ? String(p.travelers) : "");
      })
      .catch(() => {
        if (!cancelled) setError("Could not load your profile.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await saveProfile({
        budgetStyle: budgetStyle || undefined,
        interests: interests
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        pace: pace || undefined,
        travelers: travelers ? Number(travelers) : undefined,
      });
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1500);
    } catch {
      setError("Could not save. Is the server running?");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Your profile</h2>
          <button className="icon-btn" onClick={onClose} title="Close">
            ×
          </button>
        </div>

        <section className="modal-section">
          <h3>What the agent remembers</h3>
          <p className="section-hint">
            Learned from your conversations and used to personalize itineraries. Edit or clear
            anything that's off - for example a one-time trip that shouldn't shape future plans.
          </p>
          {loading ? (
            <div className="section-hint">Loading…</div>
          ) : (
            <div className="profile-form">
              <label>
                Travel style
                <select value={budgetStyle} onChange={(e) => setBudgetStyle(e.target.value)}>
                  <option value="">Not set</option>
                  <option value="backpacker">Backpacker</option>
                  <option value="mid-range">Mid-range</option>
                  <option value="luxury">Luxury</option>
                </select>
              </label>
              <label>
                Interests
                <input
                  value={interests}
                  onChange={(e) => setInterests(e.target.value)}
                  placeholder="food, architecture, museums (comma-separated)"
                />
              </label>
              <label>
                Pace
                <select value={pace} onChange={(e) => setPace(e.target.value)}>
                  <option value="">Not set</option>
                  <option value="relaxed">Relaxed</option>
                  <option value="moderate">Moderate</option>
                  <option value="packed">Packed</option>
                </select>
              </label>
              <label>
                Travelers
                <input
                  type="number"
                  min="1"
                  value={travelers}
                  onChange={(e) => setTravelers(e.target.value)}
                  placeholder="Not set"
                />
              </label>
              <div className="profile-actions">
                <button className="primary" onClick={handleSave} disabled={saving}>
                  {saving ? "Saving…" : savedFlash ? "Saved ✓" : "Save memory"}
                </button>
                {error && <span className="error-text">{error}</span>}
              </div>
            </div>
          )}
        </section>

        <section className="modal-section">
          <h3>Theme</h3>
          <div className="theme-picker">
            {THEMES.map((t) => (
              <button
                key={t.id}
                className={`theme-option theme-preview-${t.id} ${theme === t.id ? "selected" : ""}`}
                onClick={() => onThemeChange(t.id)}
              >
                <span className="theme-label">{t.label}</span>
                <span className="theme-hint">{t.hint}</span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
