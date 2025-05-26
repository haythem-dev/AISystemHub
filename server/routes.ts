import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication first
  setupAuth(app);
  
  const httpServer = createServer(app);

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      services: {
        ai: 'needs_api_keys',
        storage: 'operational',
        auth: 'operational'
      }
    });
  });

  // Get all conversations
  app.get("/api/conversations", async (req, res) => {
    try {
      const userId = "default-user";
      const conversations = await storage.getConversations(userId);
      res.json(conversations);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create new conversation
  app.post("/api/conversations", async (req, res) => {
    try {
      const conversation = await storage.createConversation({
        title: req.body.title || "New Conversation",
        userId: "default-user"
      });
      res.json(conversation);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  return httpServer;
}
