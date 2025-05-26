import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, Cpu, Zap, Shield, Globe, MessageSquare } from "lucide-react";

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [loginData, setLoginData] = useState({ username: "", password: "" });
  const [registerData, setRegisterData] = useState({ username: "", password: "" });

  // Redirect if already logged in
  if (user) {
    return <Redirect to="/" />;
  }

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate(loginData);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    registerMutation.mutate(registerData);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Authentication Forms */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <Brain className="h-12 w-12 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold">SuperAI Platform</h1>
            <p className="text-muted-foreground mt-2">
              Access the most advanced AI cooperation system
            </p>
          </div>

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Sign In</TabsTrigger>
              <TabsTrigger value="register">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <Card>
                <CardHeader>
                  <CardTitle>Welcome Back</CardTitle>
                  <CardDescription>
                    Sign in to access your SuperAI workspace
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-username">Username</Label>
                      <Input
                        id="login-username"
                        type="text"
                        placeholder="Enter username"
                        value={loginData.username}
                        onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password">Password</Label>
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="Enter password"
                        value={loginData.password}
                        onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                        required
                      />
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending ? "Signing In..." : "Sign In"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="register">
              <Card>
                <CardHeader>
                  <CardTitle>Create Account</CardTitle>
                  <CardDescription>
                    Join the SuperAI platform for advanced AI cooperation
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="register-username">Username</Label>
                      <Input
                        id="register-username"
                        type="text"
                        placeholder="Choose username"
                        value={registerData.username}
                        onChange={(e) => setRegisterData({ ...registerData, username: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-password">Password</Label>
                      <Input
                        id="register-password"
                        type="password"
                        placeholder="Create password"
                        value={registerData.password}
                        onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                        required
                      />
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={registerMutation.isPending}
                    >
                      {registerMutation.isPending ? "Creating Account..." : "Create Account"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p>Demo credentials: username: <code className="bg-muted px-1 rounded">user</code>, password: <code className="bg-muted px-1 rounded">password</code></p>
          </div>
        </div>
      </div>

      {/* Right side - Hero Section */}
      <div className="flex-1 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-950 dark:to-indigo-950 p-8 flex items-center justify-center">
        <div className="max-w-lg text-center">
          <h2 className="text-4xl font-bold mb-6">
            Next-Generation AI Cooperation
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Experience the power of multiple AI models working together to provide you with the best possible responses.
          </p>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="flex flex-col items-center p-4 bg-white/50 dark:bg-black/20 rounded-lg">
              <Brain className="h-8 w-8 text-blue-600 mb-2" />
              <span className="font-semibold">6 AI Models</span>
              <span className="text-sm text-muted-foreground">GPT-4, Claude, Grok, Gemini, DeepSeek, Perplexity</span>
            </div>
            <div className="flex flex-col items-center p-4 bg-white/50 dark:bg-black/20 rounded-lg">
              <Zap className="h-8 w-8 text-yellow-600 mb-2" />
              <span className="font-semibold">Real-time</span>
              <span className="text-sm text-muted-foreground">Live streaming responses</span>
            </div>
            <div className="flex flex-col items-center p-4 bg-white/50 dark:bg-black/20 rounded-lg">
              <Cpu className="h-8 w-8 text-green-600 mb-2" />
              <span className="font-semibold">Smart Selection</span>
              <span className="text-sm text-muted-foreground">Best model for each task</span>
            </div>
            <div className="flex flex-col items-center p-4 bg-white/50 dark:bg-black/20 rounded-lg">
              <Shield className="h-8 w-8 text-red-600 mb-2" />
              <span className="font-semibold">Secure</span>
              <span className="text-sm text-muted-foreground">Enterprise-grade security</span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-center space-x-2">
              <MessageSquare className="h-5 w-5 text-blue-600" />
              <span>Advanced conversational AI</span>
            </div>
            <div className="flex items-center justify-center space-x-2">
              <Globe className="h-5 w-5 text-green-600" />
              <span>Real-time web research capabilities</span>
            </div>
            <div className="flex items-center justify-center space-x-2">
              <Cpu className="h-5 w-5 text-purple-600" />
              <span>Code generation and analysis</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}