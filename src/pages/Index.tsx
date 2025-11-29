import { useState, useEffect, useRef } from "react";
import { AuthForm } from "@/components/AuthForm";
import { SidebarConversations } from "@/components/SidebarConversations";
import { ChatWindow } from "@/components/ChatWindow";
import { OnlineUsersPanel } from "@/components/OnlineUsersPanel";
import NewChatModal from "@/components/NewChatModal";
import InvitationModal from "@/components/InvitationModal";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { User, Conversation } from "@/types";
import { login, signup, getConversations, getMessages, sendMessage as apiSendMessage, deleteConversation, getPendingInvitations } from "@/services/api";
import { socketService } from "@/services/socket";
import MessageBubble from "@/components/MessageBubble";
import { useToast } from "@/hooks/use-toast";
import { useMobile } from "@/hooks/use-mobile";

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
  const [showNewChat, setShowNewChat] = useState(false);
  const [pendingInvitation, setPendingInvitation] = useState<any | null>(null);
  const [showInvitationModal, setShowInvitationModal] = useState(false);
  const [pendingInvitations, setPendingInvitations] = useState<any[]>([]);
  const { toast } = useToast();
  const typingTimeoutsRef = useRef<Map<string, any>>(new Map());
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const refreshRetryCountRef = useRef(0);
  const isUserActiveRef = useRef(true);

  const token = localStorage.getItem("echo_access_token");
  const currentUserId = currentUser?.id || null;
  const isMobile = useMobile();

  // Register all socket listeners ONCE on component mount (FIRST - before socket init)
  useEffect(() => {
    console.log("[SOCKET] Registering all callbacks...");
    
    // Message count handler
    const messageCountHandler = (data: { conversationId: string; count: number }) => {
      console.log("[SOCKET] Message count update received:", data);
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === data.conversationId
            ? { ...conv, messageCount: data.count }
            : conv
        )
      );
    };

    // Message handler
    const msgHandler = (msg: any) => {
      console.log("[SOCKET] Message received:", msg);
      let messageWasAdded = false;

      // Only add message to messages array if it belongs to the selected conversation
      if (msg.conversationId === selectedConversation) {
        setMessages((prev) => {
          if (prev.find((m) => String(m._id || m.id) === String(msg._id || msg.id))) return prev;
          const cleaned = prev.filter(
            (m) =>
              !(
                m._temp &&
                m.content === msg.content &&
                String(m.senderId) === String(msg.senderId)
              )
          );
          messageWasAdded = true;
          return [...cleaned, msg];
        });
      }

      // Clear typing indicator for the user who sent the message
      const senderName = msg.senderName;
      if (senderName) {
        const existingTimeout = typingTimeoutsRef.current.get(senderName);
        if (existingTimeout) {
          clearTimeout(existingTimeout);
          typingTimeoutsRef.current.delete(senderName);
        }
        setTypingUsers(prev => prev.filter(name => name !== senderName));
      }

      // Only increment count if the message is not from the current user (to avoid double-counting user's own messages)
      if (String(msg.senderId) !== String(currentUser?.id)) {
        setConversations((prev) =>
          prev.map((conv) =>
            conv.id === msg.conversationId
              ? { ...conv, messageCount: (conv.messageCount || 0) + 1 }
              : conv
          )
        );
      }
    };

    // Typing handler
    const typingHandler = (data: { userId: string; userName: string; conversationId: string }) => {
      console.log("[SOCKET] Typing received:", data);
      if (data.conversationId === selectedConversation && String(data.userId) !== String(currentUser?.id)) {
        const userName = data.userName;
        setTypingUsers(prev => {
          if (!prev.includes(userName)) {
            return [...prev, userName];
          }
          return prev;
        });

        // Clear existing timeout for this user
        const existingTimeout = typingTimeoutsRef.current.get(userName);
        if (existingTimeout) {
          clearTimeout(existingTimeout);
        }

        // Set new timeout to remove typing indicator after 3 seconds
        const timeoutId = setTimeout(() => {
          setTypingUsers(prev => prev.filter(name => name !== userName));
          typingTimeoutsRef.current.delete(userName);
        }, 3000);

        typingTimeoutsRef.current.set(userName, timeoutId);
      }
    };

    // Group invite handler
    const inviteHandler = (invite: any) => {
      console.log("[SOCKET] Invite handler called with:", invite);
      setPendingInvitations(prev => [...prev, invite]);
      setPendingInvitation(invite);
      setShowInvitationModal(true);
      toast({
        title: "You've been invited!",
        description: `${invite.inviterName} invited you to join a group.`,
      });
    };

    // Notification handler
    const notificationHandler = (notification: any) => {
      console.log("[SOCKET] Notification received:", notification);
      if (notification.type === "invitation_accepted") {
        toast({
          title: "Invitation accepted",
          description: `${notification.userName} accepted your invitation to join the group.`,
        });
      } else if (notification.type === "invitation_declined") {
        toast({
          title: "Invitation declined",
          description: `${notification.userName} declined your invitation.`,
        });
      } else {
        toast({
          title: "Notification",
          description: notification.message || "You have a new notification",
        });
      }
    };

    // Register all callbacks FIRST
    console.log("[SOCKET] Calling socketService.onMessageCount...");
    socketService.onMessageCount(messageCountHandler);
    console.log("[SOCKET] Calling socketService.onMessage...");
    socketService.onMessage(msgHandler);
    console.log("[SOCKET] Calling socketService.onTyping...");
    socketService.onTyping(typingHandler);
    console.log("[SOCKET] Calling socketService.onGroupInvite...");
    socketService.onGroupInvite(inviteHandler);
    console.log("[SOCKET] Calling socketService.onNotification...");
    socketService.onNotification(notificationHandler);
    console.log("[SOCKET] All callbacks registered");

  }, [toast, selectedConversation, currentUser]);

  // Initialize socket globally once after login (SECOND - after callbacks are registered)
  useEffect(() => {
    if (!token || !currentUser) return;
    socketService.init(token, { id: currentUser.id, name: currentUser.name, email: currentUser.email });
    // cleanup on unmount
    return () => socketService.disconnect();
  }, [token, currentUser]);

  // Join specific conversation when selected
  useEffect(() => {
    if (!token || !selectedConversation || !currentUser) return;
    socketService.connectToChat(selectedConversation, token, { id: currentUser.id, name: currentUser.name, email: currentUser.email });
  }, [token, selectedConversation, currentUser]);

  // Real-time presence for online users
  useEffect(() => {
    if (!token || !currentUser) return;

    const handleOnlineUsers = (users: any[]) => {
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
        return [...prev, { id: userId, name: user.name || `User ${userId}`, email: user.email || `${userId}@echo.chat`, isOnline: true }];
      });
    };

    const handleUserDisconnected = (user: any) => {
      setOnlineUsers((prev) => prev.map((u) => (String(u.id) === String(user.userId) ? { ...u, isOnline: false } : u)));
    };

    socketService.onOnlineUsers(handleOnlineUsers);
    socketService.onUserConnected(handleUserConnected);
    socketService.onUserDisconnected(handleUserDisconnected);

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

  // User activity tracking and smart refresh
  useEffect(() => {
    if (!currentUser) return;

    // Track user activity
    const handleUserActivity = () => {
      isUserActiveRef.current = true;
      // Reset retry count on user activity
      refreshRetryCountRef.current = 0;
    };

    // Listen for user activity events
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      document.addEventListener(event, handleUserActivity, { passive: true });
    });

    // Mark user as inactive after 5 minutes of no activity
    const inactivityTimer = setInterval(() => {
      isUserActiveRef.current = false;
    }, 5 * 60 * 1000); // 5 minutes

    // Smart refresh function with exponential backoff
    const smartRefresh = async () => {
      if (!isUserActiveRef.current) {
        // Skip refresh if user is inactive
        return;
      }

      try {
        await loadConversations();
        // Reset retry count on success
        refreshRetryCountRef.current = 0;
      } catch (error) {
        console.warn("Conversation refresh failed:", error);
        // Increment retry count for exponential backoff
        refreshRetryCountRef.current += 1;
      }
    };

    // Start initial refresh
    smartRefresh();

    // Set up interval with exponential backoff for failed requests
    const scheduleNextRefresh = () => {
      if (refreshIntervalRef.current) {
        clearTimeout(refreshIntervalRef.current);
      }

      // Base interval: 2 seconds when user is active, longer when inactive
      const baseInterval = isUserActiveRef.current ? 2000 : 30000; // 2s active, 30s inactive

      // Apply exponential backoff for failed requests
      const backoffMultiplier = Math.pow(2, Math.min(refreshRetryCountRef.current, 5)); // Max 32x multiplier
      const interval = baseInterval * backoffMultiplier;

      refreshIntervalRef.current = setTimeout(() => {
        smartRefresh();
        scheduleNextRefresh(); // Schedule next refresh
      }, interval);
    };

    scheduleNextRefresh();

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleUserActivity);
      });
      clearInterval(inactivityTimer);
      if (refreshIntervalRef.current) {
        clearTimeout(refreshIntervalRef.current);
      }
    };
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
      socketService.joinConversation(selectedConversation);
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

      // Fetch pending invitations for offline recovery
      try {
        const pendingInvites = await getPendingInvitations();
        setPendingInvitations(pendingInvites || []);
        if (pendingInvites && pendingInvites.length > 0) {
          // Show the first pending invitation
          const firstInvite = pendingInvites[0];
          setPendingInvitation(firstInvite);
          setShowInvitationModal(true);
        }
      } catch (err) {
        console.warn("Failed to fetch pending invitations:", err);
      }
    } catch (error: any) {
      throw error;
    }
  };

  const loadConversations = async () => {
    try {
      const convs = await getConversations();
      setConversations(convs);

      // Join all conversation rooms for real-time message updates
      if (token && currentUser) {
        const conversationIds = convs.map((conv: any) => conv.id);
        socketService.joinAllConversations(conversationIds);
      }

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
      // Don't update message count here - rely on server counts and socket increments
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

    // Clear typing indicator for current user
    const currentUserTimeout = typingTimeoutsRef.current.get(currentUser.name);
    if (currentUserTimeout) {
      clearTimeout(currentUserTimeout);
      typingTimeoutsRef.current.delete(currentUser.name);
      setTypingUsers(prev => prev.filter(name => name !== currentUser.name));
    }

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

    // Update conversation's last message optimistically (count will be updated when message is received)
    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === selectedConversation
          ? { ...conv, lastMessage: content, lastMessageTime: "Just now" }
          : conv
      )
    );

    try {
      // Send through WebSocket for real-time delivery
      socketService.sendMessage({ conversationId: selectedConversation, senderId: currentUser.id, senderName: currentUser.name, content, id: optimisticMessage._id, timestamp: optimisticMessage.timestamp });
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
      socketService.sendTyping(selectedConversation);
    }
  };

  const handleNewChat = () => {
    setShowNewChat(true);
  };

  const handleCreated = async (conv: any) => {
    // Refresh the entire conversations list from server to ensure consistency
    try {
      await loadConversations();
    } catch (error) {
      console.error("Failed to refresh conversations after creation:", error);
      // Fallback: manually add the conversation if refresh fails
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

      setConversations((prev) => {
        const exists = prev.find((c) => String(c.id) === String(id));
        if (exists) return prev.map((c) => (String(c.id) === String(id) ? formatted : c));
        return [formatted, ...prev];
      });
    }

    // normalize id for selecting the conversation
    const id = conv.id || conv._id;

    // auto-open the newly created conversation
    setSelectedConversation(id);

    // attempt to load messages (best-effort)
    try {
      const msgs = await getMessages(id);
      setMessages(msgs);
      // Don't update message count here - rely on server counts and socket increments
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

  const handleInvitationAccepted = async (invitationId: string) => {
    // Remove from pending invitations list
    setPendingInvitations(prev => prev.filter(inv => (inv.id || inv._id) !== invitationId && inv._id !== invitationId));
    // Refresh conversations to show the new one
    await loadConversations();
  };

  const handleInvitationDeclined = (invitationId: string) => {
    // Remove from pending invitations list
    setPendingInvitations(prev => prev.filter(inv => (inv.id || inv._id) !== invitationId && inv._id !== invitationId));
    // Just close the modal, no need to refresh conversations
    setPendingInvitation(null);
  };

  const toggleSidebar = () => {
    setShowSidebar(!showSidebar);
  };

  if (!currentUser) {
    return <AuthForm onAuth={handleAuth} />;
  }

  const currentConversation = conversations.find((c) => c.id === selectedConversation) || null;

  return (
    <div className="h-screen w-full overflow-hidden">
      {isMobile ? (
        // Mobile layout - no resizable panels
        <div className="flex h-screen w-full overflow-hidden">
          {/* Sidebar - Conversations */}
          {(showSidebar || !isMobile) && (
            <div className={`${isMobile ? "absolute inset-0 z-10" : "w-80"} border-r border-border`}>
              <SidebarConversations
                user={currentUser}
                conversations={conversations}
                currentConversationId={selectedConversation}
                onSelectConversation={setSelectedConversation}
                onDeleteConversation={handleDeleteConversation}
                onNewChat={handleNewChat}
                onLogout={handleLogout}
                isMobile={isMobile}
                onToggleSidebar={toggleSidebar}
                pendingInvitationCount={pendingInvitations.length}
                pendingInvitations={pendingInvitations}
                onInvitationResponse={handleInvitationAccepted}
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
        </div>
      ) : (
        // Desktop layout - resizable panels
        <ResizablePanelGroup direction="horizontal" className="h-screen">
          {/* Sidebar - Conversations */}
          {(showSidebar || !isMobile) && (
            <>
              <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
                <SidebarConversations
                  user={currentUser}
                  conversations={conversations}
                  currentConversationId={selectedConversation}
                  onSelectConversation={setSelectedConversation}
                  onDeleteConversation={handleDeleteConversation}
                  onNewChat={handleNewChat}
                  onLogout={handleLogout}
                  isMobile={isMobile}
                  onToggleSidebar={toggleSidebar}
                  pendingInvitationCount={pendingInvitations.length}
                  pendingInvitations={pendingInvitations}
                  onInvitationResponse={handleInvitationAccepted}
                />
              </ResizablePanel>
              <ResizableHandle withHandle />
            </>
          )}

          {/* Main Chat Area */}
          <ResizablePanel defaultSize={currentConversation ? 60 : 100} minSize={30}>
            <ResizablePanelGroup direction="horizontal">
              {/* Chat Window */}
              <ResizablePanel defaultSize={currentConversation ? 75 : 100} minSize={50}>
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
              </ResizablePanel>

              {/* Right Panel - Online Users */}
              {currentConversation && (
                <>
                  <ResizableHandle withHandle />
                  <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
                    <OnlineUsersPanel users={onlineUsers} conversation={currentConversation} />
                  </ResizablePanel>
                </>
              )}
            </ResizablePanelGroup>
          </ResizablePanel>
        </ResizablePanelGroup>
      )}

      <NewChatModal
        token={token}
        show={showNewChat}
        currentUserId={currentUserId}
        onClose={() => setShowNewChat(false)}
        onCreated={handleCreated}
      />

      {pendingInvitation && (
        <InvitationModal
          open={showInvitationModal}
          invitationId={pendingInvitation.id || pendingInvitation._id}
          inviterName={pendingInvitation.inviterName}
          conversationName={pendingInvitation.conversationName}
          onClose={() => {
            setShowInvitationModal(false);
            setPendingInvitation(null);
          }}
          onAccepted={handleInvitationAccepted}
          onDeclined={handleInvitationDeclined}
        />
      )}
    </div>
  );
};

export default Index;
