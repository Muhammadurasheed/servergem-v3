import { useState } from 'react';
import { GitHubConnect } from '@/components/GitHubConnect';
import { RepoSelector } from '@/components/RepoSelector';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Rocket, ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useGitHub } from '@/hooks/useGitHub';

const Deploy = () => {
  const navigate = useNavigate();
  const { isConnected } = useGitHub();
  const [selectedRepo, setSelectedRepo] = useState<{ url: string; branch: string } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleSelectRepo = async (repoUrl: string, branch: string) => {
    setSelectedRepo({ url: repoUrl, branch });
    setIsAnalyzing(true);
    
    // Simulate analysis - in production, this would trigger WebSocket message
    toast.success(`Selected: ${repoUrl}`);
    toast.info('Analysis will be available when backend is connected');
    
    // TODO: Send to backend via WebSocket
    // const message = `Analyze and deploy: ${repoUrl} (branch: ${branch})`;
    // sendMessage(message);
    
    setTimeout(() => {
      setIsAnalyzing(false);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <div className="border-b border-border/50 bg-background/50 backdrop-blur-xl sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/')}
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
              <div className="flex items-center gap-2">
                <Rocket className="w-6 h-6 text-primary" />
                <h1 className="text-2xl font-bold">Deploy to Cloud Run</h1>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Progress Steps */}
          <Card className="border-border/50 bg-background/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-lg">Deployment Steps</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isConnected ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'}`}>
                    {isConnected ? <CheckCircle2 className="w-5 h-5" /> : '1'}
                  </div>
                  <span className={`text-sm ${isConnected ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                    Connect GitHub
                  </span>
                </div>
                <div className="flex-1 h-[2px] bg-border" />
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${selectedRepo ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'}`}>
                    {selectedRepo ? <CheckCircle2 className="w-5 h-5" /> : '2'}
                  </div>
                  <span className={`text-sm ${selectedRepo ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                    Select Repository
                  </span>
                </div>
                <div className="flex-1 h-[2px] bg-border" />
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center">
                    3
                  </div>
                  <span className="text-sm text-muted-foreground">
                    Deploy
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* GitHub Connection */}
          <GitHubConnect />

          {/* Repository Selector */}
          {isConnected && <RepoSelector onSelectRepo={handleSelectRepo} />}

          {/* Analysis Status */}
          {isAnalyzing && (
            <Alert className="border-primary/20 bg-primary/5">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <AlertDescription>
                Analyzing repository structure and dependencies...
              </AlertDescription>
            </Alert>
          )}

          {/* Selected Repository Info */}
          {selectedRepo && !isAnalyzing && (
            <Card className="border-green-500/20 bg-green-500/5">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  Repository Selected
                </CardTitle>
                <CardDescription>
                  {selectedRepo.url} (branch: {selectedRepo.branch})
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Alert>
                  <AlertDescription className="text-sm">
                    <strong>Next Step:</strong> Connect the backend WebSocket to analyze this repository with Gemini ADK and generate a Dockerfile.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          )}

          {/* Help Card */}
          <Card className="border-border/50 bg-background/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-lg">Need Help?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                <strong>Step 1:</strong> Connect your GitHub account using a Personal Access Token
              </p>
              <p>
                <strong>Step 2:</strong> Select the repository you want to deploy
              </p>
              <p>
                <strong>Step 3:</strong> ServerGem will analyze your code, generate a Dockerfile, and deploy to Cloud Run
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Deploy;
