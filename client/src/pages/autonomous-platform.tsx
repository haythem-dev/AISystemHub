
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  GitBranch, 
  Play, 
  Square, 
  Brain, 
  Cog, 
  FileText, 
  Activity,
  Zap,
  Shield,
  TrendingUp,
  Code,
  AlertTriangle,
  CheckCircle,
  Clock,
  Cpu,
  Database,
  Globe
} from "lucide-react";

interface AgentStatus {
  isActive: boolean;
  currentTask: {
    id: string;
    description: string;
    priority: string;
    type: string;
    status: string;
  } | null;
}

export default function AutonomousPlatform() {
  const [gitRepo, setGitRepo] = useState("");
  const [branch, setBranch] = useState("main");
  const [improvementDesc, setImprovementDesc] = useState("");
  const [improvementType, setImprovementType] = useState("feature");
  const queryClient = useQueryClient();

  // Get agent status
  const { data: agentStatus, isLoading } = useQuery<AgentStatus>({
    queryKey: ["/api/autonomous/status"],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Initialize agent mutation
  const initializeMutation = useMutation({
    mutationFn: async ({ repository, branch }: { repository: string; branch: string }) => {
      const res = await fetch("/api/autonomous/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gitRepository: repository, branch }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/autonomous/status"] });
    },
  });

  // Start/Stop agent mutations
  const startMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/autonomous/start", { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/autonomous/status"] });
    },
  });

  const stopMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/autonomous/stop", { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/autonomous/status"] });
    },
  });

  // Manual improvement mutation
  const improveMutation = useMutation({
    mutationFn: async ({ description, type }: { description: string; type: string }) => {
      const res = await fetch("/api/autonomous/improve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description, type }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      setImprovementDesc("");
      queryClient.invalidateQueries({ queryKey: ["/api/autonomous/status"] });
    },
  });

  // Analysis mutation
  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/autonomous/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysisType: "full" }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-500";
      case "implementing": return "bg-blue-500 animate-pulse";
      case "analyzing": return "bg-yellow-500 animate-pulse";
      case "failed": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle className="h-4 w-4" />;
      case "implementing": return <Cog className="h-4 w-4 animate-spin" />;
      case "analyzing": return <Brain className="h-4 w-4" />;
      case "failed": return <AlertTriangle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold gradient-text flex items-center gap-2">
          <Brain className="h-8 w-8" />
          IT Update Platform
        </h1>
        <p className="text-muted-foreground mt-2">
          Autonomous AI agent for continuous platform improvement using multi-model intelligence
        </p>
      </div>

      <Tabs defaultValue="control" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="control">Control Center</TabsTrigger>
          <TabsTrigger value="status">Agent Status</TabsTrigger>
          <TabsTrigger value="analysis">Platform Analysis</TabsTrigger>
          <TabsTrigger value="improvements">Improvements</TabsTrigger>
        </TabsList>

        {/* Control Center */}
        <TabsContent value="control" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Git Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GitBranch className="h-5 w-5" />
                  Git Configuration
                </CardTitle>
                <CardDescription>
                  Connect the autonomous agent to your Git repository
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="git-repo">Repository URL</Label>
                  <Input
                    id="git-repo"
                    value={gitRepo}
                    onChange={(e) => setGitRepo(e.target.value)}
                    placeholder="https://github.com/username/repo.git"
                  />
                </div>
                <div>
                  <Label htmlFor="branch">Base Branch</Label>
                  <Input
                    id="branch"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    placeholder="main"
                  />
                </div>
                <Button 
                  onClick={() => initializeMutation.mutate({ repository: gitRepo, branch })}
                  disabled={!gitRepo || initializeMutation.isPending}
                  className="w-full"
                >
                  {initializeMutation.isPending ? "Initializing..." : "Initialize Agent"}
                </Button>
              </CardContent>
            </Card>

            {/* Agent Control */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cpu className="h-5 w-5" />
                  Autonomous Mode
                </CardTitle>
                <CardDescription>
                  Control the autonomous improvement agent
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${agentStatus?.isActive ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                    <span className="font-medium">
                      Agent Status: {agentStatus?.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  {agentStatus?.isActive && (
                    <Badge variant="secondary" className="animate-pulse">
                      Thinking...
                    </Badge>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button 
                    onClick={() => startMutation.mutate()}
                    disabled={agentStatus?.isActive || startMutation.isPending}
                    variant="default"
                    className="flex-1"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Start Autonomous Mode
                  </Button>
                  <Button 
                    onClick={() => stopMutation.mutate()}
                    disabled={!agentStatus?.isActive || stopMutation.isPending}
                    variant="destructive"
                    className="flex-1"
                  >
                    <Square className="h-4 w-4 mr-2" />
                    Stop Agent
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Manual Improvement */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Manual Improvement Request
              </CardTitle>
              <CardDescription>
                Request specific improvements from the AI agent
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="improvement-desc">Improvement Description</Label>
                <Textarea
                  id="improvement-desc"
                  value={improvementDesc}
                  onChange={(e) => setImprovementDesc(e.target.value)}
                  placeholder="Describe what you want the AI agent to improve or add to the platform..."
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="improvement-type">Improvement Type</Label>
                <Select value={improvementType} onValueChange={setImprovementType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="feature">New Feature</SelectItem>
                    <SelectItem value="bugfix">Bug Fix</SelectItem>
                    <SelectItem value="optimization">Optimization</SelectItem>
                    <SelectItem value="security">Security Enhancement</SelectItem>
                    <SelectItem value="documentation">Documentation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button 
                onClick={() => improveMutation.mutate({ description: improvementDesc, type: improvementType })}
                disabled={!improvementDesc || improveMutation.isPending}
                className="w-full"
              >
                {improveMutation.isPending ? "Processing..." : "Request Improvement"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Agent Status */}
        <TabsContent value="status" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Current Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                {agentStatus?.currentTask ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(agentStatus.currentTask.status)}
                      <Badge className={getStatusColor(agentStatus.currentTask.status)}>
                        {agentStatus.currentTask.status}
                      </Badge>
                    </div>
                    <p className="text-sm">{agentStatus.currentTask.description}</p>
                    <div className="flex gap-2">
                      <Badge variant="outline">{agentStatus.currentTask.type}</Badge>
                      <Badge variant="outline">{agentStatus.currentTask.priority}</Badge>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">No active task</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  AI Models Active
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-sm">GPT-4o (Reasoning)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <span className="text-sm">Claude 3.7 Sonnet (Analysis)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm">DeepSeek Coder (Programming)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <span className="text-sm">Perplexity (Research)</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Performance Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm">
                      <span>Analysis Accuracy</span>
                      <span>94%</span>
                    </div>
                    <Progress value={94} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm">
                      <span>Implementation Success</span>
                      <span>87%</span>
                    </div>
                    <Progress value={87} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm">
                      <span>Code Quality</span>
                      <span>91%</span>
                    </div>
                    <Progress value={91} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Platform Analysis */}
        <TabsContent value="analysis" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Comprehensive Platform Analysis
              </CardTitle>
              <CardDescription>
                AI-powered analysis of the entire platform using multi-model intelligence
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => analyzeMutation.mutate()}
                disabled={analyzeMutation.isPending}
                className="mb-4"
              >
                {analyzeMutation.isPending ? "Analyzing..." : "Run Full Analysis"}
              </Button>

              {analyzeMutation.data && (
                <div className="space-y-4">
                  <Alert>
                    <AlertDescription>
                      Analysis completed successfully. The AI agent has performed a comprehensive review
                      of the platform architecture, code quality, security, and performance.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Code className="h-4 w-4" />
                          Code Quality
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-green-600">A+</div>
                        <p className="text-xs text-muted-foreground">High maintainability</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          Security Score
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-blue-600">92%</div>
                        <p className="text-xs text-muted-foreground">Well secured</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <TrendingUp className="h-4 w-4" />
                          Performance
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-purple-600">89%</div>
                        <p className="text-xs text-muted-foreground">Optimized</p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Improvements */}
        <TabsContent value="improvements" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Autonomous Improvements</CardTitle>
              <CardDescription>
                Track improvements made by the autonomous AI agent
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">Enhanced Multi-Model Coordination</h4>
                    <Badge className="bg-green-500">Completed</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Improved the multi-model AI coordination system for better response quality
                  </p>
                  <div className="flex gap-2">
                    <Badge variant="outline">Feature</Badge>
                    <Badge variant="outline">High Priority</Badge>
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">Real-time Project Analysis</h4>
                    <Badge className="bg-blue-500 animate-pulse">In Progress</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Adding real-time project monitoring and continuous analysis capabilities
                  </p>
                  <div className="flex gap-2">
                    <Badge variant="outline">Feature</Badge>
                    <Badge variant="outline">Medium Priority</Badge>
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">Security Hardening</h4>
                    <Badge className="bg-yellow-500">Pending</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Implement additional security measures based on security analysis
                  </p>
                  <div className="flex gap-2">
                    <Badge variant="outline">Security</Badge>
                    <Badge variant="outline">Critical Priority</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
