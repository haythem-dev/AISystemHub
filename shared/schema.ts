import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  userId: text("user_id").notNull().default("default-user"),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull(),
  role: text("role").notNull(), // 'user' | 'assistant' | 'system'
  content: text("content").notNull(),
  model: text("model"), // AI model used for assistant messages
  metadata: jsonb("metadata"), // For storing additional data like file attachments, etc.
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const aiModels = pgTable("ai_models", {
  id: text("id").primaryKey(), // e.g., 'gpt-4o', 'claude-3-7-sonnet-20250219', 'deepseek-coder', 'perplexity-sonar'
  name: text("name").notNull(),
  provider: text("provider").notNull(), // 'openai' | 'anthropic' | 'deepseek' | 'perplexity' | 'genspark'
  isActive: boolean("is_active").default(true).notNull(),
  description: text("description"),
  maxTokens: integer("max_tokens").default(4096),
  capabilities: text("capabilities").array(), // ['code', 'search', 'analysis', 'uml', etc.]
  category: text("category").default("general"), // 'general' | 'code' | 'search' | 'analysis'
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

// Insert schemas
export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export const insertAiModelSchema = createInsertSchema(aiModels);

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
});

// Types
export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export type AiModel = typeof aiModels.$inferSelect;
export type InsertAiModel = z.infer<typeof insertAiModelSchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

// Project analysis schemas
export const projectAnalysis = pgTable("project_analysis", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull(),
  projectName: text("project_name").notNull(),
  analysisType: text("analysis_type").notNull(), // 'structure' | 'metrics' | 'uml' | 'architecture' | 'documentation'
  fileCount: integer("file_count").default(0),
  codeLines: integer("code_lines").default(0),
  complexity: integer("complexity").default(0),
  results: jsonb("results"), // Analysis results
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertProjectAnalysisSchema = createInsertSchema(projectAnalysis).omit({
  id: true,
  createdAt: true,
});

export type ProjectAnalysis = typeof projectAnalysis.$inferSelect;
export type InsertProjectAnalysis = z.infer<typeof insertProjectAnalysisSchema>;

// WebSocket message types
export const wsMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("chat_message"),
    conversationId: z.number(),
    content: z.string(),
    model: z.string(),
  }),
  z.object({
    type: z.literal("stream_chunk"),
    conversationId: z.number(),
    messageId: z.number(),
    chunk: z.string(),
    isComplete: z.boolean().optional(),
  }),
  z.object({
    type: z.literal("file_upload"),
    conversationId: z.number(),
    fileName: z.string(),
    fileType: z.string(),
    fileData: z.string(), // base64
  }),
  z.object({
    type: z.literal("project_upload"),
    conversationId: z.number(),
    projectName: z.string(),
    files: z.array(z.object({
      path: z.string(),
      content: z.string(),
      type: z.string(),
    })),
    analysisType: z.string(),
  }),
  z.object({
    type: z.literal("analysis_progress"),
    conversationId: z.number(),
    progress: z.number(),
    status: z.string(),
  }),
]);

export type WSMessage = z.infer<typeof wsMessageSchema>;
