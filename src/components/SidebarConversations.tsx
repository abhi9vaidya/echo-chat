import { Conversation, User } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Menu, MoreVertical, Trash2, MessageSquare, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { ProfileSection } from "@/components/ProfileSection";
import UpdatesPanel from "@/components/UpdatesPanel";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// Utility function to format conversation timestamps
const formatConversationTime = (timeString: string): string => {
  if (!timeString || timeString === "Just now") return timeString;

  try {
    const date = new Date(timeString);
    if (isNaN(date.getTime())) return timeString;

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;

    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) {
      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      return dayNames[date.getDay()];
    }

    // For older messages, show date
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${monthNames[date.getMonth()]} ${date.getDate()}`;
  } catch {
    return timeString;
  }
};

interface SidebarConversationsProps {
  user?: User;
  conversations: Conversation[];
  currentConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onDeleteConversation?: (id: string) => void;
  onNewChat: () => void;
  onLogout?: () => void;
  isMobile?: boolean;
  onToggleSidebar?: () => void;
  pendingInvitationCount?: number;
  pendingInvitations?: any[];
  onInvitationResponse?: (invitationId: string, accepted: boolean) => void;
}

export const SidebarConversations = ({
  user,
  conversations,
  currentConversationId,
  onSelectConversation,
  onDeleteConversation,
  onNewChat,
  onLogout,
  isMobile = false,
  onToggleSidebar,
  pendingInvitationCount = 0,
  pendingInvitations = [],
  onInvitationResponse,
}: SidebarConversationsProps) => {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="flex h-full flex-col bg-sidebar">
      {/* Profile Section */}
      {user && <ProfileSection user={user} onLogout={onLogout || (() => {})} pendingInvitationCount={pendingInvitationCount} />}

      {/* Header */}
      <div className="flex items-center justify-between border-b border-border p-4">
        <h2 className="text-lg font-semibold text-sidebar-foreground">Chats</h2>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={onNewChat}
            className="hover:bg-sidebar-hover"
          >
            <Plus className="h-4 w-4" />
          </Button>
          {isMobile && onToggleSidebar && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onToggleSidebar}
              className="hover:bg-sidebar-hover"
            >
              <Menu className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Updates/Invitations Section */}
      {pendingInvitations.length > 0 && (
        <div className="border-b border-border">
          <div className="px-4 py-2 flex items-center gap-2 bg-accent">
            <Badge className="bg-primary text-primary-foreground">{pendingInvitations.length}</Badge>
            <span className="text-sm font-semibold text-accent-foreground">New Invitations</span>
          </div>
          <UpdatesPanel
            pendingInvitations={pendingInvitations}
            onInvitationResponse={onInvitationResponse}
          />
        </div>
      )}

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mb-4">
              <MessageSquare className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-sm font-medium text-foreground mb-1">No conversations yet</h3>
            <p className="text-xs text-muted-foreground mb-4">Start a new chat to get started</p>
            <Button
              onClick={onNewChat}
              size="sm"
              className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Chat
            </Button>
          </div>
        ) : (
          conversations.map((conv) => (
            <div
              key={conv.id}
              className={cn(
                "group relative border-b border-border transition-all duration-200 hover:bg-accent/50",
                currentConversationId === conv.id && "bg-accent border-primary/20"
              )}
            >
              <button
                onClick={() => onSelectConversation(conv.id)}
                className="w-full p-4 text-left transition-all duration-200"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 overflow-hidden">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-md flex-shrink-0">
                      <MessageSquare className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 overflow-hidden min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className={cn(
                          "truncate font-medium transition-colors",
                          currentConversationId === conv.id ? "text-foreground" : "text-muted-foreground"
                        )}>
                          {conv.title}
                        </h3>
                        {conv.isOnline && (
                          <span className="h-2 w-2 rounded-full bg-success animate-pulse flex-shrink-0" />
                        )}
                      </div>
                      {conv.lastMessageTime && (
                        <p className="text-xs text-muted-foreground mb-1">
                          {formatConversationTime(conv.lastMessageTime)}
                        </p>
                      )}
                      {conv.lastMessage && (
                        <p className="truncate text-sm text-muted-foreground">
                          {conv.lastMessage}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    {conv.unreadCount > 0 && (
                      <Badge className="h-5 min-w-[20px] px-1.5 bg-primary text-primary-foreground text-xs font-medium rounded-full">
                        {conv.unreadCount}
                      </Badge>
                    )}
                  </div>
                </div>
              </button>
              {onDeleteConversation && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-destructive/10 hover:text-destructive rounded-lg"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="rounded-xl">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Conversation</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete "{conv.title}"? This action cannot be undone and all messages will be permanently removed.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="rounded-lg">Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => onDeleteConversation(conv.id)}
                        className="bg-destructive hover:bg-destructive/90 rounded-lg"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
