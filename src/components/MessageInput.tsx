import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";
import { useRef, useEffect } from "react";

interface MessageInputProps {
  onSendMessage: () => void;
  onTyping?: () => void;
  disabled?: boolean;
  value: string;
  onChange: (value: string) => void;
}

export const MessageInput = ({
  onSendMessage,
  onTyping,
  disabled = false,
  value,
  onChange,
}: MessageInputProps) => {
  const typingTimeoutRef = useRef<number | null>(null);
  const lastTypingTimeRef = useRef<number>(0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim() && !disabled) {
      onSendMessage();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    
    // Throttle typing events - only send once per 1 second
    const now = Date.now();
    if (now - lastTypingTimeRef.current > 1000) {
      onTyping?.();
      lastTypingTimeRef.current = now;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !disabled) {
        onSendMessage();
      }
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return (
    <form onSubmit={handleSubmit} className="border-t border-gray-200 bg-white/80 backdrop-blur-sm p-4 shadow-lg">
      <div className="flex items-end gap-3">
        <div className="flex-1 relative">
          <Input
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            disabled={disabled}
            className="pr-12 h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 rounded-xl bg-gray-50/50 backdrop-blur-sm"
          />

        </div>
        <Button
          type="submit"
          disabled={disabled || !value.trim()}
          className="h-11 w-11 p-0 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>

    </form>
  );
};
