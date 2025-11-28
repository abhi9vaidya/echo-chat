import { useState, useEffect } from "react";
import { AuthForm } from "@/components/AuthForm";
import { SidebarConversations } from "@/components/SidebarConversations";
import { ChatWindow } from "@/components/ChatWindow";
import { OnlineUsersPanel } from "@/components/OnlineUsersPanel";
import NewChatModal from "@/components/NewChatModal";
import { User, Conversation } from "@/types";
import { login, signup, getConversations, getMessages, sendMessage as apiSendMessage, deleteConversation } from "@/services/api";
import { connectToChat, disconnectSocket, joinConversation, sendSocketMessage, onNewMessage, offNewMessage, sendTyping, onTyping, offTyping, requestOnlineUsers, registerMe, onOnlineUsers, offOnlineUsers, onUserConnected, offUserConnected, onUserDisconnected, offUserDisconnected } from "@/services/socket";
import MessageBubble from "@/components/MessageBubble";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [joinedConvId, setJoinedConvId] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<User[]>([]);
  const [showSidebar, setShowSidebar] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const { toast } = useToast();

  const token = localStorage.getItem("echo_access_token");
  const currentUserId = currentUser?.id || null;

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // connect socket once after login
  useEffect(() => {
    if (!token) return;
    connectToChat(token);
    // cleanup on unmount
    return () => disconnectSocket();
  }, [token]);

  // register new_message handler once
  useEffect(() => {
    const handler = (msg: any) => {
      setMessages((prev) => {
        // dedupe by _id or id
        if (prev.find((m) => String(m._id || m.id) === String(msg._id || msg.id))) return prev;
        // remove matching optimistic msg if present (by content+senderId)
        const cleaned = prev.filter(
          (m) =>
            !(
              m._temp &&
              m.content === msg.content &&
              String(m.senderId) === String(msg.senderId)
            )
        );
        return [...cleaned, msg];
      });

      // Update message count for the conversation
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === msg.conversationId
            ? { ...conv, messageCount: (conv.messageCount || 0) + 1 }
            : conv
        )
      );
    };

    onNewMessage(handler);
    return () => offNewMessage(handler);
  }, []);

  // register typing handlers
  useEffect(() => {
    const handleUserTyping = (data: { userId: string; conversationId: string }) => {
      if (data.conversationId === selectedConversation) {
        const userName = onlineUsers.find(u => u.id === data.userId)?.name || `User ${data.userId}`;
        setTypingUsers(prev => {
          if (!prev.includes(userName)) {
            return [...prev, userName];
          }
          return prev;
        });
        // Clear typing indicator after 3 seconds
        setTimeout(() => {
          setTypingUsers(prev => prev.filter(name => name !== userName));
        }, 3000);
      }
    };

    onTyping(handleUserTyping);
    return () => offTyping(handleUserTyping);
  }, [selectedConversation, onlineUsers]);

  // Real-time presence for online users
  useEffect(() => {
    if (!token || !currentUser) return;

    // register this client/user with the socket server
    try {
      registerMe({ id: currentUser.id, name: currentUser.name, email: currentUser.email });
    } catch (err) {
      console.warn("registerMe failed", err);
    }

    // handler functions
    const handleOnlineUsers = (users: any[]) => {
      // server now sends array of { userId, name, email, online }
      const userDetails = users.map((u) => ({
        id: u.userId,
        name: u.name || `User ${u.userId}`,
        email: u.email || `${u.userId}@echo.chat`,
        isOnline: true,
      }));
      setOnlineUsers(userDetails);
    };

    const handleUserConnected = (user: any) => {
      setOnlineUsers((prev) => {
        const userId = user.userId;
        const exists = prev.find((u) => String(u.id) === String(userId));
        if (exists) {
          return prev.map((u) => (String(u.id) === String(userId) ? { ...u, name: user.name || u.name, email: user.email || u.email, isOnline: true } : u));
        }
        // Add new user with real info
        return [...prev, { id: userId, name: user.name || `User ${userId}`, email: user.email || `${userId}@echo.chat`, isOnline: true }];
      });
    };

    const handleUserDisconnected = (user: any) => {
      setOnlineUsers((prev) => prev.map((u) => (String(u.id) === String(user.userId) ? { ...u, isOnline: false } : u)));
    };

    // subscribe
    onOnlineUsers(handleOnlineUsers);
    onUserConnected(handleUserConnected);
    onUserDisconnected(handleUserDisconnected);

    // request an initial list in case server expects that
    requestOnlineUsers();

    // cleanup
    return () => {
      offOnlineUsers(handleOnlineUsers);
      offUserConnected(handleUserConnected);
      offUserDisconnected(handleUserDisconnected);
    };
  }, [token, currentUser]);

  // Load user from localStorage on startup
  useEffect(() => {
    const storedUser = localStorage.getItem("echo_user");
    if (storedUser) {
      setCurrentUser(JSON.parse(storedUser));
    }
  }, []);

  // Load conversations when user is available
  useEffect(() => {
    if (currentUser) {
      loadConversations();
    }
  }, [currentUser]);

  // Load messages when conversation changes
  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation);
    } else {
      setMessages([]);
    }
  }, [selectedConversation]);

  // join conversation room when selectedConversation changes
  useEffect(() => {
    if (!selectedConversation) return;
    if (joinedConvId === selectedConversation) return;

    try {
      joinConversation(selectedConversation);
      setJoinedConvId(selectedConversation);
    } catch (err) {
      console.warn("joinConversation failed", err);
    }
  }, [selectedConversation, joinedConvId]);

  const handleAuth = async (email: string, password: string, name?: string, isSignup?: boolean) => {
    try {
      const response = isSignup
        ? await signup(email, password, name || "")
        : await login(email, password);

      setCurrentUser(response.user);
      localStorage.setItem("echo_user", JSON.stringify(response.user));
      toast({
        title: "Welcome to Echo! 🎉",
        description: isSignup ? "Your account has been created." : "You've successfully logged in.",
      });
    } catch (error: any) {
      throw error;
    }
  };

  const loadConversations = async () => {
    try {
      const convs = await getConversations();
      setConversations(convs);
      
      // Auto-select first conversation
     
      if (convs.length > 0 && !selectedConversation) {
        setSelectedConversation(convs[0].id);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load conversations",
        variant: "destructive",
      });
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      const msgs = await getMessages(conversationId);
      setMessages(msgs);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load messages",
        variant: "destructive",
      });
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!selectedConversation || !currentUser) return;

    // Create optimistic message
    const optimisticMessage = {
      _id: `temp-${Date.now()}`,
      conversationId: selectedConversation,
      senderId: currentUser.id,
      senderName: currentUser.name,
      content,
      timestamp: new Date().toISOString(),
      _temp: true, // Mark as temporary
    };

    // Add optimistic message immediately
    setMessages((prev) => [...prev, optimisticMessage]);

    // Update conversation's last message and message count
    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === selectedConversation
          ? { ...conv, lastMessage: content, lastMessageTime: "Just now", messageCount: (conv.messageCount || 0) + 1 }
          : conv
      )
    );

    try {
      // Send through WebSocket for real-time delivery
      sendSocketMessage(selectedConversation, content);
    } catch (error: any) {
      // Remove optimistic message on failure
      setMessages((prev) => prev.filter((m) => m._id !== optimisticMessage._id));
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    }
  };

  const handleTyping = () => {
    if (selectedConversation) {
      // Backend integration point: Send typing indicator through WebSocket
      sendTyping(selectedConversation);
    }
  };

  const handleNewChat = () => {
    setShowNewChat(true);
  };

  const handleCreated = async (conv: any) => {
    // normalize id
    const id = conv.id || conv._id;
    const formatted = {
      id,
      title: conv.title || "New Chat",
      participants: conv.participants || (currentUser ? [currentUser] : []),
      isOnline: !!conv.isOnline,
      lastMessage: conv.lastMessage || "",
      lastMessageTime: conv.lastMessageTime || "",
      createdAt: conv.createdAt || new Date().toISOString(),
      messageCount: conv.messageCount || 0,
      ...conv,
    };

    // add to top of conversations list
    setConversations((prev) => {
      // avoid duplicates
      const exists = prev.find((c) => String(c.id) === String(id));
      if (exists) return prev.map((c) => (String(c.id) === String(id) ? formatted : c));
      return [formatted, ...prev];
    });

    // auto-open the newly created conversation
    setSelectedConversation(formatted.id);

    // attempt to load messages (best-effort)
    try {
      const msgs = await getMessages(formatted.id);
      setMessages(msgs);
    } catch (error: any) {
      console.error("Failed to load messages for new conversation:", error);
      setMessages([]);
    }

    // close modal
    setShowNewChat(false);
  };

  const handleDeleteConversation = async (conversationId: string) => {
    try {
      await deleteConversation(conversationId);
      setConversations((prev) => prev.filter((conv) => conv.id !== conversationId));

      // If the deleted conversation was selected, clear selection and messages
      if (selectedConversation === conversationId) {
        setSelectedConversation(null);
        setMessages([]);
      }

      toast({
        title: "Conversation deleted",
        description: "The conversation has been successfully deleted.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to delete conversation",
        variant: "destructive",
      });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("echo_access_token");
    localStorage.removeItem("echo_user");
    window.location.reload();
  };

  const toggleSidebar = () => {
    setShowSidebar(!showSidebar);
  };

  if (!currentUser) {
    return <AuthForm onAuth={handleAuth} />;
  }

  const currentConversation = conversations.find((c) => c.id === selectedConversation) || null;

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Sidebar - Conversations */}
      {(showSidebar || !isMobile) && (
        <div className={`${isMobile ? "absolute inset-0 z-10" : "w-80"} border-r border-border`}>
          <SidebarConversations
            conversations={conversations}
            currentConversationId={selectedConversation}
            onSelectConversation={setSelectedConversation}
            onDeleteConversation={handleDeleteConversation}
            onNewChat={handleNewChat}
            onLogout={handleLogout}
            isMobile={isMobile}
            onToggleSidebar={toggleSidebar}
          />
        </div>
      )}

      {/* Main Chat Window */}
      <div className="flex flex-1">
        <div className="flex-1">
          <ChatWindow
            conversation={currentConversation}
            messages={messages}
            currentUserId={currentUser.id}
            onSendMessage={handleSendMessage}
            onTyping={handleTyping}
            typingUsers={typingUsers}
            isMobile={isMobile}
            onToggleSidebar={toggleSidebar}
          />
        </div>

        {/* Right Panel - Online Users (Desktop only) */}
        {!isMobile && currentConversation && (
          <div className="w-64">
            <OnlineUsersPanel users={onlineUsers} conversation={currentConversation} />
          </div>
        )}
      </div>

      <NewChatModal
        token={localStorage.getItem("echo_access_token")}
        show={showNewChat}
        currentUserId={currentUserId}
        onClose={() => setShowNewChat(false)}
        onCreated={handleCreated}
      />
    </div>
  );
};

export default Index;
