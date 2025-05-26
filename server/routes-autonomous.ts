
import type { Express } from "express";
import { autonomousAgent } from "./ai/autonomous-agent";
import { storage } from "./storage";

export function registerAutonomousRoutes(app: Express) {
  // Initialize autonomous agent
  app.post("/api/autonomous/initialize", async (req, res) => {
    try {
      const { gitRepository, branch } = req.body;
      
      if (!gitRepository) {
        return res.status(400).json({ error: "Git repository URL is required" });
      }

      await autonomousAgent.initialize(gitRepository, branch);
      res.json({ 
        success: true, 
        message: "Autonomous agent initialized successfully",
        repository: gitRepository,
        branch: branch || 'main'
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Start autonomous mode
  app.post("/api/autonomous/start", async (req, res) => {
    try {
      await autonomousAgent.startAutonomousMode();
      res.json({ 
        success: true, 
        message: "Autonomous agent activated - continuous improvement started" 
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Stop autonomous mode
  app.post("/api/autonomous/stop", async (req, res) => {
    try {
      await autonomousAgent.stopAutonomousMode();
      res.json({ 
        success: true, 
        message: "Autonomous agent deactivated" 
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get agent status
  app.get("/api/autonomous/status", async (req, res) => {
    try {
      const status = autonomousAgent.getStatus();
      res.json(status);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Manual improvement request
  app.post("/api/autonomous/improve", async (req, res) => {
    try {
      const { description, type } = req.body;
      
      if (!description) {
        return res.status(400).json({ error: "Improvement description is required" });
      }

      await autonomousAgent.manualImprovement(description, type);
      res.json({ 
        success: true, 
        message: "Manual improvement task executed" 
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Generate project documentation
  app.post("/api/autonomous/analyze", async (req, res) => {
    try {
      const { analysisType } = req.body;
      
      // Use the autonomous agent's analysis capabilities
      const result = await autonomousAgent.analyzeFullPlatform();
      
      res.json({
        success: true,
        analysis: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
}
