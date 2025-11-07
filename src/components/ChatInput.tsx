import { useState, useRef, useEffect } from "react";
import { Send, Paperclip } from "lucide-react";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
}

const ChatInput = ({ onSendMessage, disabled = false }: ChatInputProps) => {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 96)}px`;
    }
  }, [message]);

  const handleSend = () => {
    console.log('[ChatInput] handleSend - message:', message, 'disabled:', disabled);
    const trimmed = message.trim();
    if (trimmed && !disabled) {
      console.log('[ChatInput] Sending message:', trimmed);
      onSendMessage(trimmed);
      setMessage("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    } else {
      console.log('[ChatInput] Send blocked - empty or disabled');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    console.log('[ChatInput] Input changed:', newValue.substring(0, 50));
    setMessage(newValue);
  };

  const isButtonDisabled = !message.trim() || disabled;
  console.log('[ChatInput] Render - message length:', message.length, 'disabled:', disabled, 'buttonDisabled:', isButtonDisabled);

  return (
    <div className="border-t border-border/50 bg-background/50 p-4">
      <div className="flex items-end gap-2">
        {/* File Upload (Future) */}
        <button
          type="button"
          className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors mb-0.5 flex-shrink-0"
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
            onChange={handleInputChange}
            onKeyDown={handleKeyPress}
            placeholder="Ask me to deploy your app..."
            disabled={disabled}
            rows={1}
            className="
              w-full px-4 py-3 pr-12
              bg-accent/30 border border-border/50
              rounded-xl resize-none
              text-sm text-foreground placeholder:text-muted-foreground
              focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-all
            "
            style={{ maxHeight: "96px" }}
          />
        </div>

        {/* Send Button */}
        <button
          type="button"
          onClick={handleSend}
          disabled={isButtonDisabled}
          className="
            p-3 rounded-xl flex-shrink-0
            bg-gradient-to-br from-[#3b82f6] to-[#8b5cf6]
            text-white font-medium
            transition-all duration-200
            disabled:opacity-50 disabled:cursor-not-allowed
            hover:enabled:scale-105 hover:enabled:shadow-lg
            active:enabled:scale-95
          "
          aria-label="Send message"
        >
          <Send size={20} />
        </button>
      </div>
    </div>
  );
};

export default ChatInput;
