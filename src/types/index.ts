// Type definitions for Echo Chat App

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  isOnline?: boolean;
  lastSeen?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: string;
  isRead?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount: number;
  participants: User[];
  isOnline?: boolean;
  createdAt?: string;
  messageCount?: number;
}

export interface TypingIndicator {
  userId: string;
  userName: string;
  conversationId: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}
