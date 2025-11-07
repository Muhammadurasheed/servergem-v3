/**
 * Usage & Billing Dashboard
 * Shows current usage vs limits with upgrade prompts
 */

import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  AlertTriangle, 
  Zap,
  Activity,
  HardDrive,
  Globe,
  ArrowUpRight,
  Calendar
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Usage = () => {
  const navigate = useNavigate();

  // Mock usage data - In production, fetch from backend
  const usage = {
    plan: 'Free',
    period: 'Jan 1 - Jan 31, 2024',
    services: { current: 1, limit: 1, percentage: 100 },
    requests: { current: 47, limit: 100, percentage: 47 },
    memory: { current: 384, limit: 512, unit: 'MB', percentage: 75 },
    storage: { current: 125, limit: 1000, unit: 'MB', percentage: 12.5 },
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getAlertLevel = (percentage: number) => {
    if (percentage >= 90) return 'error';
    if (percentage >= 70) return 'warning';
    return 'success';
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Usage & Billing</h1>
            <p className="text-muted-foreground">
              Track your resource usage and manage your plan
            </p>
          </div>
          <Badge variant="secondary" className="text-base px-4 py-2">
            {usage.plan} Plan
          </Badge>
        </div>

        {/* Alert Banner */}
        {usage.services.percentage >= 90 && (
          <Card className="border-yellow-500/50 bg-yellow-500/5 mb-6">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <AlertTriangle className="w-6 h-6 text-yellow-500 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">You're approaching your limits!</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Upgrade to Pro for unlimited requests, more services, and advanced features.
                  </p>
                  <Button onClick={() => navigate('/dashboard/pricing')} className="gap-2">
                    <Zap className="w-4 h-4" />
                    Upgrade to Pro - $9/month
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Current Period */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Current billing period</p>
                  <p className="font-semibold">{usage.period}</p>
                </div>
              </div>
              <Button variant="outline" onClick={() => navigate('/dashboard/pricing')}>
                View Plans
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Usage Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Services */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-primary" />
                  <CardTitle>Active Services</CardTitle>
                </div>
                <Badge variant={getAlertLevel(usage.services.percentage) === 'error' ? 'destructive' : 'secondary'}>
                  {usage.services.current} / {usage.services.limit}
                </Badge>
              </div>
              <CardDescription>
                Number of deployed services
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <Progress value={usage.services.percentage} className="h-3" />
                <div className={`absolute inset-0 rounded-full ${getProgressColor(usage.services.percentage)} opacity-50`} 
                     style={{ width: `${usage.services.percentage}%` }} />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {usage.services.limit - usage.services.current} services remaining
                </span>
                <span className="font-semibold">{usage.services.percentage}%</span>
              </div>
              {usage.services.percentage >= 90 && (
                <div className="pt-3 border-t">
                  <p className="text-sm text-muted-foreground mb-2">
                    Upgrade to deploy more services
                  </p>
                  <Button size="sm" variant="outline" onClick={() => navigate('/dashboard/pricing')}>
                    Upgrade Plan
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Requests */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-green-500" />
                  <CardTitle>Requests Today</CardTitle>
                </div>
                <Badge variant={getAlertLevel(usage.requests.percentage) === 'error' ? 'destructive' : 'secondary'}>
                  {usage.requests.current} / {usage.requests.limit}
                </Badge>
              </div>
              <CardDescription>
                Daily request limit (resets midnight UTC)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <Progress value={usage.requests.percentage} className="h-3" />
                <div className={`absolute inset-0 rounded-full ${getProgressColor(usage.requests.percentage)} opacity-50`} 
                     style={{ width: `${usage.requests.percentage}%` }} />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {usage.requests.limit - usage.requests.current} requests remaining
                </span>
                <span className="font-semibold">{usage.requests.percentage}%</span>
              </div>
              {usage.requests.percentage >= 70 && (
                <div className="pt-3 border-t">
                  <p className="text-sm text-muted-foreground mb-2">
                    Pro plan includes unlimited requests
                  </p>
                  <Button size="sm" variant="outline" onClick={() => navigate('/dashboard/pricing')}>
                    Upgrade Plan
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Memory */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-500" />
                  <CardTitle>Memory Usage</CardTitle>
                </div>
                <Badge variant="secondary">
                  {usage.memory.current}{usage.memory.unit} / {usage.memory.limit}{usage.memory.unit}
                </Badge>
              </div>
              <CardDescription>
                Average memory per service
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <Progress value={usage.memory.percentage} className="h-3" />
                <div className={`absolute inset-0 rounded-full ${getProgressColor(usage.memory.percentage)} opacity-50`} 
                     style={{ width: `${usage.memory.percentage}%` }} />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {usage.memory.limit - usage.memory.current}{usage.memory.unit} available
                </span>
                <span className="font-semibold">{Math.round(usage.memory.percentage)}%</span>
              </div>
            </CardContent>
          </Card>

          {/* Storage */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HardDrive className="w-5 h-5 text-purple-500" />
                  <CardTitle>Storage</CardTitle>
                </div>
                <Badge variant="secondary">
                  {usage.storage.current}{usage.storage.unit} / {usage.storage.limit}{usage.storage.unit}
                </Badge>
              </div>
              <CardDescription>
                Container image storage
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <Progress value={usage.storage.percentage} className="h-3" />
                <div className={`absolute inset-0 rounded-full ${getProgressColor(usage.storage.percentage)} opacity-50`} 
                     style={{ width: `${usage.storage.percentage}%` }} />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {usage.storage.limit - usage.storage.current}{usage.storage.unit} available
                </span>
                <span className="font-semibold">{Math.round(usage.storage.percentage)}%</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Plan Comparison */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              Upgrade for More Resources
            </CardTitle>
            <CardDescription>
              Compare plans and find the right fit for your needs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg border bg-card">
                <h4 className="font-semibold mb-2">Free</h4>
                <p className="text-2xl font-bold mb-1">$0</p>
                <p className="text-sm text-muted-foreground mb-4">Perfect for testing</p>
                <ul className="space-y-2 text-sm">
                  <li>• 1 service</li>
                  <li>• 100 req/day</li>
                  <li>• 512MB RAM</li>
                </ul>
              </div>
              
              <div className="p-4 rounded-lg border-2 border-primary bg-primary/5">
                <Badge className="mb-2">Recommended</Badge>
                <h4 className="font-semibold mb-2">Pro</h4>
                <p className="text-2xl font-bold mb-1">$9<span className="text-sm font-normal">/mo</span></p>
                <p className="text-sm text-muted-foreground mb-4">For production apps</p>
                <ul className="space-y-2 text-sm mb-4">
                  <li>• 5 services</li>
                  <li>• Unlimited requests</li>
                  <li>• 2GB RAM</li>
                  <li>• Custom domains</li>
                </ul>
                <Button className="w-full" onClick={() => navigate('/dashboard/pricing')}>
                  Upgrade to Pro
                  <ArrowUpRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
              
              <div className="p-4 rounded-lg border bg-card">
                <h4 className="font-semibold mb-2">Enterprise</h4>
                <p className="text-2xl font-bold mb-1">Custom</p>
                <p className="text-sm text-muted-foreground mb-4">For teams</p>
                <ul className="space-y-2 text-sm mb-4">
                  <li>• Unlimited services</li>
                  <li>• Dedicated resources</li>
                  <li>• 99.9% SLA</li>
                  <li>• Priority support</li>
                </ul>
                <Button variant="outline" className="w-full" onClick={() => navigate('/dashboard/pricing')}>
                  Contact Sales
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Usage;
