import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Github, ExternalLink, CheckCircle2, XCircle } from 'lucide-react';
import { useGitHub } from '@/hooks/useGitHub';

export const GitHubConnect = () => {
  const { isConnected, user, connect, disconnect, isLoading } = useGitHub();
  const [tokenInput, setTokenInput] = useState('');
  const [showTokenInput, setShowTokenInput] = useState(false);

  const handleConnect = async () => {
    if (!tokenInput.trim()) {
      return;
    }
    
    const success = await connect(tokenInput.trim());
    if (success) {
      setTokenInput('');
      setShowTokenInput(false);
    }
  };

  const handleDisconnect = () => {
    if (confirm('Are you sure you want to disconnect from GitHub?')) {
      disconnect();
      setShowTokenInput(false);
    }
  };

  if (isConnected && user) {
    return (
      <Card className="border-border/50 bg-background/50 backdrop-blur">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <img 
                  src={user.avatar_url} 
                  alt={user.name}
                  className="w-12 h-12 rounded-full border-2 border-primary/20"
                />
                <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1">
                  <CheckCircle2 className="w-3 h-3 text-white" />
                </div>
              </div>
              <div>
                <CardTitle className="text-lg">{user.name}</CardTitle>
                <CardDescription>@{user.login}</CardDescription>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleDisconnect}
              className="gap-2"
            >
              <XCircle className="w-4 h-4" />
              Disconnect
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Alert className="border-green-500/20 bg-green-500/5">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <AlertDescription className="text-sm">
              Connected to GitHub. You can now deploy repositories to Cloud Run.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 bg-background/50 backdrop-blur">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Github className="w-5 h-5" />
          Connect to GitHub
        </CardTitle>
        <CardDescription>
          Connect your GitHub account to deploy repositories to Google Cloud Run
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!showTokenInput ? (
          <div className="space-y-4">
            <Alert>
              <AlertDescription className="text-sm space-y-2">
                <p className="font-medium">You'll need a GitHub Personal Access Token with these permissions:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li><code className="text-xs bg-muted px-1 py-0.5 rounded">repo</code> - Full control of private repositories</li>
                  <li><code className="text-xs bg-muted px-1 py-0.5 rounded">read:user</code> - Read user profile data</li>
                </ul>
              </AlertDescription>
            </Alert>
            
            <div className="flex gap-2">
              <Button 
                className="flex-1 gap-2" 
                onClick={() => setShowTokenInput(true)}
              >
                <Github className="w-4 h-4" />
                Connect with Token
              </Button>
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => window.open('https://github.com/settings/tokens/new?scopes=repo,read:user&description=ServerGem%20Deployment', '_blank')}
                title="Create GitHub Token"
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="github-token">GitHub Personal Access Token</Label>
              <Input
                id="github-token"
                type="password"
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isLoading) {
                    handleConnect();
                  }
                }}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                Your token is stored securely in your browser's local storage
              </p>
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={handleConnect} 
                disabled={!tokenInput.trim() || isLoading}
                className="flex-1"
              >
                {isLoading ? 'Connecting...' : 'Connect'}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowTokenInput(false);
                  setTokenInput('');
                }}
                disabled={isLoading}
              >
                Cancel
              </Button>
            </div>

            <Button 
              variant="link" 
              size="sm"
              className="w-full gap-1 text-xs"
              onClick={() => window.open('https://github.com/settings/tokens/new?scopes=repo,read:user&description=ServerGem%20Deployment', '_blank')}
            >
              <ExternalLink className="w-3 h-3" />
              Create a new token on GitHub
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
