import { useState } from "react";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import HowItWorks from "@/components/HowItWorks";
import Architecture from "@/components/Architecture";
import CTA from "@/components/CTA";
import Footer from "@/components/Footer";
import ChatWidget from "@/components/ChatWidget";
import Navbar from "@/components/Navbar";

const Index = () => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [initialMessage, setInitialMessage] = useState<string | undefined>();
  const [unreadCount] = useState(0);

  const handleCTAClick = (message: string) => {
    setInitialMessage(message);
    setIsChatOpen(true);
  };

  const handleChatToggle = () => {
    setIsChatOpen(!isChatOpen);
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <Hero onCTAClick={handleCTAClick} />
      <Features onAgentClick={handleCTAClick} />
      <HowItWorks onCTAClick={handleCTAClick} />
      <Architecture />
      <CTA onCTAClick={handleCTAClick} />
      <Footer />
      <ChatWidget
        isOpen={isChatOpen}
        onToggle={handleChatToggle}
        initialMessage={initialMessage}
        unreadCount={unreadCount}
      />
    </div>
  );
};

export default Index;
