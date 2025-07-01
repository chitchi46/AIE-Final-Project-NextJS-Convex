// テスト実行時の環境変数設定
process.env.JWT_SECRET = "test-secret-key-for-ci-environment-only-32-chars";
process.env.NEXT_PUBLIC_CONVEX_URL = "https://test.convex.cloud";
process.env.CONVEX_DEPLOYMENT = "test";
process.env.OPENAI_API_KEY = "sk-test-key-for-testing-purposes-only";
process.env.NODE_ENV = "test"; 