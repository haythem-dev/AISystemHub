import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Brain, 
  Settings, 
  Paperclip, 
  Download,
  Sliders,
  FolderOpen,
  Zap
} from "lucide-react";
import Message from "./message";
import InputArea from "./input-area";
import FileUpload from "./file-upload";
import ProjectUpload from "./project-upload";
import { useWebSocket } from "@/lib/websocket";
import type { Message as MessageType, AiModel } from "@shared/schema";

interface ChatAreaProps {
  conversationId: number | null;
  isConnected: boolean;
  models: AiModel[];
}

export default function ChatArea({ conversationId, isConnected, models }: ChatAreaProps) {
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [selectedModel, setSelectedModel] = useState(models.find(m => m.id === 'gpt-4o')?.id || models[0]?.id);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [showProjectUpload, setShowProjectUpload] = useState(false);
  const { sendMessage, lastMessage } = useWebSocket();

  // Fetch messages for current conversation
  const { data: fetchedMessages = [] } = useQuery({
    queryKey: ['/api/conversations', conversationId, 'messages'],
    enabled: !!conversationId,
  });

  useEffect(() => {
    if (fetchedMessages) {
      setMessages(fetchedMessages);
    }
  }, [fetchedMessages]);

  // Handle WebSocket messages
  useEffect(() => {
    if (!lastMessage) return;

    try {
      const wsMessage = JSON.parse(lastMessage);
      
      switch (wsMessage.type) {
        case 'stream_chunk':
          if (wsMessage.conversationId === conversationId) {
            if (wsMessage.isComplete) {
              setIsTyping(false);
            } else {
              setIsTyping(true);
              setMessages(prev => {
                const existing = prev.find(m => m.id === wsMessage.messageId);
                if (existing) {
                  return prev.map(m => 
                    m.id === wsMessage.messageId 
                      ? { ...m, content: m.content + wsMessage.chunk }
                      : m
                  );
                }
                return prev;
              });
            }
          }
          break;
        case 'error':
          setIsTyping(false);
          console.error('WebSocket error:', wsMessage.message);
          break;
      }
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  }, [lastMessage, conversationId]);

  const handleSendMessage = (content: string) => {
    if (!conversationId || !isConnected) return;
    
    setIsTyping(true);
    sendMessage({
      type: 'chat_message',
      conversationId,
      content,
      model: selectedModel,
    });
  };

  const handleFileUpload = (fileName: string, fileType: string, fileData: string) => {
    if (!conversationId || !isConnected) return;
    
    sendMessage({
      type: 'file_upload',
      conversationId,
      fileName,
      fileType,
      fileData,
    });
  };

  const handleProjectUpload = (projectName: string, files: Array<{path: string, content: string, type: string}>, analysisType: string) => {
    if (!conversationId || !isConnected) return;
    
    sendMessage({
      type: 'project_upload',
      conversationId,
      projectName,
      files,
      analysisType,
    });
  };

  if (!conversationId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-background">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 ai-gradient rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Brain className="text-white text-2xl" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-4">Welcome to SuperAI</h2>
          <p className="text-muted-foreground mb-6">
            Your advanced AI assistant for code generation, problem solving, and complex reasoning.
            Start a new conversation to begin.
          </p>
          <div className="grid grid-cols-2 gap-4 text-left">
            <div className="bg-muted rounded-lg p-4">
              <h3 className="font-medium mb-2">🚀 Code Generation</h3>
              <p className="text-sm text-muted-foreground">
                Write, debug, and optimize code in any language
              </p>
            </div>
            <div className="bg-muted rounded-lg p-4">
              <h3 className="font-medium mb-2">☁️ DevOps & Cloud</h3>
              <p className="text-sm text-muted-foreground">
                CI/CD, infrastructure, and deployment automation
              </p>
            </div>
            <div className="bg-muted rounded-lg p-4">
              <h3 className="font-medium mb-2">📄 File Analysis</h3>
              <p className="text-sm text-muted-foreground">
                Process documents, data, and media files
              </p>
            </div>
            <div className="bg-muted rounded-lg p-4">
              <h3 className="font-medium mb-2">💡 Problem Solving</h3>
              <p className="text-sm text-muted-foreground">
                Complex reasoning and step-by-step solutions
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-background">
      {/* Header */}
      <div className="bg-background border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h2 className="text-lg font-semibold text-foreground">Advanced AI Assistant</h2>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              <span className="text-sm text-muted-foreground">
                {isConnected ? 'Online' : 'Disconnected'}
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className={showAdvanced ? 'bg-accent' : ''}
                >
                  <Sliders className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Advanced Features</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowFileUpload(true)}
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Upload Files</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowProjectUpload(true)}
                  className="text-primary hover:bg-primary/10"
                >
                  <FolderOpen className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Analyze Entire Project</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Download className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Export Conversation</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 && (
          <div className="flex items-start space-x-4">
            <div className="w-10 h-10 ai-gradient rounded-xl flex items-center justify-center flex-shrink-0">
              <Brain className="text-white" />
            </div>
            <div className="flex-1">
              <div className="message-assistant">
                <p className="text-foreground mb-3">
                  👋 Hello! I'm SuperAI, your advanced AI assistant. I can help you with:
                </p>
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div className="bg-background rounded-lg p-3 border border-border">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="w-2 h-2 bg-primary rounded-full" />
                      <span className="font-medium text-sm">Code Generation</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Write, debug, and optimize code in any language
                    </p>
                  </div>
                  <div className="bg-background rounded-lg p-3 border border-border">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="w-2 h-2 bg-emerald-600 rounded-full" />
                      <span className="font-medium text-sm">DevOps & Cloud</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      CI/CD, infrastructure, and deployment automation
                    </p>
                  </div>
                  <div className="bg-background rounded-lg p-3 border border-border">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="w-2 h-2 bg-violet-600 rounded-full" />
                      <span className="font-medium text-sm">File Analysis</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Process documents, data, and media files
                    </p>
                  </div>
                  <div className="bg-background rounded-lg p-3 border border-border">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="w-2 h-2 bg-amber-500 rounded-full" />
                      <span className="font-medium text-sm">Problem Solving</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Complex reasoning and step-by-step solutions
                    </p>
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Just now</p>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <Message key={message.id} message={message} />
        ))}

        {/* Typing Indicator */}
        {isTyping && (
          <div className="flex items-start space-x-4">
            <div className="w-10 h-10 ai-gradient rounded-xl flex items-center justify-center flex-shrink-0">
              <Brain className="text-white" />
            </div>
            <div className="flex-1">
              <div className="message-assistant max-w-xs">
                <div className="flex items-center space-x-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-muted-foreground rounded-full typing-animation" />
                    <div className="w-2 h-2 bg-muted-foreground rounded-full typing-animation" />
                    <div className="w-2 h-2 bg-muted-foreground rounded-full typing-animation" />
                  </div>
                  <span className="text-sm text-muted-foreground">AI is thinking...</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <InputArea 
        onSendMessage={handleSendMessage}
        selectedModel={selectedModel}
        models={models}
        onModelChange={setSelectedModel}
        showAdvanced={showAdvanced}
        disabled={!isConnected || isTyping}
      />

      {/* File Upload Modal */}
      <FileUpload 
        isOpen={showFileUpload}
        onClose={() => setShowFileUpload(false)}
        onUpload={handleFileUpload}
      />

      {/* Project Upload Modal */}
      <ProjectUpload 
        isOpen={showProjectUpload}
        onClose={() => setShowProjectUpload(false)}
        onUpload={handleProjectUpload}
      />
    </div>
  );
}
