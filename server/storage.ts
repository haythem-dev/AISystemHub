import session from "express-session";
import createMemoryStore from "memorystore";
import { 
  conversations, 
  messages, 
  aiModels, 
  users,
  type Conversation, 
  type Message, 
  type AiModel, 
  type User,
  type InsertConversation, 
  type InsertMessage, 
  type InsertAiModel, 
  type InsertUser 
} from "@shared/schema";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  // Session store
  sessionStore: session.Store;
  
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Conversation methods
  getConversations(userId: string): Promise<Conversation[]>;
  getConversation(id: number): Promise<Conversation | undefined>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  updateConversation(id: number, updates: Partial<InsertConversation>): Promise<Conversation | undefined>;
  deleteConversation(id: number): Promise<boolean>;
  
  // Message methods
  getMessages(conversationId: number): Promise<Message[]>;
  getMessage(id: number): Promise<Message | undefined>;
  createMessage(message: InsertMessage): Promise<Message>;
  updateMessage(id: number, updates: Partial<InsertMessage>): Promise<Message | undefined>;
  
  // AI Model methods
  getAiModels(): Promise<AiModel[]>;
  getActiveAiModels(): Promise<AiModel[]>;
  getAiModel(id: string): Promise<AiModel | undefined>;
  createAiModel(model: InsertAiModel): Promise<AiModel>;
  updateAiModel(id: string, updates: Partial<InsertAiModel>): Promise<AiModel | undefined>;
}

export class MemStorage implements IStorage {
  public sessionStore: session.Store;
  private users: Map<number, User>;
  private conversations: Map<number, Conversation>;
  private messages: Map<number, Message>;
  private aiModels: Map<string, AiModel>;
  private currentUserId: number;
  private currentConversationId: number;
  private currentMessageId: number;

