
import request from 'supertest';

export async function performHealthCheck(app: any): Promise<boolean> {
  try {
    const response = await request(app)
      .get('/api/health')
      .timeout(5000);
    
    return response.status === 200 && response.body.status === 'healthy';
  } catch (error) {
    console.error('Health check failed:', error);
    return false;
  }
}

export async function waitForServer(app: any, maxAttempts = 10): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    const healthy = await performHealthCheck(app);
    if (healthy) return true;
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  return false;
}
