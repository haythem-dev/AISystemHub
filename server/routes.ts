import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { modelManager } from "./ai/model-manager";
import { multiModelCoordinator } from "./ai/multi-model-coordinator";
import { setupAuth } from "./auth";
import { registerAutonomousRoutes } from "./routes-autonomous";
import { 
  insertConversationSchema, 
  insertMessageSchema, 
  wsMessageSchema,
  type WSMessage 
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication first
  setupAuth(app);
  
  // Register autonomous agent routes
  registerAutonomousRoutes(app);
  
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
import type { Express } from "express";
import { z } from "zod";
import { storage } from "./storage";
import { multiModelCoordinator } from "./ai/multi-model-coordinator";
import { projectAnalyzer } from "./ai/project-analyzer";
import multer from "multer";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { requireAuth } from "./auth";

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

export function registerRoutes(app: Express) {
  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      services: {
        ai: 'operational',
        storage: 'operational',
        auth: 'operational'
      }
    });
  });

  // Get available AI models
  app.get("/api/chat/models", requireAuth, (req, res) => {
    const models = [
      { id: "gpt-4o", name: "GPT-4o", provider: "OpenAI", capabilities: ["text", "reasoning"] },
      { id: "claude-3-7-sonnet", name: "Claude 3.7 Sonnet", provider: "Anthropic", capabilities: ["text", "analysis"] },
      { id: "deepseek-coder", name: "DeepSeek Coder", provider: "DeepSeek", capabilities: ["code", "programming"] },
      { id: "grok-2", name: "Grok 2", provider: "X.AI", capabilities: ["text", "realtime"] },
      { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro", provider: "Google", capabilities: ["text", "vision", "multimodal"] },
      { id: "perplexity-sonar", name: "Perplexity Sonar", provider: "Perplexity", capabilities: ["search", "research"] }
    ];
    res.json(models);
  });

  // Get conversations
  app.get("/api/chat/conversations", requireAuth, (req, res) => {
    const userId = (req as any).session.userId;
    const conversations = storage.getUserConversations(userId);
    res.json(conversations);
  });

  // Create new conversation
  app.post("/api/chat/conversations", requireAuth, (req, res) => {
    const { title } = req.body;
    const userId = (req as any).session.userId;
    
    const conversation = storage.createConversation(userId, title);
    res.json(conversation);
  });

  // Get specific conversation
  app.get("/api/chat/conversations/:id", requireAuth, (req, res) => {
    const { id } = req.params;
    const userId = (req as any).session.userId;
    
    const conversation = storage.getConversation(id);
    if (!conversation || conversation.userId !== userId) {
      return res.status(404).json({ error: "Conversation not found" });
    }
    
    res.json(conversation);
  });

  // Send message
  app.post("/api/chat/conversations/:id/messages", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { content, selectedModels, useCoordination } = req.body;
      const userId = (req as any).session.userId;

      const conversation = storage.getConversation(id);
      if (!conversation || conversation.userId !== userId) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      // Add user message
      const userMessage = storage.addMessage(id, {
        role: "user",
        content,
        timestamp: new Date(),
      });

      // Generate AI response
      const messages = [...conversation.messages, userMessage];
      
      let aiResponse: string;
      let aiModelsUsed: string[] = [];

      if (useCoordination && selectedModels?.length > 1) {
        aiResponse = await multiModelCoordinator.generateBestResponse(
          messages,
          { strategy: 'consensus', minModels: Math.min(selectedModels.length, 3) }
        );
        aiModelsUsed = selectedModels;
      } else {
        const modelId = selectedModels?.[0] || 'gpt-4o';
        aiResponse = await multiModelCoordinator.generateResponse(messages, modelId);
        aiModelsUsed = [modelId];
      }

      // Add AI message
      const aiMessage = storage.addMessage(id, {
        role: "assistant",
        content: aiResponse,
        timestamp: new Date(),
        aiModelsUsed,
      });

      res.json({ message: aiMessage });
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  // File upload
  app.post("/api/upload", requireAuth, upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const fileId = Date.now().toString();
      const uploadDir = join(process.cwd(), "uploads");
      
      try {
        await mkdir(uploadDir, { recursive: true });
      } catch (e) {
        // Directory might already exist
      }

      const filePath = join(uploadDir, `${fileId}-${req.file.originalname}`);
      await writeFile(filePath, req.file.buffer);

      // Store file metadata
      storage.storeFile(fileId, {
        originalName: req.file.originalname,
        path: filePath,
        size: req.file.size,
        mimeType: req.file.mimetype,
        uploadedAt: new Date(),
      });

      res.json({ success: true, fileId });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ error: "Upload failed" });
    }
  });

  // File analysis
  app.post("/api/analyze", requireAuth, async (req, res) => {
    try {
      const { fileIds, analysisType } = req.body;
      
      if (!fileIds || !Array.isArray(fileIds)) {
        return res.status(400).json({ error: "Invalid file IDs" });
      }

      const files = fileIds.map(id => storage.getFile(id)).filter(Boolean);
      if (files.length === 0) {
        return res.status(404).json({ error: "No valid files found" });
      }

      let analysis: string;
      
      switch (analysisType) {
        case 'code':
          analysis = await multiModelCoordinator.generateResponse([
            { role: "system", content: "You are a code analysis expert." },
            { role: "user", content: `Analyze these files:\n${files.map(f => `${f.originalName}:\n${f.path}`).join('\n')}` }
          ], 'deepseek-coder');
          break;
        default:
          analysis = "Analysis type not supported";
      }

      res.json({ analysis });
    } catch (error) {
      console.error("Analysis error:", error);
      res.status(500).json({ error: "Analysis failed" });
    }
  });

  // Project upload
  app.post("/api/project/upload", requireAuth, async (req, res) => {
    try {
      const { files } = req.body;
      
      if (!files || !Array.isArray(files)) {
        return res.status(400).json({ error: "Invalid project files" });
      }

      const projectId = Date.now().toString();
      
      // Store project metadata
      storage.storeProject(projectId, {
        files,
        uploadedAt: new Date(),
      });

      res.json({ success: true, projectId });
    } catch (error) {
      console.error("Project upload error:", error);
      res.status(500).json({ error: "Project upload failed" });
    }
  });

  // Project analysis
  app.post("/api/project/analyze", requireAuth, async (req, res) => {
    try {
      const { files, analysisType } = req.body;
      
      if (!files || !Array.isArray(files)) {
        return res.status(400).json({ error: "Invalid files for analysis" });
      }

      let result: any;
      
      switch (analysisType) {
        case 'metrics':
          result = { metrics: await projectAnalyzer.calculateCodeMetrics(files) };
          break;
        case 'architecture':
          result = { documentation: await projectAnalyzer.generateArchitectureDocs(files) };
          break;
        default:
          return res.status(400).json({ error: "Invalid analysis type" });
      }

      res.json(result);
    } catch (error) {
      console.error("Project analysis error:", error);
      res.status(500).json({ error: "Project analysis failed" });
    }
  });

  // UML generation
  app.post("/api/project/uml", requireAuth, async (req, res) => {
    try {
      const { files, diagramType } = req.body;
      
      if (!files || !Array.isArray(files)) {
        return res.status(400).json({ error: "Invalid files for UML generation" });
      }

      const uml = await projectAnalyzer.generateUMLDiagram(files, diagramType);
      res.json({ uml });
    } catch (error) {
      console.error("UML generation error:", error);
      res.status(500).json({ error: "UML generation failed" });
    }
  });
}
