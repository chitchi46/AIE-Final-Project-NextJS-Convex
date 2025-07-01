/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  // ESモジュールをサポート
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      useESM: true
    }]
  },
  // テスト実行前の環境変数設定
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  // transformIgnorePatternsを設定してConvexモジュールを変換対象に含める
  transformIgnorePatterns: [
    'node_modules/(?!(convex)/)'
  ],
  // モジュール拡張子の設定
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  // テストファイルのパターン
  testMatch: ['**/tests/**/*.test.(ts|tsx|js)'],
  // 環境変数を設定
  setupFiles: ['<rootDir>/jest.env.js']
}; 