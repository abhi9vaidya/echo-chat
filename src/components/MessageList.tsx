import React from "react";
import { useEffect, useRef } from "react";
import MessageBubble from "./MessageBubble";

interface MessageListProps {
  messages: any[];
  currentUserId: string;
}

export const MessageList = ({ messages = [], currentUserId }: MessageListProps) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="flex flex-col gap-4">
        {messages.map((msg) => {
          const key = msg._id || msg.id || `${msg._temp ? "temp-" : "msg-"}${Math.random()}`;
          return (
            <MessageBubble
              key={key}
              message={msg}
              currentUserId={currentUserId}
            />
          );
        })}
      </div>
      <div ref={bottomRef} />
    </div>
  );
};

export default MessageList;
