import { User, Conversation, Message, AuthResponse } from "@/types";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";
const TOKEN_KEY = "echo_access_token";

const getToken = (): string | null => localStorage.getItem(TOKEN_KEY);

const setToken = (token: string) => localStorage.setItem(TOKEN_KEY, token);

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const login = async (email: string, password: string): Promise<AuthResponse> => {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error("Login failed");
  const data = await res.json();
  setToken(data.token || data.accessToken || "");
  // map backend user shape to frontend User
  const user: User = { id: data.user.id, name: data.user.name, email: data.user.email };
  return { user, accessToken: data.token || data.accessToken };
};

export const signup = async (email: string, password: string, name: string): Promise<AuthResponse> => {
  const res = await fetch(`${BASE_URL}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  });
  if (!res.ok) throw new Error("Signup failed");
  const data = await res.json();
  setToken(data.token || data.accessToken || "");
  const user: User = { id: data.user.id, name: data.user.name, email: data.user.email };
  return { user, accessToken: data.token || data.accessToken };
};

export const logout = async (): Promise<void> => {
  localStorage.removeItem(TOKEN_KEY);
};

export const getConversations = async (): Promise<Conversation[]> => {
  const res = await fetch(`${BASE_URL}/api/conversations`, {
    headers: { ...authHeaders() },
  });
  if (!res.ok) throw new Error("Failed to load conversations");
  const data = await res.json();
  // Map DB shape to frontend Conversation if necessary
  return data.map((c: any) => ({
    id: c.id || c._id,
    title: c.title || "",
    lastMessage: c.lastMessage || "",
    lastMessageTime: c.lastMessageTime || "",
    unreadCount: c.unreadCount || 0,
    participants: c.participants || [],
    isOnline: c.isOnline || false,
  }));
};

export const getMessages = async (conversationId: string): Promise<Message[]> => {
  const res = await fetch(`${BASE_URL}/api/conversations/${conversationId}/messages`, {
    headers: { ...authHeaders() },
  });
  if (!res.ok) throw new Error("Failed to load messages");
  const data = await res.json();
  return data.map((m: any) => ({
    _id: m.id || m._id,
    conversationId: String(m.conversationId || m.conversation),
    senderId: String(m.senderId || m.sender),
    senderName: m.senderName || m.sender?.name || "",
    content: m.content,
    timestamp: new Date(m.timestamp || m.createdAt).toISOString(),
  }));
};

export const sendMessage = async (conversationId: string, content: string): Promise<Message> => {
  const res = await fetch(`${BASE_URL}/api/conversations/${conversationId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error("Failed to send message");
  const m = await res.json();
  return {
    id: m.id || m._id,
    conversationId: String(m.conversationId),
    senderId: String(m.senderId || m.sender),
    senderName: m.senderName || "",
    content: m.content,
    timestamp: new Date(m.timestamp || m.createdAt).toISOString(),
  };
};

export async function getUsers(token: string) {
  const res = await fetch(`${BASE_URL}/api/users`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch users");
  return res.json();
}

export async function createConversation(token: string, title: string, memberIds: string[]) {
  const res = await fetch(`${BASE_URL}/api/conversations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ title, memberIds }),
  });
  if (!res.ok) throw new Error("Failed to create conversation");
  const data = await res.json();
  // Map to include new fields
  return {
    ...data,
    createdAt: data.createdAt || new Date().toISOString(),
    messageCount: data.messageCount || 0,
  };
}

export async function deleteConversation(conversationId: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/conversations/${conversationId}`, {
    method: "DELETE",
    headers: { ...authHeaders() },
  });
  if (!res.ok) throw new Error("Failed to delete conversation");
}

