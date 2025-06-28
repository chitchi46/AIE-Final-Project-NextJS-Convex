import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  serverExternalPackages: ['convex'],
  // WSL2環境でのアクセスを可能にする
  async rewrites() {
    return [];
  },
  // pdf.jsのワーカーを適切に処理
  webpack: (config, { isServer }) => {
    // クライアントサイドでのみpdf.jsワーカーを設定
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        // canvas関連のポリフィルを無効化（ブラウザ環境では不要）
        canvas: false,
      };
    }
    return config;
  },
};

export default nextConfig;
