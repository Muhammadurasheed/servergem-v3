import { useState, useEffect, useRef } from "react";
import { X, Minus, Sparkles, Copy, Check } from "lucide-react";
import confetti from "canvas-confetti";
import ChatMessage from "./ChatMessage";
import ChatInput from "./ChatInput";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  actions?: Array<{ label: string; onClick: () => void }>;
  deploymentUrl?: string;
}

interface ChatWindowProps {
  onClose: () => void;
}

const ChatWindow = ({ onClose }: ChatWindowProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const triggerConfetti = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#3b82f6", "#8b5cf6", "#06b6d4"],
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleSendMessage = async (content: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    // Demo flow simulation
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `Hi! 👋 I'm ServerGem, your AI deployment assistant.\n\nI'll help you deploy your Node.js API to Cloud Run in minutes.\n\nFirst, I need access to your code. You can:\n1. 📁 Upload your project folder\n2. 🔗 Connect your GitHub repository\n3. 📋 Paste your repository URL\n\nWhich option works for you?`,
        timestamp: new Date(),
        actions: [
          { label: "📁 Upload Project", onClick: () => handleGitHubConnect() },
          { label: "🔗 Connect GitHub", onClick: () => handleGitHubConnect() },
          { label: "📋 Paste URL", onClick: () => handleGitHubConnect() },
        ],
      };
      setMessages((prev) => [...prev, aiMessage]);
      setIsLoading(false);
    }, 200);
  };

  const handleGitHubConnect = () => {
    const userAction: Message = {
      id: Date.now().toString(),
      role: "user",
      content: "Connect GitHub repository",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userAction]);
    setIsLoading(true);

    setTimeout(() => {
      const analysisMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `Perfect! I'm analyzing your repository...\n\n✓ Framework detected: **Express.js v4.18**\n✓ Entry point: \`src/server.js\`\n✓ Dependencies: 12 packages\n✓ Database: **PostgreSQL** (via pg package)\n⚠️ No Dockerfile found (I'll create one)\n⚠️ Environment variables detected (.env file)\n\nYour app looks ready to deploy! I noticed you're using PostgreSQL.\n\nFor production on Cloud Run, I recommend:\n- **Cloud SQL** (managed PostgreSQL)\n- Automatic backups & high availability\n- ~$10/month for starter tier\n\nShould I set this up for you?`,
        timestamp: new Date(),
        actions: [
          { label: "✅ Yes, set up Cloud SQL", onClick: () => handleCloudSQLSetup() },
          { label: "❌ No, I'll use my own DB", onClick: () => handleCloudSQLSetup() },
        ],
      };
      setMessages((prev) => [...prev, analysisMessage]);
      setIsLoading(false);
    }, 500);
  };

  const handleCloudSQLSetup = () => {
    const userAction: Message = {
      id: Date.now().toString(),
      role: "user",
      content: "Yes, set up Cloud SQL",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userAction]);
    setIsLoading(true);

    setTimeout(() => {
      const progressMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `Great choice! I'm configuring everything now... 🚀\n\n[✓] Creating Cloud SQL instance (my-nodejs-db)\n[✓] Generating optimized Dockerfile\n[✓] Configuring Secret Manager for credentials\n[⏳] Building container image...\n[⏳] Deploying to Cloud Run...\n\nThis usually takes 2-3 minutes. Hang tight!`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, progressMessage]);

      setTimeout(() => {
        triggerConfetti();
        const successMessage: Message = {
          id: (Date.now() + 2).toString(),
          role: "assistant",
          content: `🎉 **Deployment Successful!**\n\nYour API is live at:\n\nI've configured:\n✅ Auto HTTPS\n✅ Database connection (secure via Cloud SQL proxy)\n✅ Auto-scaling (0-10 instances)\n✅ Health checks\n✅ Monitoring & logging\n\n**What's next?**\n- Test your endpoints\n- Set up CI/CD for automatic deployments\n- Add a custom domain\n- Configure monitoring alerts\n\nTry your API now, or ask me anything!`,
          timestamp: new Date(),
          deploymentUrl: "https://my-api-abc123.run.app",
          actions: [
            { label: "📊 View Deployment Logs", onClick: () => {} },
            { label: "🔄 Set Up CI/CD", onClick: () => {} },
            { label: "🌐 Add Custom Domain", onClick: () => {} },
          ],
        };
        setMessages((prev) => [...prev, successMessage]);
        setIsLoading(false);
      }, 2000);
    }, 1000);
  };

  const handleQuickAction = (action: string) => {
    handleSendMessage(action);
  };

  return (
    <div
      className={`
        fixed bottom-5 right-5 z-40
        w-full max-w-[400px] 
        ${isMinimized ? 'h-[60px]' : 'h-[600px] min-h-[400px]'}
        bg-background/95 backdrop-blur-xl
        border border-[rgba(139,92,246,0.3)]
        rounded-2xl shadow-2xl
        flex flex-col
        animate-in slide-in-from-bottom-4 fade-in duration-300
        md:w-[400px]
      `}
    >
      {/* Header */}
      <div className="relative border-b border-[rgba(139,92,246,0.3)] bg-gradient-to-r from-[#8b5cf6]/10 to-[#06b6d4]/10">
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-[#8b5cf6] to-[#06b6d4]" />
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Sparkles className="w-6 h-6 text-[#8b5cf6]" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-background animate-pulse" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">ServerGem AI Assistant</h3>
              <p className="text-xs text-muted-foreground">Online • Ready to help</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-2 hover:bg-accent rounded-lg transition-colors"
              aria-label="Minimize"
            >
              <Minus size={18} />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-accent rounded-lg transition-colors"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Messages Container */}
      {!isMinimized && (
        <>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#3b82f6] to-[#8b5cf6] flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h4 className="text-lg font-semibold mb-2">Welcome to ServerGem!</h4>
                  <p className="text-sm text-muted-foreground mb-6">
                    I can help you deploy to Cloud Run in minutes.
                  </p>
                </div>
                <div className="space-y-2 w-full max-w-xs">
                  <button
                    onClick={() => handleQuickAction("Deploy a Flask app")}
                    className="w-full px-4 py-3 bg-accent/50 hover:bg-accent rounded-lg text-sm font-medium transition-colors text-left"
                  >
                    🐍 Deploy a Flask app
                  </button>
                  <button
                    onClick={() => handleQuickAction("Fix a deployment error")}
                    className="w-full px-4 py-3 bg-accent/50 hover:bg-accent rounded-lg text-sm font-medium transition-colors text-left"
                  >
                    🔧 Fix a deployment error
                  </button>
                  <button
                    onClick={() => handleQuickAction("Set up CI/CD")}
                    className="w-full px-4 py-3 bg-accent/50 hover:bg-accent rounded-lg text-sm font-medium transition-colors text-left"
                  >
                    🚀 Set up CI/CD
                  </button>
                </div>
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <div key={message.id}>
                    <ChatMessage message={message} />
                    {message.deploymentUrl && (
                      <div className="flex items-center gap-2 mb-4 ml-10">
                        <code className="flex-1 px-3 py-2 bg-accent/30 border border-[rgba(139,92,246,0.2)] rounded-lg text-sm text-[#06b6d4] font-mono">
                          {message.deploymentUrl}
                        </code>
                        <button
                          onClick={() => copyToClipboard(message.deploymentUrl!)}
                          className="p-2 bg-accent/50 hover:bg-accent rounded-lg transition-colors"
                          aria-label="Copy URL"
                        >
                          {copiedUrl ? (
                            <Check size={16} className="text-green-500" />
                          ) : (
                            <Copy size={16} />
                          )}
                        </button>
                      </div>
                    )}
                    {message.actions && (
                      <div className="flex flex-wrap gap-2 mb-4 ml-10">
                        {message.actions.map((action, idx) => (
                          <button
                            key={idx}
                            onClick={action.onClick}
                            className="px-4 py-2 bg-accent/50 hover:bg-accent rounded-lg text-sm font-medium transition-colors"
                          >
                            {action.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {isLoading && (
                  <div className="flex items-start gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#8b5cf6] to-[#06b6d4] flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <div className="bg-[rgba(30,41,59,0.8)] border border-[rgba(139,92,246,0.3)] rounded-2xl rounded-tl-sm px-4 py-3">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-[#8b5cf6] rounded-full animate-pulse" style={{ animationDelay: '0s' }} />
                        <span className="w-2 h-2 bg-[#8b5cf6] rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                        <span className="w-2 h-2 bg-[#8b5cf6] rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input Area */}
          <ChatInput onSendMessage={handleSendMessage} disabled={isLoading} />
        </>
      )}
    </div>
  );
};

export default ChatWindow;
