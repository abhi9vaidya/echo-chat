import { io, Socket } from "socket.io-client";
import { Message, TypingIndicator } from "@/types";

type MessageCallback = (message: Message) => void;
type TypingCallback = (indicator: TypingIndicator) => void;
type GroupInviteCallback = (invite: any) => void;
type NotificationCallback = (notification: any) => void;
type MemberAddedCallback = (data: any) => void;
type OnlineUsersCallback = (users: any[]) => void;
type UserConnectedCallback = (user: any) => void;
type UserDisconnectedCallback = (user: any) => void;

class SocketService {
  private socket: Socket | null = null;
  private messageCallbacks: MessageCallback[] = [];
  private typingCallbacks: TypingCallback[] = [];
  private groupInviteCallbacks: GroupInviteCallback[] = [];
  private notificationCallbacks: NotificationCallback[] = [];
  private memberAddedCallbacks: MemberAddedCallback[] = [];
  private onlineUsersCallbacks: OnlineUsersCallback[] = [];
  private userConnectedCallbacks: UserConnectedCallback[] = [];
  private userDisconnectedCallbacks: UserDisconnectedCallback[] = [];
  private isInitialized = false;
  private currentToken: string | null = null;
  private currentUserInfo: { id: string; name?: string; email?: string } | null = null;
  private joinedRooms: Set<string> = new Set();

  // Register callbacks BEFORE initializing socket
  onMessage(cb: MessageCallback) {
    this.messageCallbacks.push(cb);
  }

  onTyping(cb: TypingCallback) {
    this.typingCallbacks.push(cb);
  }

  onGroupInvite(cb: GroupInviteCallback) {
    this.groupInviteCallbacks.push(cb);
  }

  onNotification(cb: NotificationCallback) {
    this.notificationCallbacks.push(cb);
  }

  onMemberAdded(cb: MemberAddedCallback) {
    this.memberAddedCallbacks.push(cb);
  }

  onOnlineUsers(cb: OnlineUsersCallback) {
    this.onlineUsersCallbacks.push(cb);
  }

  onUserConnected(cb: UserConnectedCallback) {
    this.userConnectedCallbacks.push(cb);
  }

  onUserDisconnected(cb: UserDisconnectedCallback) {
    this.userDisconnectedCallbacks.push(cb);
  }

  // Initialize global socket connection (call once after login)
  init(token: string, userInfo?: { id: string; name?: string; email?: string }) {
    if (this.isInitialized && this.socket?.connected) return;
    
    // Store token and userInfo for reconnection
    this.currentToken = token;
    this.currentUserInfo = userInfo || null;
    
    const WS_URL = import.meta.env.VITE_WS_URL || "http://localhost:4000";
    this.socket = io(WS_URL, { 
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      transports: ['websocket', 'polling']
    });

    this.socket.on("connect", () => {
      console.log("Socket connected:", this.socket?.id);
      // Register user info for presence tracking
      if (userInfo) {
        this.socket?.emit("register", userInfo);
      }
      // Request current online users list
      this.socket?.emit("get_online_users");
      
      // Re-join any rooms we were previously in
      this.rejoinRooms();
    });

    this.socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
    });

    this.socket.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason);
      // isInitialized remains true so we can auto-reconnect
    });

    // Set up global event listeners (not conversation-specific)
    this.socket.on("group:invite", (invite: any) => {
      console.log("Received group invite:", invite);
      this.groupInviteCallbacks.forEach((cb) => cb(invite));
    });

    this.socket.on("notification", (notification: any) => {
      console.log("Received notification:", notification);
      this.notificationCallbacks.forEach((cb) => cb(notification));
    });

    this.socket.on("new_message", (m: any) => {
      console.log("Received new_message:", m);
      const message: Message = {
        id: m.id || m._id,
        conversationId: String(m.conversationId),
        senderId: String(m.senderId || m.sender),
        senderName: m.senderName || (m.sender && m.sender.name) || "",
        content: m.content,
        timestamp: new Date(m.timestamp || m.createdAt).toISOString(),
      };
      this.messageCallbacks.forEach((cb) => cb(message));
    });

    this.socket.on("user_typing", (data: any) => {
      console.log("Received user_typing event:", data);
      const indicator: TypingIndicator = {
        userId: data.userId,
        userName: data.userName || "",
        conversationId: data.conversationId,
      };
      console.log("Calling typing callbacks with:", indicator);
      this.typingCallbacks.forEach((cb) => cb(indicator));
    });

    this.socket.on("group:memberAdded", (data: any) => {
      console.log("Member added to group:", data);
      this.memberAddedCallbacks.forEach((cb) => cb(data));
    });

    this.socket.on("online_users", (users: any[]) => {
      console.log("Received online users:", users);
      this.onlineUsersCallbacks.forEach((cb) => cb(users));
    });

    this.socket.on("user_connected", (user: any) => {
      console.log("User connected:", user);
      this.userConnectedCallbacks.forEach((cb) => cb(user));
    });

    this.socket.on("user_disconnected", (user: any) => {
      console.log("User disconnected:", user);
      this.userDisconnectedCallbacks.forEach((cb) => cb(user));
    });

    this.isInitialized = true;
  }

  private rejoinRooms() {
    // Re-join all previously joined conversation rooms
    this.joinedRooms.forEach((roomId) => {
      this.socket?.emit("join_conversation", roomId);
    });
  }

  // Join a specific conversation
  connectToChat(conversationId: string, token: string, userInfo?: { id: string; name?: string; email?: string }) {
    // Initialize global connection if not already done
    if (!this.isInitialized) {
      this.init(token, userInfo);
    }

    // Join the conversation room
    this.joinConversation(conversationId);
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isInitialized = false;
      this.joinedRooms.clear();
    }
  }

  sendMessage(message: Message) {
    if (!this.socket?.connected) {
      console.warn("Socket not connected, cannot send message");
      // Could implement queuing here
      return;
    }
    this.socket?.emit("send_message", { conversationId: message.conversationId, content: message.content });
  }

  sendTyping(conversationId: string) {
    if (!this.socket?.connected) {
      console.warn("Socket not connected, cannot send typing indicator");
      return;
    }
    this.socket?.emit("typing", conversationId);
  }

  joinConversation(conversationId: string) {
    const roomId = String(conversationId);
    this.joinedRooms.add(roomId); // Track for reconnection
    
    if (this.socket?.connected) {
      this.socket?.emit("join_conversation", roomId);
    } else {
      console.warn("Socket not connected, cannot join conversation");
    }
  }

  getSocket() {
    return this.socket;
  }

  isConnected() {
    return this.socket?.connected || false;
  }
}

export const socketService = new SocketService();
