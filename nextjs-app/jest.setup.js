// Jest設定用のセットアップファイル
// 必要に応じてグローバルな設定を追加

// Convexのモックを設定（必要に応じて）
jest.mock('convex/browser', () => ({
  ConvexHttpClient: jest.fn().mockImplementation(() => ({
    query: jest.fn(),
    mutation: jest.fn(),
    action: jest.fn(),
  })),
})); 