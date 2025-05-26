
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { createServer } from 'http';
import { WebSocket } from 'ws';

const API_BASE = 'http://localhost:5000';
const WS_BASE = 'ws://localhost:5000';

describe('SuperAI Platform Smoke Tests', () => {
  let server: any;
  let app: express.Application;

  beforeAll(async () => {
    // Import the server app
    const { app: serverApp } = await import('../server/index');
    app = serverApp;
    server = createServer(app);
    
    await new Promise<void>((resolve) => {
      server.listen(5001, () => {
        console.log('Test server running on port 5001');
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
    }
  });

  describe('🔐 Authentication System', () => {
    it('should reject requests without authentication', async () => {
      const response = await request(app)
        .get('/api/chat/conversations')
        .expect(401);
      
      expect(response.body.error).toContain('authentication');
    });

    it('should accept demo credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'user', password: 'password' })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.headers['set-cookie']).toBeDefined();
    });

    it('should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'invalid', password: 'wrong' })
        .expect(401);
      
      expect(response.body.success).toBe(false);
    });

    it('should handle logout', async () => {
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({ username: 'user', password: 'password' });
      
      const cookie = loginResponse.headers['set-cookie'][0];
      
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', cookie)
        .expect(200);
      
      expect(response.body.success).toBe(true);
    });
  });

  describe('🤖 Multi-Model AI System', () => {
    let authCookie: string;

    beforeAll(async () => {
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({ username: 'user', password: 'password' });
      authCookie = loginResponse.headers['set-cookie'][0];
    });

    it('should list available AI models', async () => {
      const response = await request(app)
        .get('/api/chat/models')
        .set('Cookie', authCookie)
        .expect(200);
      
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      
      // Verify all 6 models are present
      const modelNames = response.body.map((m: any) => m.name);
      expect(modelNames).toContain('GPT-4o');
      expect(modelNames).toContain('Claude 3.7 Sonnet');
      expect(modelNames).toContain('DeepSeek Coder');
      expect(modelNames).toContain('Grok 2');
      expect(modelNames).toContain('Gemini 1.5 Pro');
      expect(modelNames).toContain('Perplexity Sonar');
    });

    it('should create a new conversation', async () => {
      const response = await request(app)
        .post('/api/chat/conversations')
        .set('Cookie', authCookie)
        .send({ title: 'Smoke Test Conversation' })
        .expect(200);
      
      expect(response.body.id).toBeDefined();
      expect(response.body.title).toBe('Smoke Test Conversation');
      expect(response.body.messages).toEqual([]);
    });

    it('should send a message and get AI response', async () => {
      // Create conversation
      const convResponse = await request(app)
        .post('/api/chat/conversations')
        .set('Cookie', authCookie)
        .send({ title: 'AI Test' });
      
      const conversationId = convResponse.body.id;
      
      // Send message
      const response = await request(app)
        .post(`/api/chat/conversations/${conversationId}/messages`)
        .set('Cookie', authCookie)
        .send({ 
          content: 'Hello, this is a smoke test. Please respond with "Test successful"',
          selectedModels: ['gpt-4o']
        })
        .expect(200);
      
      expect(response.body.message).toBeDefined();
      expect(response.body.message.content).toBeDefined();
    }, 30000);

    it('should handle multi-model coordination', async () => {
      const convResponse = await request(app)
        .post('/api/chat/conversations')
        .set('Cookie', authCookie)
        .send({ title: 'Multi-Model Test' });
      
      const conversationId = convResponse.body.id;
      
      const response = await request(app)
        .post(`/api/chat/conversations/${conversationId}/messages`)
        .set('Cookie', authCookie)
        .send({ 
          content: 'What is 2+2? Please use multiple models for verification.',
          selectedModels: ['gpt-4o', 'claude-3-7-sonnet'],
          useCoordination: true
        })
        .expect(200);
      
      expect(response.body.message.content).toBeDefined();
      expect(response.body.message.aiModelsUsed.length).toBeGreaterThan(1);
    }, 45000);
  });

  describe('📁 File Upload & Analysis', () => {
    let authCookie: string;

    beforeAll(async () => {
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({ username: 'user', password: 'password' });
      authCookie = loginResponse.headers['set-cookie'][0];
    });

    it('should accept file uploads', async () => {
      const testFile = Buffer.from('console.log("Hello World");');
      
      const response = await request(app)
        .post('/api/upload')
        .set('Cookie', authCookie)
        .attach('file', testFile, 'test.js')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.fileId).toBeDefined();
    });

    it('should analyze uploaded files', async () => {
      const testFile = Buffer.from(`
        function fibonacci(n) {
          if (n <= 1) return n;
          return fibonacci(n - 1) + fibonacci(n - 2);
        }
        console.log(fibonacci(10));
      `);
      
      const uploadResponse = await request(app)
        .post('/api/upload')
        .set('Cookie', authCookie)
        .attach('file', testFile, 'fibonacci.js');
      
      const fileId = uploadResponse.body.fileId;
      
      const response = await request(app)
        .post('/api/analyze')
        .set('Cookie', authCookie)
        .send({ fileIds: [fileId], analysisType: 'code' })
        .expect(200);
      
      expect(response.body.analysis).toBeDefined();
      expect(response.body.analysis).toContain('fibonacci');
    }, 30000);

    it('should handle project uploads', async () => {
      const projectFiles = [
        { name: 'package.json', content: '{"name": "test-project", "version": "1.0.0"}' },
        { name: 'index.js', content: 'console.log("Test project");' },
        { name: 'README.md', content: '# Test Project' }
      ];
      
      const response = await request(app)
        .post('/api/project/upload')
        .set('Cookie', authCookie)
        .send({ files: projectFiles })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.projectId).toBeDefined();
    });
  });

  describe('🔧 Autonomous Agent System', () => {
    let authCookie: string;

    beforeAll(async () => {
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({ username: 'user', password: 'password' });
      authCookie = loginResponse.headers['set-cookie'][0];
    });

    it('should get agent status', async () => {
      const response = await request(app)
        .get('/api/autonomous/status')
        .set('Cookie', authCookie)
        .expect(200);
      
      expect(response.body).toHaveProperty('isActive');
      expect(response.body).toHaveProperty('currentTask');
    });

    it('should initialize autonomous agent', async () => {
      const response = await request(app)
        .post('/api/autonomous/initialize')
        .set('Cookie', authCookie)
        .send({ 
          gitRepository: 'https://github.com/test/test-repo.git',
          branch: 'main'
        })
        .expect(200);
      
      expect(response.body.success).toBe(true);
    });

    it('should handle manual improvement requests', async () => {
      const response = await request(app)
        .post('/api/autonomous/improve')
        .set('Cookie', authCookie)
        .send({ 
          description: 'Add smoke test for autonomous agent',
          type: 'feature'
        })
        .expect(200);
      
      expect(response.body.success).toBe(true);
    }, 60000);

    it('should perform platform analysis', async () => {
      const response = await request(app)
        .post('/api/autonomous/analyze')
        .set('Cookie', authCookie)
        .send({ analysisType: 'full' })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.analysis).toBeDefined();
    }, 45000);
  });

  describe('📊 Project Analysis', () => {
    let authCookie: string;

    beforeAll(async () => {
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({ username: 'user', password: 'password' });
      authCookie = loginResponse.headers['set-cookie'][0];
    });

    it('should generate code metrics', async () => {
      const response = await request(app)
        .post('/api/project/analyze')
        .set('Cookie', authCookie)
        .send({ 
          files: [
            { path: 'test.js', content: 'function test() { return true; }', type: 'javascript', size: 100 }
          ],
          analysisType: 'metrics'
        })
        .expect(200);
      
      expect(response.body.metrics).toBeDefined();
      expect(response.body.metrics.totalLines).toBeGreaterThan(0);
    });

    it('should generate architecture documentation', async () => {
      const response = await request(app)
        .post('/api/project/analyze')
        .set('Cookie', authCookie)
        .send({ 
          files: [
            { path: 'package.json', content: '{"name": "test", "dependencies": {"react": "^18.0.0"}}', type: 'json', size: 100 }
          ],
          analysisType: 'architecture'
        })
        .expect(200);
      
      expect(response.body.documentation).toBeDefined();
    }, 30000);

    it('should generate UML diagrams', async () => {
      const response = await request(app)
        .post('/api/project/uml')
        .set('Cookie', authCookie)
        .send({ 
          files: [
            { path: 'User.js', content: 'class User { constructor(name) { this.name = name; } }', type: 'javascript', size: 100 }
          ],
          diagramType: 'class'
        })
        .expect(200);
      
      expect(response.body.uml).toBeDefined();
    }, 30000);
  });

  describe('🌐 WebSocket Real-time Features', () => {
    it('should establish WebSocket connection', (done) => {
      const ws = new WebSocket(`${WS_BASE.replace('localhost', '127.0.0.1')}`);
      
      ws.on('open', () => {
        expect(ws.readyState).toBe(WebSocket.OPEN);
        ws.close();
        done();
      });
      
      ws.on('error', (error) => {
        done(error);
      });
    });

    it('should handle real-time message streaming', (done) => {
      const ws = new WebSocket(`${WS_BASE.replace('localhost', '127.0.0.1')}`);
      let messageReceived = false;
      
      ws.on('open', () => {
        ws.send(JSON.stringify({
          type: 'chat_message',
          data: { content: 'Test streaming message', conversationId: 'test-123' }
        }));
      });
      
      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'ai_response_chunk') {
          messageReceived = true;
          ws.close();
          done();
        }
      });
      
      ws.on('error', done);
      
      setTimeout(() => {
        if (!messageReceived) {
          ws.close();
          done(new Error('No message received within timeout'));
        }
      }, 10000);
    });
  });

  describe('🔒 Security & Error Handling', () => {
    let authCookie: string;

    beforeAll(async () => {
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({ username: 'user', password: 'password' });
      authCookie = loginResponse.headers['set-cookie'][0];
    });

    it('should handle malformed requests gracefully', async () => {
      const response = await request(app)
        .post('/api/chat/conversations/invalid-id/messages')
        .set('Cookie', authCookie)
        .send({ invalid: 'data' })
        .expect(400);
      
      expect(response.body.error).toBeDefined();
    });

    it('should validate file uploads', async () => {
      const largeFile = Buffer.alloc(100 * 1024 * 1024); // 100MB
      
      const response = await request(app)
        .post('/api/upload')
        .set('Cookie', authCookie)
        .attach('file', largeFile, 'large.txt')
        .expect(413);
      
      expect(response.body.error).toContain('large');
    });

    it('should rate limit requests', async () => {
      const promises = Array(20).fill(null).map(() =>
        request(app)
          .get('/api/chat/models')
          .set('Cookie', authCookie)
      );
      
      const responses = await Promise.all(promises);
      const rateLimited = responses.some(r => r.status === 429);
      
      // Should eventually hit rate limit
      expect(rateLimited).toBe(true);
    });
  });

  describe('📈 Performance & Load', () => {
    let authCookie: string;

    beforeAll(async () => {
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({ username: 'user', password: 'password' });
      authCookie = loginResponse.headers['set-cookie'][0];
    });

    it('should respond quickly to health checks', async () => {
      const start = Date.now();
      
      const response = await request(app)
        .get('/api/health')
        .expect(200);
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(100); // Should respond in under 100ms
      expect(response.body.status).toBe('healthy');
    });

    it('should handle concurrent requests', async () => {
      const promises = Array(10).fill(null).map(() =>
        request(app)
          .get('/api/chat/models')
          .set('Cookie', authCookie)
      );
      
      const responses = await Promise.all(promises);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
      });
    });

    it('should maintain session consistency under load', async () => {
      const promises = Array(5).fill(null).map(() =>
        request(app)
          .post('/api/chat/conversations')
          .set('Cookie', authCookie)
          .send({ title: 'Load Test Conversation' })
      );
      
      const responses = await Promise.all(promises);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.id).toBeDefined();
      });
    });
  });
});
