// src/services/socket.ts
import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function connectToChat(token: string) {
  if (socket && socket.connected) return socket;
  const WS_URL = import.meta.env.VITE_WS_URL || "http://localhost:4000";
  socket = io(WS_URL, { auth: { token } });
  socket.on("connect", () => console.log("Socket connected:", socket?.id));
  socket.on("disconnect", () => console.log("Socket disconnected"));
  return socket;
}

export function disconnectSocket() {
  if (!socket) return;
  socket.disconnect();
  socket = null;
}

export function joinConversation(conversationId: string) {
  if (!socket) return;
  socket.emit("join_conversation", conversationId);
}

export function sendSocketMessage(conversationId: string, content: string) {
  if (!socket) throw new Error("Socket not connected");
  socket.emit("send_message", { conversationId, content });
}

export function onNewMessage(handler: (msg: any) => void) {
  socket?.on("new_message", handler);
}

export function offNewMessage(handler: (msg: any) => void) {
  socket?.off("new_message", handler);
}

export function sendTyping(conversationId: string) {
  if (!socket) return;
  socket.emit("typing", { conversationId });
}

export function onTyping(handler: (data: any) => void) {
  socket?.on("user_typing", handler);
}
export function offTyping(handler: (data: any) => void) {
  socket?.off("user_typing", handler);
}

/* ----- Presence helpers ----- */

/**
 * Ask server for current online users (server may also push automatically).
 */
export function requestOnlineUsers() {
  if (!socket) return;
  socket.emit("get_online_users");
}

/**
 * Register the current user with the socket server so presence works.
 * server should accept and mark this socket as belonging to that user
 */
export function registerMe(user: { id: string; name?: string; email?: string }) {
  if (!socket) return;
  socket.emit("register", user);
}

/**
 * Presence event subscriptions
 */
export function onOnlineUsers(handler: (users: any[]) => void) {
  socket?.on("online_users", handler);
}
export function offOnlineUsers(handler: (users: any[]) => void) {
  socket?.off("online_users", handler);
}

export function onUserConnected(handler: (user: any) => void) {
  socket?.on("user_connected", handler);
}
export function offUserConnected(handler: (user: any) => void) {
  socket?.off("user_connected", handler);
}

export function onUserDisconnected(handler: (user: any) => void) {
  socket?.on("user_disconnected", handler);
}
export function offUserDisconnected(handler: (user: any) => void) {
  socket?.off("user_disconnected", handler);
}
