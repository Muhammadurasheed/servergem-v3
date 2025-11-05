import Hero from "@/components/Hero";
import Features from "@/components/Features";
import HowItWorks from "@/components/HowItWorks";
import Architecture from "@/components/Architecture";
import CTA from "@/components/CTA";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Hero />
      <Features />
      <HowItWorks />
      <Architecture />
      <CTA />
      <Footer />
    </div>
  );
};

export default Index;
