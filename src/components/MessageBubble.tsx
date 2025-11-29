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

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const messageDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());

      // Format time in 12-hour format
      const hours = d.getHours();
      const minutes = String(d.getMinutes()).padStart(2, "0");
      const ampm = hours >= 12 ? "PM" : "AM";
      const displayHours = hours % 12 || 12;
      const timeStr = `${displayHours}:${minutes} ${ampm}`;

      // Determine date part
      const diffDays = Math.floor((today.getTime() - messageDate.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        // Today - just show time
        return timeStr;
      } else if (diffDays === 1) {
        // Yesterday
        return `Yesterday ${timeStr}`;
      } else if (diffDays < 7) {
        // Within this week - show day name
        const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        return `${dayNames[d.getDay()]} ${timeStr}`;
      } else {
        // Older - show date
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const month = monthNames[d.getMonth()];
        const day = d.getDate();
        return `${month} ${day} ${timeStr}`;
      }
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
              ? "bg-primary text-primary-foreground self-end"
              : "bg-background text-foreground border border-border self-start"
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
