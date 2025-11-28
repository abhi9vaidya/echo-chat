import { Conversation } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Menu, MoreVertical, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
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

interface SidebarConversationsProps {
  conversations: Conversation[];
  currentConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onDeleteConversation?: (id: string) => void;
  onNewChat: () => void;
  onLogout?: () => void;
  isMobile?: boolean;
  onToggleSidebar?: () => void;
}

export const SidebarConversations = ({
  conversations,
  currentConversationId,
  onSelectConversation,
  onDeleteConversation,
  onNewChat,
  onLogout,
  isMobile = false,
  onToggleSidebar,
}: SidebarConversationsProps) => {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="flex h-full flex-col bg-sidebar">
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
          <div className="relative">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowMenu(!showMenu)}
              className="hover:bg-sidebar-hover"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
            {showMenu && (
              <div className="absolute right-0 mt-2 w-40 bg-white border rounded shadow z-50">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button
                      className="block w-full text-left px-4 py-2 text-red-600 hover:bg-gray-100"
                    >
                      Logout
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure you want to logout?</AlertDialogTitle>
                      <AlertDialogDescription>
                        You will be logged out of your account and redirected to the login page.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel onClick={() => setShowMenu(false)}>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => { onLogout?.(); setShowMenu(false); }} className="bg-red-600 hover:bg-red-700">
                        Logout
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </div>
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

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {conversations.map((conv) => (
          <div
            key={conv.id}
            className={cn(
              "group relative border-b border-border transition-colors hover:bg-sidebar-hover",
              currentConversationId === conv.id && "bg-accent"
            )}
          >
            <button
              onClick={() => onSelectConversation(conv.id)}
              className="w-full p-4 text-left"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 overflow-hidden">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate font-medium text-sidebar-foreground">
                      {conv.title}
                    </h3>
                    {conv.isOnline && (
                      <span className="h-2 w-2 rounded-full bg-success" />
                    )}
                  </div>
                  {conv.lastMessage && (
                    <p className="truncate text-sm text-muted-foreground">
                      {conv.lastMessage}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1">
                  {conv.lastMessageTime && (
                    <span className="text-xs text-muted-foreground">
                      {conv.lastMessageTime}
                    </span>
                  )}
                  {conv.unreadCount > 0 && (
                    <Badge variant="default" className="h-5 min-w-[20px] px-1">
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
                    className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-100 hover:text-red-600"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Conversation</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete "{conv.title}"? This action cannot be undone and all messages will be permanently removed.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => onDeleteConversation(conv.id)}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
