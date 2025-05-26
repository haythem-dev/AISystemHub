import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  ArrowUp, 
  Paperclip, 
  Mic, 
  Code, 
  Bug, 
  Rocket,
  ChevronUp,
  ChevronDown
} from "lucide-react";
import type { AiModel } from "@shared/schema";

interface InputAreaProps {
  onSendMessage: (content: string) => void;
  selectedModel: string;
  models: AiModel[];
  onModelChange: (modelId: string) => void;
  showAdvanced: boolean;
  disabled?: boolean;
}

export default function InputArea({ 
  onSendMessage, 
  selectedModel, 
  models, 
  onModelChange, 
  showAdvanced,
  disabled = false 
}: InputAreaProps) {
  const [message, setMessage] = useState("");
  const [temperature, setTemperature] = useState([0.7]);
  const [maxTokens, setMaxTokens] = useState(2048);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const autoResize = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = Math.min(textarea.scrollHeight, 160) + "px";
    }
  };

  useEffect(() => {
    autoResize();
  }, [message]);

  const quickActions = [
    { icon: Code, label: "Code Review", prompt: "Help me review this code for best practices and potential issues: " },
    { icon: Bug, label: "Debug Issue", prompt: "Help me debug this issue: " },
    { icon: Rocket, label: "Deploy Guide", prompt: "Guide me through deploying this project: " },
  ];

  const selectedModelData = models.find(m => m.id === selectedModel);

  return (
    <div className="border-t border-border bg-background p-6">
      {/* Advanced Options */}
      {showAdvanced && (
        <div className="mb-4 bg-muted/50 rounded-lg p-4 border border-border">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-foreground">Advanced Options</h4>
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="text-sm font-medium text-foreground mb-2 block">
                Model
              </Label>
              <Select value={selectedModel} onValueChange={onModelChange}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {models.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      {model.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium text-foreground mb-2 block">
                Temperature: {temperature[0]}
              </Label>
              <Slider
                value={temperature}
                onValueChange={setTemperature}
                max={2}
                min={0}
                step={0.1}
                className="w-full"
              />
            </div>
            <div>
              <Label className="text-sm font-medium text-foreground mb-2 block">
                Max Tokens
              </Label>
              <Input
                type="number"
                value={maxTokens}
                onChange={(e) => setMaxTokens(parseInt(e.target.value) || 2048)}
                className="w-full"
                min={1}
                max={8192}
              />
            </div>
          </div>
        </div>
      )}

      {/* Input Container */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask SuperAI anything... Use @ to mention files, # for commands"
            className="w-full min-h-[60px] max-h-40 pr-24 resize-none focus-ring"
            disabled={disabled}
          />
          
          {/* Input Actions */}
          <div className="absolute right-2 bottom-2 flex items-center space-x-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  type="button"
                  variant="ghost" 
                  size="sm"
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Attach file</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  type="button"
                  variant="ghost" 
                  size="sm"
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                >
                  <Mic className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Voice input</TooltipContent>
            </Tooltip>

            <Button 
              type="submit"
              size="sm"
              disabled={!message.trim() || disabled}
              className="h-8 w-8 p-0 bg-primary hover:bg-primary/90"
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Quick Actions and Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {quickActions.map((action) => (
              <Button
                key={action.label}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setMessage(action.prompt)}
                className="text-xs"
              >
                <action.icon className="h-3 w-3 mr-1" />
                {action.label}
              </Button>
            ))}
          </div>
          
          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <span>{selectedModelData?.name || selectedModel}</span>
            </div>
            <span>•</span>
            <span>1,247 tokens used</span>
          </div>
        </div>
      </form>
    </div>
  );
}
