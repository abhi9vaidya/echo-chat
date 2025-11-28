import { useState, useEffect } from "react";
import { Message, Conversation } from "@/types";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { Button } from "@/components/ui/button";
import { Menu, Hash, MessageCircle } from "lucide-react";

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
      <div className="flex h-full items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg">
              <MessageCircle className="h-10 w-10 text-white" />
            </div>
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Welcome to Echo</h3>
            <p className="text-gray-600 max-w-sm">
              Select a conversation from the sidebar to start chatting with your classmates in real time
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-gray-200 bg-white/80 backdrop-blur-sm p-4 shadow-sm">
        {isMobile && onToggleSidebar && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onToggleSidebar}
            className="hover:bg-gray-100"
          >
            <Menu className="h-4 w-4" />
          </Button>
        )}
        <div className="flex items-center gap-3 flex-1">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-md">
            <Hash className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">{conversation.title}</h2>
          </div>
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
