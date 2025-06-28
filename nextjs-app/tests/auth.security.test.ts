import { NextApiRequest, NextApiResponse } from 'next';
import { createMocks, createRequest, createResponse } from 'node-mocks-http';
import { GET } from '@/app/api/auth/me/route';
import { POST as loginPOST } from '@/app/api/auth/login/route';
import { NextRequest } from "next/server";

// モックの設定
const mockEnv = process.env;

beforeEach(() => {
  jest.resetModules();
  process.env = { ...mockEnv };
});

afterEach(() => {
  process.env = mockEnv;
});

describe('/api/auth security middleware', () => {

  it('should return 500 if JWT_SECRET is not set in /api/auth/me', async () => {
    jest.spyOn(process, 'env', 'get').mockReturnValue({ ...process.env, JWT_SECRET: '' });
    
    const { req } = createMocks({ method: 'GET' });
    const response = await GET(req as any);

    expect(response.status).toBe(500);
  });

  it('should return 500 if JWT_SECRET is too short in /api/auth/me', async () => {
    jest.spyOn(process, 'env', 'get').mockReturnValue({ ...process.env, JWT_SECRET: 'short-secret' });
    
    const { req } = createMocks({ method: 'GET' });
    const response = await GET(req as any);

    expect(response.status).toBe(500);
  });

  it('should return 500 if JWT_SECRET is not set in /api/auth/login', async () => {
    jest.spyOn(process, 'env', 'get').mockReturnValue({ ...process.env, JWT_SECRET: '' });
    
    const req = createRequest({ 
        method: 'POST', 
        body: { email: 'test@test.com', password: 'password' } 
    });
    const response = await loginPOST(req as any);

    expect(response.status).toBe(500);
    const text = await response.text();
    expect(text).toContain('Application is not securely configured');
  });

  it('should return 500 if JWT_SECRET is too short in /api/auth/login', async () => {
    jest.spyOn(process, 'env', 'get').mockReturnValue({ ...process.env, JWT_SECRET: 'short-secret' });
    
    const req = createRequest({ 
        method: 'POST', 
        body: { email: 'test@test.com', password: 'password' } 
    });
    const response = await loginPOST(req as any);

    expect(response.status).toBe(500);
    const text = await response.text();
    expect(text).toContain('Application is not securely configured');
  });
});

describe("Auth Security Tests", () => {
  describe("JWT_SECRET validation", () => {
    it("should return 500 if JWT_SECRET is not set", async () => {
      // JWT_SECRETを削除
      delete process.env.JWT_SECRET;
      
      // loginルートを動的にインポート
      const { POST } = await import("../app/api/auth/login/route");
      
      const request = new Request("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "test@example.com",
          password: "password123",
        }),
      });
      
      const response = await POST(request);
      
      expect(response.status).toBe(500);
      const text = await response.text();
      expect(text).toContain("Internal Server Error");
    });

    it("should return 500 if JWT_SECRET is too short", async () => {
      // 短いJWT_SECRETを設定
      process.env.JWT_SECRET = "short-key";
      
      // loginルートを動的にインポート
      const { POST } = await import("../app/api/auth/login/route");
      
      const request = new Request("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "test@example.com",
          password: "password123",
        }),
      });
      
      const response = await POST(request);
      
      expect(response.status).toBe(500);
    });

    it("should return 500 for register endpoint if JWT_SECRET is invalid", async () => {
      process.env.JWT_SECRET = "insecure";
      
      const { POST } = await import("../app/api/auth/register/route");
      
      const request = new NextRequest("http://localhost:3000/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "newuser@example.com",
          password: "Password123!",
          name: "New User",
          role: "student",
        }),
      });
      
      const response = await POST(request);
      
      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toContain("Internal Server Error");
    });

    it("should return 500 for me endpoint if JWT_SECRET is invalid", async () => {
      process.env.JWT_SECRET = "too-short";
      
      const { GET } = await import("../app/api/auth/me/route");
      
      const response = await GET();
      
      expect(response.status).toBe(500);
    });
  });

  describe("Secure defaults", () => {
    it("should not accept default JWT_SECRET value", async () => {
      process.env.JWT_SECRET = "your-secret-key-for-jwt-authentication";
      
      const { POST } = await import("../app/api/auth/login/route");
      
      const request = new Request("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "test@example.com",
          password: "password123",
        }),
      });
      
      const response = await POST(request);
      
      // デフォルト値は32文字以上だが、本番環境では使用すべきでない
      expect(response.status).toBe(500);
    });
  });
}); 