  constructor() {
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    });
    this.users = new Map();
    this.conversations = new Map();
    this.messages = new Map();
    this.aiModels = new Map();
    this.currentUserId = 1;
    this.currentConversationId = 1;
    this.currentMessageId = 1;
    
    // Initialize default AI models
    this.initializeAiModels();
  }

  private initializeAiModels() {
    const defaultModels: AiModel[] = [
      {
        id: "gpt-4o",
        name: "GPT-4 Turbo",
        provider: "openai",
        isActive: true,
        description: "Most capable OpenAI model for complex reasoning",
        maxTokens: 4096,
        capabilities: ["reasoning", "code", "image", "analysis"],
        category: "general",
      },
      {
        id: "claude-3-7-sonnet-20250219",
        name: "Claude 3.7 Sonnet",
        provider: "anthropic",
        isActive: true,
        description: "Advanced reasoning and analysis capabilities",
        maxTokens: 4096,
        capabilities: ["reasoning", "analysis", "writing", "research"],
        category: "general",
      },
      {
        id: "gpt-3.5-turbo",
        name: "GPT-3.5 Turbo",
        provider: "openai",
        isActive: true,
        description: "Fast and efficient for general tasks",
        maxTokens: 4096,
        capabilities: ["conversation", "code", "general"],
        category: "general",
      },
      {
        id: "deepseek-coder",
        name: "DeepSeek Coder",
        provider: "deepseek",
        isActive: true,
        description: "Specialized AI for code generation, analysis, and debugging",
        maxTokens: 4096,
        capabilities: ["code", "debugging", "analysis", "uml", "architecture"],
        category: "code",
      },
      {
        id: "llama-3.1-sonar-large-128k-online",
        name: "Perplexity Sonar Large",
        provider: "perplexity",
        isActive: true,
        description: "Real-time web search and research capabilities",
        maxTokens: 8192,
        capabilities: ["search", "research", "real-time", "citations"],
        category: "search",
      },
      {
        id: "genspark-analyst",
        name: "GenSpark Analyst",
        provider: "genspark",
        isActive: true,
        description: "Advanced project analysis and architecture generation",
        maxTokens: 8192,
        capabilities: ["analysis", "architecture", "metrics", "documentation"],
        category: "analysis",
      },
    ];

    defaultModels.forEach(model => {
      this.aiModels.set(model.id, model);
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Conversation methods
  async getConversations(userId: string): Promise<Conversation[]> {
    return Array.from(this.conversations.values())
      .filter(conv => conv.userId === userId)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  async getConversation(id: number): Promise<Conversation | undefined> {
    return this.conversations.get(id);
  }

  async createConversation(insertConversation: InsertConversation): Promise<Conversation> {
    const id = this.currentConversationId++;
    const now = new Date();
    const conversation: Conversation = {
      id,
      title: insertConversation.title,
      userId: insertConversation.userId || 'default-user',
      createdAt: now,
      updatedAt: now,
    };
    this.conversations.set(id, conversation);
    return conversation;
  }

  async updateConversation(id: number, updates: Partial<InsertConversation>): Promise<Conversation | undefined> {
    const conversation = this.conversations.get(id);
    if (!conversation) return undefined;
    
    const updatedConversation: Conversation = {
      ...conversation,
      ...updates,
      updatedAt: new Date(),
    };
    this.conversations.set(id, updatedConversation);
    return updatedConversation;
  }

  async deleteConversation(id: number): Promise<boolean> {
    const deleted = this.conversations.delete(id);
    if (deleted) {
      // Also delete associated messages
      Array.from(this.messages.entries()).forEach(([messageId, message]) => {
        if (message.conversationId === id) {
          this.messages.delete(messageId);
        }
      });
    }
    return deleted;
  }

  // Message methods
  async getMessages(conversationId: number): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter(message => message.conversationId === conversationId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  async getMessage(id: number): Promise<Message | undefined> {
    return this.messages.get(id);
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = this.currentMessageId++;
    const message: Message = {
      id,
      conversationId: insertMessage.conversationId,
      role: insertMessage.role,
      content: insertMessage.content,
      model: insertMessage.model || null,
      metadata: insertMessage.metadata || null,
      createdAt: new Date(),
    };
    this.messages.set(id, message);
    
    // Update conversation timestamp
    const conversation = this.conversations.get(insertMessage.conversationId);
    if (conversation) {
      conversation.updatedAt = new Date();
      this.conversations.set(conversation.id, conversation);
    }
    
    return message;
  }

  async updateMessage(id: number, updates: Partial<InsertMessage>): Promise<Message | undefined> {
    const message = this.messages.get(id);
    if (!message) return undefined;
    
    const updatedMessage: Message = { ...message, ...updates };
    this.messages.set(id, updatedMessage);
    return updatedMessage;
  }

  // AI Model methods
  async getAiModels(): Promise<AiModel[]> {
    return Array.from(this.aiModels.values());
  }

  async getActiveAiModels(): Promise<AiModel[]> {
    return Array.from(this.aiModels.values()).filter(model => model.isActive);
  }

  async getAiModel(id: string): Promise<AiModel | undefined> {
    return this.aiModels.get(id);
  }

  async createAiModel(insertModel: InsertAiModel): Promise<AiModel> {
    const model: AiModel = {
      id: insertModel.id,
      name: insertModel.name,
      provider: insertModel.provider,
      isActive: insertModel.isActive ?? true,
      description: insertModel.description ?? null,
      maxTokens: insertModel.maxTokens ?? 4096,
    };
    this.aiModels.set(model.id, model);
    return model;
  }

  async updateAiModel(id: string, updates: Partial<InsertAiModel>): Promise<AiModel | undefined> {
    const model = this.aiModels.get(id);
    if (!model) return undefined;
    
    const updatedModel: AiModel = { ...model, ...updates };
    this.aiModels.set(id, updatedModel);
    return updatedModel;
  }
}

export const storage = new MemStorage();
