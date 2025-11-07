/**
 * Authentication Page - ServerGem Login
 * Simplified flow: GitHub OAuth (primary) and Email (fallback)
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useGitHub } from '@/hooks/useGitHub';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Loader2, Sparkles, Github, Mail, ArrowRight } from 'lucide-react';
import Logo from '@/components/Logo';

const Auth = () => {
  const navigate = useNavigate();
  const { signIn, signUp, loading: authLoading } = useAuth();
  const { connect: connectGitHub, isLoading: githubLoading } = useGitHub();
  
  const [githubToken, setGithubToken] = useState('');
  const [showGithubInput, setShowGithubInput] = useState(false);
  
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpName, setSignUpName] = useState('');

  const handleGitHubAuth = async () => {
    if (!githubToken.trim()) {
      toast.error('Please enter your GitHub token');
      return;
    }
    
    const success = await connectGitHub(githubToken.trim());
    if (success) {
      // Also create/sign in user session
      await signIn(`github-${Date.now()}@servergem.app`, githubToken.substring(0, 20));
      toast.success('✅ Connected to ServerGem with GitHub!');
      navigate('/deploy');
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await signIn(signInEmail, signInPassword);
      toast.success('Welcome back to ServerGem!');
      navigate('/deploy');
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign in');
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await signUp(signUpEmail, signUpPassword, signUpName);
      toast.success('🎉 Account created! Welcome to ServerGem!');
      navigate('/deploy');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create account');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo Header */}
        <div className="text-center mb-8 space-y-2">
          <div className="flex items-center justify-center gap-3 mb-3">
            <Logo size={56} />
            <span className="text-4xl font-bold gradient-text">ServerGem</span>
          </div>
          <h1 className="text-2xl font-semibold text-foreground">Deploy in 3 Minutes</h1>
          <p className="text-muted-foreground">
            No Google Cloud setup required • AI-powered deployments
          </p>
        </div>

        {/* Auth Card */}
        <Card className="border-border/50 bg-background/50 backdrop-blur shadow-2xl">
          <CardHeader className="space-y-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Sparkles className="w-5 h-5 text-primary" />
                Get Started with ServerGem
              </CardTitle>
              <CardDescription className="mt-2">
                Connect your GitHub or create an account
              </CardDescription>
            </div>

            {/* GitHub OAuth (Primary) */}
            {!showGithubInput ? (
              <div className="space-y-3">
                <Button 
                  onClick={() => setShowGithubInput(true)}
                  className="w-full h-12 gap-2 bg-[#24292e] hover:bg-[#2f363d] text-white"
                  size="lg"
                >
                  <Github className="w-5 h-5" />
                  Continue with GitHub
                  <ArrowRight className="w-4 h-4 ml-auto" />
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  Recommended • Clone private repos • Deploy instantly
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="github-token">GitHub Personal Access Token</Label>
                  <Input
                    id="github-token"
                    type="password"
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                    value={githubToken}
                    onChange={(e) => setGithubToken(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !githubLoading) {
                        handleGitHubAuth();
                      }
                    }}
                    disabled={githubLoading}
                  />
                  <p className="text-xs text-muted-foreground">
                    Need repo and read:user scopes •{' '}
                    <a 
                      href="https://github.com/settings/tokens/new?scopes=repo,read:user&description=ServerGem%20Deployment"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Create token
                    </a>
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={handleGitHubAuth}
                    disabled={!githubToken.trim() || githubLoading}
                    className="flex-1"
                  >
                    {githubLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      'Connect GitHub'
                    )}
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setShowGithubInput(false);
                      setGithubToken('');
                    }}
                    disabled={githubLoading}
                  >
                    Back
                  </Button>
                </div>
              </div>
            )}
          </CardHeader>

          <div className="px-6 py-4">
            <div className="relative">
              <Separator />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="bg-card px-3 text-xs text-muted-foreground">or</span>
              </div>
            </div>
          </div>

          <CardContent>
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="you@example.com"
                      value={signInEmail}
                      onChange={(e) => setSignInEmail(e.target.value)}
                      required
                      disabled={authLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Password</Label>
                    <Input
                      id="signin-password"
                      type="password"
                      placeholder="••••••••"
                      value={signInPassword}
                      onChange={(e) => setSignInPassword(e.target.value)}
                      required
                      disabled={authLoading}
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={authLoading}
                  >
                    {authLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4 mr-2" />
                        Sign In with Email
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Display Name</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="John Doe"
                      value={signUpName}
                      onChange={(e) => setSignUpName(e.target.value)}
                      disabled={authLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="you@example.com"
                      value={signUpEmail}
                      onChange={(e) => setSignUpEmail(e.target.value)}
                      required
                      disabled={authLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      value={signUpPassword}
                      onChange={(e) => setSignUpPassword(e.target.value)}
                      required
                      disabled={authLoading}
                      minLength={6}
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={authLoading}
                  >
                    {authLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      'Create Account'
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          By continuing, you agree to ServerGem's Terms • No Google Cloud account needed
        </p>
      </div>
    </div>
  );
};

export default Auth;
