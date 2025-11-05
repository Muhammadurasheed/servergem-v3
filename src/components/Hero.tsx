import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,hsl(217_91%_60%/0.15),transparent_50%)] animate-glow" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,hsl(280_70%_60%/0.1),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,hsl(180_85%_55%/0.1),transparent_50%)]" />
      
      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(hsl(var(--border))_1px,transparent_1px),linear-gradient(90deg,hsl(var(--border))_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,#000,transparent)]" />
      
      <div className="container relative z-10 mx-auto px-6 py-32">
        <div className="mx-auto max-w-5xl text-center space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 backdrop-blur-sm">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Powered by Google ADK & AI Studio</span>
          </div>
          
          {/* Main heading */}
          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold leading-tight">
            <span className="gradient-text">Deploy to Cloud Run</span>
            <br />
            <span className="text-foreground">in 3 Minutes</span>
          </h1>
          
          {/* Tagline */}
          <p className="text-xl sm:text-2xl md:text-3xl text-muted-foreground font-light max-w-3xl mx-auto">
            Stop fighting YAML. Start shipping code.
          </p>
          
          {/* Description */}
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Your AI pair programmer for serverless excellence. Multi-agent intelligence that analyzes, containerizes, and deploys your apps—no Docker expertise required.
          </p>
          
          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
            <Button 
              size="lg" 
              className="text-lg px-8 py-6 bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-opacity group"
            >
              Try ServerGem Free
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="text-lg px-8 py-6 border-primary/30 hover:bg-primary/10"
            >
              Watch 3-Min Demo
            </Button>
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pt-16 max-w-3xl mx-auto">
            {[
              { value: "3 min", label: "Average Deploy Time" },
              { value: "6", label: "AI Agents" },
              { value: "95%+", label: "Success Rate" },
              { value: "10+", label: "Auto-Fixed Errors" }
            ].map((stat, index) => (
              <div key={index} className="space-y-2">
                <div className="text-3xl md:text-4xl font-bold gradient-text">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Floating elements */}
      <div className="absolute bottom-20 left-10 w-20 h-20 bg-primary/20 rounded-full blur-3xl animate-float" />
      <div className="absolute top-40 right-20 w-32 h-32 bg-secondary/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
      <div className="absolute top-60 left-1/4 w-24 h-24 bg-accent/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '4s' }} />
    </section>
  );
};

export default Hero;
