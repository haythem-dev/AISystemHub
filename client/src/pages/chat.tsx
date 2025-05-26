import { useEffect } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/chat/sidebar";
import ChatArea from "@/components/chat/chat-area";
import { useWebSocket } from "@/lib/websocket";

export default function ChatPage() {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const { connect, disconnect, isConnected } = useWebSocket();

  // Fetch conversations for sidebar
  const { data: conversations = [] } = useQuery({
    queryKey: ['/api/conversations'],
  });

  // Fetch AI models
  const { data: models = [] } = useQuery({
    queryKey: ['/api/models'],
  });

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  const currentConversationId = conversationId ? parseInt(conversationId) : null;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar 
        conversations={conversations} 
        currentConversationId={currentConversationId}
        models={models}
      />
      <ChatArea 
        conversationId={currentConversationId}
        isConnected={isConnected}
        models={models}
      />
    </div>
  );
}
