# 講義内容確認QAシステム

## 概要

OpenAI GPT-4とConvexを使用した講義内容確認Q&Aシステムです。講義資料から自動的にQ&Aを生成し、学生の理解度を測定・可視化します。

## 技術スタック

- **フロントエンド**: Next.js 15 (App Router, RSC), TypeScript
- **UI**: shadcn/ui + Tailwind CSS
- **バックエンド**: Convex (BaaS)
- **AI/ML**: OpenAI API (GPT-4)

## セットアップ

1. 依存関係のインストール
```bash
npm install
```

2. 環境変数の設定
`.env.local`ファイルを作成し、以下の環境変数を設定:
```
# Convex
CONVEX_DEPLOYMENT=hip-warbler-598
NEXT_PUBLIC_CONVEX_URL=https://hip-warbler-598.convex.cloud

# OpenAI
OPENAI_API_KEY=your-openai-api-key
```

注意: 
- Convexの値は既に設定済みです
- OpenAI APIキーは https://platform.openai.com/api-keys から取得できます
- Convexの環境変数は `npx convex env set OPENAI_API_KEY your-api-key` で設定します

3. Convex開発サーバーの起動
```bash
npx convex dev
```

4. Next.js開発サーバーの起動
```bash
npm run dev
```

## 主な機能

- **QA自動生成**: 講義資料からAIが自動的にQ&Aを生成
- **難易度調整**: 易・中・難の3段階で質問レベルを調整
- **リアルタイム統計**: 回答状況をリアルタイムで集計・表示
- **改善提案**: 低正答率の項目に対してAIが改善案を提示

## ディレクトリ構造

```
nextjs-app/
├── app/              # Next.js App Router
├── components/       # UIコンポーネント
├── convex/          # Convexバックエンド関数
└── lib/             # ユーティリティ関数
```

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
