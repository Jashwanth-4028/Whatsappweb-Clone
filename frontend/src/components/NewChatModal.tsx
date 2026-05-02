import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import { api } from "../api";
import type { User } from "../types";
import Avatar from "./Avatar";

type NewChatModalProps = {
  open: boolean;
  onClose: () => void;
  onContactAdded: (contact: User) => Promise<void>;
  onStartChat: (contact: User) => Promise<void>;
};

const NewChatModal = ({ open, onClose, onContactAdded, onStartChat }: NewChatModalProps) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState("");
  const [error, setError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setError("");
      setHasSearched(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(async () => {
      if (!query.trim()) {
        setResults([]);
        setHasSearched(false);
        return;
      }
      try {
        setLoading(true);
        setHasSearched(true);
        const res = await api.get<User[]>("/users/search", { params: { q: query } });
        setResults(res.data);
        setError("");
      } catch (_e) {
        setError("Could not search users");
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query, open]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Start a new chat</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>
        <p className="modal-subtitle">Search by name, email, or phone number</p>
        <div className="modal-search">
          <div className="input-with-icon">
            <Search size={16} aria-hidden="true" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search contacts to add or message" />
          </div>
        </div>
        <div className="modal-results">
          {loading ? <div className="empty-list">Searching for people...</div> : null}
          {!query.trim() ? (
            <div className="empty-list">
              Start typing to discover registered users.
              <br />
              Try full email or phone for accurate matches.
            </div>
          ) : null}
          {!loading && hasSearched && !results.length ? (
            <div className="empty-list">
              No matching users registered.
              <br />
              Try searching by full email or create another account to test chat.
            </div>
          ) : null}
          {results.map((u) => (
            <div key={u._id} className="result-item">
              <div className="result-user">
                <Avatar name={u.name} avatarUrl={u.avatarUrl} small />
                <div>
                  <strong>{u.name}</strong>
                  <small>{u.email}</small>
                  {u.phone ? <small>{u.phone}</small> : null}
                </div>
              </div>
              <div className="result-actions">
                <button
                  disabled={actionLoadingId === u._id}
                  onClick={async () => {
                    try {
                      setActionLoadingId(u._id);
                      await onContactAdded(u);
                      onClose();
                    } finally {
                      setActionLoadingId("");
                    }
                  }}
                >
                  {actionLoadingId === u._id ? "Adding..." : "Add Contact"}
                </button>
                <button
                  className="secondary"
                  disabled={actionLoadingId === u._id}
                  onClick={async () => {
                    try {
                      setActionLoadingId(u._id);
                      await onStartChat(u);
                      onClose();
                    } finally {
                      setActionLoadingId("");
                    }
                  }}
                >
                  {actionLoadingId === u._id ? "Starting..." : "Start Chat"}
                </button>
              </div>
            </div>
          ))}
        </div>
        {error ? <p className="error">{error}</p> : null}
      </div>
    </div>
  );
};

export default NewChatModal;
