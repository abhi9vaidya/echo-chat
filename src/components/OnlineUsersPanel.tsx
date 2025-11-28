import { useState } from "react";
import { User, Conversation } from "@/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface OnlineUsersPanelProps {
  users: User[];
  conversation: Conversation;
}

export const OnlineUsersPanel = ({ users, conversation }: OnlineUsersPanelProps) => {
  const [showMembersDialog, setShowMembersDialog] = useState(false);
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const onlineUsers = users.filter((u) => u.isOnline);

  return (
    <div className="h-full border-l border-border bg-card p-4">
      <div className="space-y-4">
        <div>
          <h3 className="mb-3 text-sm font-semibold text-foreground">
            Online Users ({onlineUsers.length})
          </h3>
          <div className="space-y-2">
            {onlineUsers.map((user) => (
              <div key={user.id} className="flex items-center gap-3">
                <div className="relative">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {getInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card bg-success" />
                </div>
                <span className="text-sm text-foreground">{user.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <h3 className="mb-2 text-sm font-semibold text-foreground">Chat Info</h3>
          <div className="space-y-1 text-sm text-muted-foreground">
            {conversation.createdAt && (
              <p>Created: {new Date(conversation.createdAt).toLocaleDateString()}</p>
            )}
            <button
              onClick={() => setShowMembersDialog(true)}
              className="text-blue-600 hover:text-blue-700 hover:underline cursor-pointer transition-colors"
            >
              Members: {conversation.participants.length}
            </button>
            {conversation.messageCount !== undefined && (
              <p>Messages: {conversation.messageCount}</p>
            )}
          </div>
        </div>
      </div>

      {/* Members Dialog */}
      <Dialog open={showMembersDialog} onOpenChange={setShowMembersDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Chat Members ({conversation.participants.length})</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {conversation.participants && conversation.participants.length > 0 ? (
              conversation.participants.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                      {getInitials(member.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="font-medium text-foreground">{member.name}</div>
                    <div className="text-xs text-muted-foreground">{member.email}</div>
                  </div>
                  {member.isOnline && (
                    <div className="flex items-center gap-1">
                      <div className="h-2 w-2 rounded-full bg-green-500"></div>
                      <span className="text-xs text-green-600">Online</span>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No members found</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
