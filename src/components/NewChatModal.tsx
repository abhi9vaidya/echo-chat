// src/components/NewChatModal.tsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import { getUsers, createConversation } from "@/services/api";
import { joinConversation } from "@/services/socket";

type Props = {
  token: string | null;
  show: boolean;
  currentUserId?: string | null;
  onClose: () => void;
  onCreated: (conv: any) => void;
};

export default function NewChatModal({ token, show, currentUserId, onClose, onCreated }: Props) {
  const [users, setUsers] = useState<Array<any>>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [title, setTitle] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const searchTimeout = useRef<number | null>(null);

  // Fetch initial small list when modal opens (no query) and whenever token changes
  useEffect(() => {
    if (!show || !token) return;

    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const data = await getUsers(); // initial list
        if (cancelled) return;
        setUsers(Array.isArray(data) ? data.filter((u: any) => String(u._id) !== String(currentUserId)) : []);
      } catch (err) {
        console.error("failed to load users", err);
        setUsers([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [show, token, currentUserId]);

  // Debounced search
  useEffect(() => {
    if (!show) return;
    // clear previous timer
    if (searchTimeout.current) {
      window.clearTimeout(searchTimeout.current);
    }
    // if search empty, refetch initial list (already handled by open effect),
    // but we still do a quick fetch to refresh
    searchTimeout.current = window.setTimeout(async () => {
      if (!token) return;
      try {
        setLoading(true);
        const data = search && search.trim().length > 0 ? await getUsers(token, search.trim()) : await getUsers(token);
        setUsers(Array.isArray(data) ? data.filter((u: any) => String(u._id) !== String(currentUserId)) : []);
      } catch (err) {
        console.error("search getUsers failed", err);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    }, 300); // 300ms debounce

    return () => {
      if (searchTimeout.current) {
        window.clearTimeout(searchTimeout.current);
        searchTimeout.current = null;
      }
    };
  }, [search, token, show, currentUserId]);

  const filtered = useMemo(() => {
    // The backend already filters; this is just a safety fallback if needed.
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u: any) =>
      (u.name || "").toLowerCase().includes(q) || (u.email || "").toLowerCase().includes(q)
    );
  }, [users, search]);

  function toggleSelect(id: string) {
    setSelected((s) => ({ ...s, [id]: !s[id] }));
  }

  async function handleCreate() {
    if (!token) return;
    const memberIds = Object.keys(selected).filter((k) => selected[k]);
    if (memberIds.length === 0) {
      alert("Pick at least one member");
      return;
    }
    setLoading(true);
    try {
      const conv = await createConversation(token, title || "New Chat", memberIds);
      const id = conv.id || conv._id;
      const formatted = { ...conv, id };
      onCreated(formatted);
      joinConversation(formatted.id);
      onClose();
    } catch (err: any) {
      console.error(err);
      alert("Failed to create chat: " + (err?.message || err));
    } finally {
      setLoading(false);
    }
  }

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-11/12 max-w-2xl rounded bg-white p-4 shadow-lg">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Create New Chat</h3>
          <button onClick={onClose} className="text-gray-600">Close</button>
        </div>

        <div className="mb-3">
          <label className="block text-sm text-gray-600">Chat Title (optional)</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Study Group"
            className="mt-1 w-full rounded border px-2 py-1"
          />
        </div>

        <div className="mb-2">
          <label className="block text-sm text-gray-600">Search users</label>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email"
            className="mt-1 w-full rounded border px-2 py-1"
          />
        </div>

        <div className="mb-3 max-h-56 overflow-auto rounded border p-2">
          {loading ? (
            <div className="text-sm text-gray-500">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="text-sm text-gray-500">No users found. Invite someone or try a different search.</div>
          ) : (
            filtered.map((u: any) => (
              <div key={u._id} className="flex items-center justify-between p-2 hover:bg-slate-50">
                <div>
                  <div className="font-medium">{u.name}</div>
                  <div className="text-xs text-gray-500">{u.email}</div>
                </div>
                <div>
                  <button
                    onClick={() => toggleSelect(u._id)}
                    className={`px-3 py-1 rounded ${selected[u._id] ? "bg-blue-600 text-white" : "bg-gray-100"}`}
                  >
                    {selected[u._id] ? "Selected" : "Add"}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded border px-3 py-2">Cancel</button>
          <button onClick={handleCreate} disabled={loading} className="rounded bg-blue-600 px-3 py-2 text-white">
            {loading ? "Creating..." : "Create Chat"}
          </button>
        </div>
      </div>
    </div>
  );
}
