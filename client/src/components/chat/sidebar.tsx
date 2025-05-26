import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarContent, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Brain, 
  Plus, 
  Settings, 
  Check, 
  MoreHorizontal,
  Code,
  Cloud,
  FileText,
  Lightbulb 
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { Conversation, AiModel } from "@shared/schema";

interface SidebarProps {
  conversations: Conversation[];
  currentConversationId: number | null;
  models: AiModel[];
}

export default function Sidebar({ conversations, currentConversationId, models }: SidebarProps) {
  const [, setLocation] = useLocation();
  const [selectedModel, setSelectedModel] = useState(models.find(m => m.id === 'gpt-4o')?.id || models[0]?.id);
  const queryClient = useQueryClient();

  const createConversationMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/conversations', {
        title: 'New Conversation',
        userId: 'default-user'
      });
      return response.json();
    },
    onSuccess: (newConversation) => {
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
      setLocation(`/chat/${newConversation.id}`);
    },
  });

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
    return new Date(date).toLocaleDateString();
  };

  return (
    <div className="w-80 bg-muted/50 border-r border-border flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 ai-gradient rounded-xl flex items-center justify-center">
            <Brain className="text-white text-lg" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">SuperAI</h1>
            <p className="text-sm text-muted-foreground">Advanced AI Platform</p>
          </div>
        </div>
        
        <Button 
          onClick={() => createConversationMutation.mutate()}
          disabled={createConversationMutation.isPending}
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Conversation
        </Button>
      </div>

      {/* AI Models */}
      <div className="p-4 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground mb-3">AI Models</h3>
        <div className="space-y-2">
          {models.map((model) => (
            <Card 
              key={model.id}
              className={`p-3 cursor-pointer transition-colors hover:border-primary ${
                selectedModel === model.id ? 'border-primary bg-primary/5' : ''
              }`}
              onClick={() => setSelectedModel(model.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    selectedModel === model.id ? 'bg-green-500' : 'bg-muted'
                  }`}>
                    {selectedModel === model.id && <Check className="text-white text-xs" />}
                  </div>
                  <span className="text-sm font-medium">{model.name}</span>
                </div>
                {selectedModel === model.id && (
                  <Badge variant="secondary" className="bg-green-100 text-green-700">
                    Active
                  </Badge>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Capabilities */}
      <div className="p-4 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground mb-3">Capabilities</h3>
        <div className="grid grid-cols-2 gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="p-3 hover:bg-accent cursor-pointer">
                <Code className="w-5 h-5 text-primary mb-1" />
                <p className="text-xs font-medium">Code</p>
              </Card>
            </TooltipTrigger>
            <TooltipContent>Code generation and debugging</TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="p-3 hover:bg-accent cursor-pointer">
                <Cloud className="w-5 h-5 text-emerald-600 mb-1" />
                <p className="text-xs font-medium">DevOps</p>
              </Card>
            </TooltipTrigger>
            <TooltipContent>CI/CD and cloud infrastructure</TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="p-3 hover:bg-accent cursor-pointer">
                <FileText className="w-5 h-5 text-violet-600 mb-1" />
                <p className="text-xs font-medium">Analysis</p>
              </Card>
            </TooltipTrigger>
            <TooltipContent>File and document analysis</TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="p-3 hover:bg-accent cursor-pointer">
                <Lightbulb className="w-5 h-5 text-amber-500 mb-1" />
                <p className="text-xs font-medium">Ideas</p>
              </Card>
            </TooltipTrigger>
            <TooltipContent>Problem solving and reasoning</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Conversations */}
      <div className="flex-1 p-4 overflow-y-auto">
        <h3 className="text-sm font-semibold text-foreground mb-3">Recent Conversations</h3>
        <div className="space-y-2">
          {conversations.map((conversation) => (
            <Link 
              key={conversation.id} 
              href={`/chat/${conversation.id}`}
              className="block"
            >
              <Card className={`p-3 cursor-pointer transition-colors hover:bg-accent group ${
                currentConversationId === conversation.id ? 'bg-accent border-primary' : ''
              }`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {conversation.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatTimestamp(conversation.updatedAt)}
                    </p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                  >
                    <MoreHorizontal className="h-3 w-3" />
                  </Button>
                </div>
              </Card>
            </Link>
          ))}
          
          {conversations.length === 0 && (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">No conversations yet</p>
              <p className="text-xs text-muted-foreground mt-1">Start a new chat to begin</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <Card className="p-3">
          <div className="flex items-center space-x-3">
            <Avatar className="w-8 h-8">
              <AvatarContent className="ai-gradient">
                <AvatarFallback className="text-white text-sm font-medium">
                  JD
                </AvatarFallback>
              </AvatarContent>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                John Developer
              </p>
              <p className="text-xs text-muted-foreground">Pro Plan</p>
            </div>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
