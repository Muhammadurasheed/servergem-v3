import { useState, useRef, useEffect } from "react";
import { Send, Paperclip } from "lucide-react";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
}

const ChatInput = ({ onSendMessage, disabled = false }: ChatInputProps) => {
  const [message, setMessage] = useState("");
  const [charCount, setCharCount] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Debug: Log ChatInput props and state
  useEffect(() => {
    console.log('[ChatInput] disabled prop:', disabled, 'message:', message, 'button will be disabled:', !message.trim() || disabled);
  }, [disabled, message]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 96)}px`;
    }
  }, [message]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage("");
      setCharCount(0);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newMessage = e.target.value;
    setMessage(newMessage);
    setCharCount(newMessage.length);
  };

  return (
    <div className="border-t border-[rgba(139,92,246,0.3)] bg-background/50 p-4">
      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        {/* File Upload (Future) */}
        <button
          type="button"
          className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors mb-0.5"
          aria-label="Attach file"
          disabled
          title="Coming soon: GitHub integration"
        >
          <Paperclip size={20} />
        </button>

        {/* Textarea */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask me to deploy your app..."
            disabled={disabled}
            rows={1}
            className={`
              w-full px-4 py-3 pr-12
              bg-accent/30 border border-[rgba(139,92,246,0.2)]
              rounded-xl resize-none
              text-sm text-foreground placeholder:text-muted-foreground
              focus:outline-none focus:ring-2 focus:ring-[#8b5cf6]/50 focus:border-transparent
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-all
            `}
            style={{ maxHeight: "96px" }}
          />
          {/* Character Count */}
          {charCount > 200 && (
            <span
              className={`
                absolute bottom-2 right-2 text-xs
                transition-opacity duration-200
                ${charCount > 500 ? "text-orange-500" : "text-muted-foreground"}
              `}
            >
              {charCount}
            </span>
          )}
        </div>

        {/* Send Button */}
        <button
          type="submit"
          disabled={!message.trim() || disabled}
          className={`
            p-3 rounded-xl
            bg-gradient-to-br from-[#3b82f6] to-[#8b5cf6]
            text-white font-medium
            transition-all duration-200
            disabled:opacity-50 disabled:cursor-not-allowed
            enabled:hover:scale-105 enabled:hover:shadow-[0_0_20px_rgba(139,92,246,0.6)]
            enabled:active:scale-95
          `}
          aria-label="Send message"
        >
          <Send size={20} />
        </button>
      </form>
    </div>
  );
};

export default ChatInput;
