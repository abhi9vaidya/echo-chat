import { useState, useEffect } from "react";
import { Message, Conversation } from "@/types";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

interface ChatWindowProps {
  conversation: Conversation | null;
  messages: any[];
  currentUserId: string;
  onSendMessage: (content: string) => void;
  onTyping?: () => void;
  typingUsers: string[];
  isMobile?: boolean;
  onToggleSidebar?: () => void;
}



export const ChatWindow = ({
  conversation,
  messages,
  currentUserId,
  onSendMessage,
  onTyping,
  typingUsers,
  isMobile = false,
  onToggleSidebar,
}: ChatWindowProps) => {
  // controlled text state for the MessageInput
  const [text, setText] = useState("");

  // send from here so we can clear input locally
  const handleSendMessage = () => {
    const toSend = text;
    if (!toSend?.trim()) return;
    onSendMessage(toSend.trim());
    setText("");
  };

  // when conversation changes, clear local text
  useEffect(() => {
    setText("");
  }, [conversation?.id]);

  if (!conversation) {
    return (
      <div className="flex h-full items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-lg text-muted-foreground">
            Select a conversation to start chatting
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border bg-card p-4">
        {isMobile && onToggleSidebar && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onToggleSidebar}
          >
            <Menu className="h-4 w-4" />
          </Button>
        )}
        <div className="flex-1">
          <h2 className="font-semibold text-card-foreground">{conversation.title}</h2>
        </div>
      </div>

      {/* Messages */}
      <MessageList messages={messages} currentUserId={currentUserId} />

      {/* Typing Indicator */}
      {typingUsers.length > 0 && (
        <div className="px-4 py-2 text-sm text-muted-foreground">
          {typingUsers.join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing...
        </div>
      )}

      {/* Input - pass value & onChange so MessageInput is controlled */}
      <MessageInput
        value={text}
        onChange={setText}
        onSendMessage={handleSendMessage}
        onTyping={onTyping}
      />
    </div>
  );
};
