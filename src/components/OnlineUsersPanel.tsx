import { User, Conversation } from "@/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface OnlineUsersPanelProps {
  users: User[];
  conversation: Conversation;
}

export const OnlineUsersPanel = ({ users, conversation }: OnlineUsersPanelProps) => {
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
            <p>Members: {conversation.participants.length}</p>
            {conversation.messageCount !== undefined && (
              <p>Messages: {conversation.messageCount}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
