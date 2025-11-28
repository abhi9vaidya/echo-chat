// src/components/NewChatModal.tsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import { getUsers, createConversationWithInvites } from "@/services/api";
import { socketService } from "@/services/socket";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X, Users, MessageSquare } from "lucide-react";

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
        const data = await getUsers(token); // initial list
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

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeout.current) {
        window.clearTimeout(searchTimeout.current);
        searchTimeout.current = null;
      }
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    
    // Only show results if search query matches full email or full name (case-insensitive)
    return users.filter((u: any) => {
      const nameMatch = (u.name || "").toLowerCase() === q;
      const emailMatch = (u.email || "").toLowerCase() === q;
      return nameMatch || emailMatch;
    });
  }, [users, search]);

  function toggleSelect(id: string) {
    setSelected((s) => ({ ...s, [id]: !s[id] }));
  }

  async function handleCreate() {
    if (!token) return;
    
    // Chat title is now compulsory
    if (!title || title.trim().length === 0) {
      alert("Chat title is required");
      return;
    }
    
    const invitees = Object.keys(selected).filter((k) => selected[k]);
    if (invitees.length === 0) {
      alert("Select at least one member to invite");
      return;
    }
    
    setLoading(true);
    try {
      const result = await createConversationWithInvites(title.trim(), invitees);
      const conv = result.conversation;
      const id = conv.id || conv._id;
      const formatted = { ...conv, id };
      onCreated(formatted);
      socketService.joinConversation(formatted.id);
      onClose();
      // Reset form
      setTitle("");
      setSelected({});
      setSearch("");
    } catch (err: any) {
      console.error(err);
      alert("Failed to create chat: " + (err?.message || err));
    } finally {
      setLoading(false);
    }
  }

  const selectedCount = Object.values(selected).filter(Boolean).length;
  const hasSearchQuery = search.trim().length > 0;
  const shouldShowResults = hasSearchQuery && filtered.length > 0;
  const shouldShowNoResults = hasSearchQuery && filtered.length === 0;

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-11/12 max-w-2xl rounded-lg bg-white p-6 shadow-2xl dark:bg-slate-900">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
              <MessageSquare className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-xl font-bold text-foreground">Create New Group Chat</h3>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-gray-100 dark:hover:bg-slate-800">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Chat Title Input */}
        <div className="mb-5">
          <label className="mb-2 block text-sm font-semibold text-foreground">
            Chat Title <span className="text-red-500">*</span>
          </label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Project Team, Study Group"
            className="bg-background placeholder-muted-foreground"
            disabled={loading}
          />
          <p className="mt-1 text-xs text-muted-foreground">Give your chat a descriptive name</p>
        </div>

        {/* Search Users Input */}
        <div className="mb-4">
          <label className="mb-2 block text-sm font-semibold text-foreground">
            Add Members
          </label>
          <div className="relative">
            <Users className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by full email or name"
              className="bg-background pl-9 placeholder-muted-foreground"
              disabled={loading}
            />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Search must match full email or name exactly</p>
        </div>

        {/* Selected Users Summary */}
        {selectedCount > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {Object.entries(selected)
              .filter(([_, isSelected]) => isSelected)
              .map(([userId]) => {
                const user = users.find((u: any) => String(u._id) === userId);
                return user ? (
                  <Badge key={userId} className="bg-blue-600 hover:bg-blue-700">
                    {user.name}
                    <button
                      onClick={() => toggleSelect(userId)}
                      className="ml-1 text-white hover:font-bold"
                    >
                      ×
                    </button>
                  </Badge>
                ) : null;
              })}
          </div>
        )}

        {/* Users List */}
        <div className="mb-6 max-h-72 overflow-y-auto rounded-lg border border-border bg-muted/20">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="text-sm text-muted-foreground">Loading users…</div>
            </div>
          ) : shouldShowResults ? (
            filtered.map((u: any) => (
              <div
                key={u._id}
                className="flex items-center justify-between border-b border-border p-3 last:border-b-0 transition-colors hover:bg-muted/50"
              >
                <div className="flex-1">
                  <div className="font-medium text-foreground">{u.name}</div>
                  <div className="text-xs text-muted-foreground">{u.email}</div>
                </div>
                <Button
                  onClick={() => toggleSelect(u._id)}
                  variant={selected[u._id] ? "default" : "outline"}
                  size="sm"
                  className={selected[u._id] ? "bg-blue-600 hover:bg-blue-700" : ""}
                >
                  {selected[u._id] ? "✓ Added" : "Add"}
                </Button>
              </div>
            ))
          ) : shouldShowNoResults ? (
            <div className="flex items-center justify-center p-8">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">No matching users found</p>
                <p className="mt-1 text-xs text-muted-foreground">Try searching with their exact email or full name</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center p-8">
              <div className="text-center">
                <Users className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">Start typing to search for users</p>
                <p className="mt-1 text-xs text-muted-foreground">Search by full email or name</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-3">
          <Button onClick={onClose} variant="outline" disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={loading || selectedCount === 0 || !title.trim()}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            {loading ? "Creating…" : `Create Chat (${selectedCount})`}
          </Button>
        </div>
      </div>
    </div>
  );
}
