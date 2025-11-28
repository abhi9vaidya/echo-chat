// src/components/MessageBubble.tsx
import React from "react";

interface MessageBubbleProps {
  message: any;
  currentUserId: string;
}

/**
 * Behavior:
 * - Determine senderId from message.sender (string) or message.sender.id/_id (object).
 * - isMine = senderId === currentUserId
 * - For incoming (!isMine): show sender name above bubble (message.sender?.name or message.sender if string or "Unknown")
 * - Align messages: justify-end for mine, justify-start otherwise
 * - Outgoing bubble: rounded-2xl, bg-blue-600 text-white
 * - Incoming bubble: rounded-2xl, bg-white text-gray-900 border
 * - Timestamp: HH:MM (local) if createdAt present, "Sending..." for optimistic messages (message._temp), else empty
 * - Defensive: optional chaining + fallbacks everywhere
 */

const MessageBubble = ({ message, currentUserId }: MessageBubbleProps) => {
  const senderRaw = message?.sender;
  let senderId: string | null = null;
  let senderName: string | null = null;

  if (typeof senderRaw === "string") {
    senderId = senderRaw;
    senderName = message?.senderName || senderRaw;
  } else if (senderRaw && typeof senderRaw === "object") {
    // support both _id and id
    senderId = senderRaw._id || senderRaw.id || null;
    senderName = senderRaw.name || senderRaw.displayName || message?.senderName || null;
  } else {
    // fallback to any explicit fields
    senderId = message?.senderId || null;
    senderName = message?.senderName || null;
  }

  // final fallback names
  const nameToShow =
    senderName ||
    (senderId && String(senderId) === String(currentUserId) ? "You" : "Unknown");

  const isMine = Boolean(senderId && String(senderId) === String(currentUserId));

  // determine timestamp label
  const timeLabel = (() => {
    if (message?._temp) return "Sending...";
    const created = message?.createdAt || message?.created_at || message?.timestamp;
    if (!created) return "";
    try {
      const d = typeof created === "string" || typeof created === "number" ? new Date(created) : created;
      if (isNaN(d.getTime())) return "";
      const hh = String(d.getHours()).padStart(2, "0");
      const mm = String(d.getMinutes()).padStart(2, "0");
      return `${hh}:${mm}`;
    } catch {
      return "";
    }
  })();

  return (
    <div className={`flex ${isMine ? "justify-end" : "justify-start"} px-4 py-1`}>
      <div className="max-w-[72%]">
        {/* sender name for incoming messages */}
        {!isMine && (
          <div className="text-xs font-medium text-muted-foreground mb-1 ml-2">
            {nameToShow}
          </div>
        )}

        <div
          className={`px-4 py-2 rounded-2xl break-words ${
            isMine
              ? "bg-blue-600 text-white self-end"
              : "bg-white text-gray-900 border border-gray-200 self-start"
          }`}
        >
          <div className="text-sm">{message?.content ?? ""}</div>
        </div>

        {timeLabel && (
          <div
            className={`text-xs mt-1 ${
              isMine ? "text-right text-muted-foreground" : "text-left text-muted-foreground ml-2"
            }`}
          >
            {timeLabel}
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
