// 環境変数のセキュリティテスト
// Convex認証を使用しているため、API Routesの直接的なテストは不要

describe("Environment Variables Security Tests", () => {
  describe("JWT_SECRET validation", () => {
    it("should have JWT_SECRET set in test environment", () => {
      expect(process.env.JWT_SECRET).toBeDefined();
      expect(process.env.JWT_SECRET?.length).toBeGreaterThanOrEqual(32);
    });

    it("should not use default JWT_SECRET value", () => {
      expect(process.env.JWT_SECRET).not.toBe("your-secret-key-for-jwt-authentication");
      expect(process.env.JWT_SECRET).not.toBe("your-secure-jwt-secret-key-at-least-32-characters-long");
    });
  });

  describe("Convex configuration validation", () => {
    it("should have NEXT_PUBLIC_CONVEX_URL set", () => {
      expect(process.env.NEXT_PUBLIC_CONVEX_URL).toBeDefined();
      expect(process.env.NEXT_PUBLIC_CONVEX_URL).toMatch(/^https:\/\/.+\.convex\.cloud$/);
    });

    it("should have CONVEX_DEPLOYMENT set", () => {
      expect(process.env.CONVEX_DEPLOYMENT).toBeDefined();
      expect(process.env.CONVEX_DEPLOYMENT?.length).toBeGreaterThan(0);
    });
  });

  describe("Security best practices", () => {
    it("should not have sensitive data in environment", () => {
      // 実際のAPIキーが環境変数に含まれていないことを確認
      const sensitivePatterns = [
        /sk-[a-zA-Z0-9]{20,}/,
        /sk-proj-[a-zA-Z0-9]{40,}/,
        /cnx_[a-zA-Z0-9]{20,}/
      ];

      const envString = JSON.stringify(process.env);
      sensitivePatterns.forEach(pattern => {
        expect(envString).not.toMatch(pattern);
      });
    });
  });
}); 