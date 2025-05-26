import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { modelManager } from "./ai/model-manager";
import { 
  insertConversationSchema, 
  insertMessageSchema, 
  wsMessageSchema,
  type WSMessage 
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // REST API Routes
  
  // Get all conversations
  app.get("/api/conversations", async (req, res) => {
    try {
      const userId = "default-user"; // In a real app, get from authentication
      const conversations = await storage.getConversations(userId);
      res.json(conversations);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create new conversation
  app.post("/api/conversations", async (req, res) => {
    try {
      const validatedData = insertConversationSchema.parse({
        ...req.body,
        userId: "default-user"
      });
      const conversation = await storage.createConversation(validatedData);
      res.json(conversation);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  // Get conversation messages
  app.get("/api/conversations/:id/messages", async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const messages = await storage.getMessages(conversationId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get AI models
  app.get("/api/models", async (req, res) => {
    try {
      const models = await storage.getActiveAiModels();
      res.json(models);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // File upload endpoint
  app.post("/api/upload", async (req, res) => {
    try {
      const { fileName, fileType, fileData, conversationId } = req.body;
      
      // In a real implementation, you'd save the file and process it
      // For now, we'll just return a success response
      res.json({ 
        success: true, 
        fileName,
        message: "File uploaded successfully" 
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // WebSocket Server for real-time chat
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/ws' 
  });

  wss.on('connection', (ws: WebSocket) => {
    console.log('WebSocket client connected');

    ws.on('message', async (data: string) => {
      try {
        const message: WSMessage = JSON.parse(data);
        const validatedMessage = wsMessageSchema.parse(message);

        switch (validatedMessage.type) {
          case 'chat_message':
            await handleChatMessage(ws, validatedMessage);
            break;
          case 'file_upload':
            await handleFileUpload(ws, validatedMessage);
            break;
          default:
            ws.send(JSON.stringify({ error: 'Unknown message type' }));
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({ error: error.message }));
      }
    });

    ws.on('close', () => {
      console.log('WebSocket client disconnected');
    });
  });

  async function handleChatMessage(ws: WebSocket, message: WSMessage & { type: 'chat_message' }) {
    try {
      const { conversationId, content, model } = message;

      // Save user message
      const userMessage = await storage.createMessage({
        conversationId,
        role: 'user',
        content,
        model: null,
        metadata: null,
      });

      // Create assistant message placeholder
      const assistantMessage = await storage.createMessage({
        conversationId,
        role: 'assistant',
        content: '',
        model,
        metadata: null,
      });

      // Get conversation history for context
      const messages = await storage.getMessages(conversationId);
      const conversationHistory = messages
        .filter(m => m.id !== assistantMessage.id) // Exclude the empty assistant message
        .map(m => ({ role: m.role, content: m.content }));

      // Generate AI response with streaming
      let fullResponse = '';
      await modelManager.generateResponse(
        conversationHistory,
        model,
        {
          onChunk: (chunk: string) => {
            fullResponse += chunk;
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type: 'stream_chunk',
                conversationId,
                messageId: assistantMessage.id,
                chunk,
              }));
            }
          },
          onComplete: async () => {
            // Update the assistant message with the full response
            await storage.updateMessage(assistantMessage.id, { content: fullResponse });
            
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type: 'stream_chunk',
                conversationId,
                messageId: assistantMessage.id,
                chunk: '',
                isComplete: true,
              }));
            }

            // Update conversation title if it's the first message
            const conversation = await storage.getConversation(conversationId);
            if (conversation && conversation.title === 'New Conversation') {
              const titlePrompt = `Generate a short, descriptive title (max 50 characters) for a conversation that starts with: "${content}"`;
              try {
                const title = await modelManager.generateResponse(
                  [{ role: 'user', content: titlePrompt }],
                  'gpt-3.5-turbo'
                ) as string;
                await storage.updateConversation(conversationId, { 
                  title: title.replace(/['"]/g, '').substring(0, 50) 
                });
              } catch (error) {
                console.error('Failed to generate title:', error);
              }
            }
          },
          onError: (error: Error) => {
            console.error('AI generation error:', error);
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type: 'error',
                message: 'Failed to generate response: ' + error.message,
              }));
            }
          }
        }
      );
    } catch (error) {
      console.error('Chat message handling error:', error);
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'error',
          message: error.message,
        }));
      }
    }
  }

  async function handleFileUpload(ws: WebSocket, message: WSMessage & { type: 'file_upload' }) {
    try {
      const { conversationId, fileName, fileType, fileData } = message;

      // Determine if it's an image file
      const isImage = fileType.startsWith('image/');
      
      if (isImage) {
        // Analyze image with AI
        const analysis = await modelManager.analyzeImage(
          fileData,
          'gpt-4o',
          `Analyze this image file "${fileName}" and provide detailed insights.`
        );

        // Save the analysis as a message
        await storage.createMessage({
          conversationId,
          role: 'assistant',
          content: `📁 **File Analysis: ${fileName}**\n\n${analysis}`,
          model: 'gpt-4o',
          metadata: { fileType: 'image_analysis', fileName },
        });
      } else {
        // For non-image files, save a placeholder message
        await storage.createMessage({
          conversationId,
          role: 'assistant',
          content: `📁 File "${fileName}" uploaded successfully. File type: ${fileType}`,
          model: null,
          metadata: { fileType, fileName },
        });
      }

      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'file_processed',
          fileName,
          success: true,
        }));
      }
    } catch (error) {
      console.error('File upload handling error:', error);
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Failed to process file: ' + error.message,
        }));
      }
    }
  }

  return httpServer;
}
