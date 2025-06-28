# 講義内容確認Q&Aシステム

OpenAI GPT-4とConvexを使用した講義内容確認Q&Aシステム

## 🚀 プロジェクト概要

このプロジェクトは講義資料から自動的にQ&Aを生成し、学生の理解度を測定・可視化するシステムです。Next.js + Convex + shadcn/uiの最新技術スタックで実装されており、パーソナライズ学習機能を含む高度な教育支援システムです。

## 📋 最新の改善情報

### 2025年6月25日 - Q&A生成精度向上アップデート

**ブランチ**: `feature/improve-qa-generation-accuracy`

#### 🎯 主な改善点

1. **Q&A生成の精度向上**
   - 資料内容のみに基づく正確なQ&A生成
   - OpenAI プロンプトの大幅改良
   - 外部知識や推測の使用を完全に禁止
   - より具体的で資料に忠実な質問作成

2. **PDF解析機能の強化**
   - セクション構造の自動認識
   - 見出しと箇条書きの適切な整形
   - 重要な定義や数値データの強調
   - より構造化されたテキスト抽出

3. **エラーハンドリングとデバッグ機能**
   - 詳細なログ出力システム
   - OpenAI API応答の検証強化
   - 各処理段階での状況確認
   - エラー発生時の原因特定容易化

4. **認証システムの改善**
   - ユーザーID処理の修正
   - 互換性を保った認証フロー
   - セキュリティの向上

#### 🔧 技術的改善

- **OpenAI プロンプトエンジニアリング**: より制約の厳しいプロンプト設計
- **Temperature調整**: 0.7 → 0.3 に下げて一貫性向上
- **PDF抽出アルゴリズム**: 構造認識機能の追加
- **ログシステム**: 包括的なデバッグ情報出力

#### 📊 期待される効果

- **正確性**: 資料に記載された内容のみからQ&A生成
- **信頼性**: 推測や想像による不正確な情報を排除
- **保守性**: 問題発生時の迅速な原因特定
- **ユーザビリティ**: より適切で学習効果の高いQ&A

## 🏗️ アーキテクチャ

### 現在のアーキテクチャ（feature/personalization-and-fixes）

```
nextjs-app/
├── app/                    # Next.js 15 App Router
│   ├── dashboard/         # ダッシュボードページ
│   ├── lectures/          # 講義管理ページ
│   ├── quiz/              # クイズ回答ページ
│   │   ├── [id]/          # 通常のクイズ
│   │   └── personalized/  # パーソナライズクイズ
│   ├── analytics/         # 分析ページ
│   ├── live/              # ライブクイズ機能
│   └── api/               # API Routes（認証等）
├── components/            # UIコンポーネント（shadcn/ui）
│   ├── ui/                # 基本UIコンポーネント
│   ├── file-upload.tsx    # ファイルアップロード
│   └── file-processing-status.tsx
├── convex/                # Convexバックエンド
│   ├── schema.ts          # データスキーマ定義
│   ├── qa.ts              # Q&A関連の関数
│   ├── lectures.ts        # 講義管理関数
│   ├── personalization.ts # パーソナライズ学習
│   ├── analytics.ts       # 分析・統計
│   ├── improvements.ts    # 改善提案
│   ├── liveQuiz.ts        # ライブクイズ
│   └── actions/           # 非同期アクション（OpenAI API等）
└── lib/                   # ユーティリティ関数
```

## 🔧 技術スタック

### 現在の実装

* **フロントエンド**: 
  - Next.js 15 (App Router, RSC)
  - TypeScript
  - shadcn/ui (UIコンポーネント)
  - Tailwind CSS
  - Framer Motion (アニメーション)
  - Recharts (データ可視化)
* **バックエンド**: 
  - Convex (BaaS - データベース + リアルタイムクエリ)
* **AI/ML**: 
  - OpenAI GPT-4 API (Q&A生成、パーソナライズ分析)
* **認証**: 
  - 独自認証システム（JWT）

### レガシー実装（master）

* **フロントエンド**: Streamlit
* **バックエンド**: FastAPI
* **データベース**: SQLite
* **AI/ML**: OpenAI GPT-4o, LangChain
* **ベクトル検索**: FAISS

## ✨ 主な機能

### 実装済み機能（✅）

#### 必須機能
* ✅ **F-01 QA自動生成**: OpenAI APIを使用した講義資料からの自動Q&A生成
* ✅ **F-02 難易度調整**: 易・中・難の3段階難易度設定
* ✅ **F-03 QA回答UI**: 選択式・記述式・穴埋め式対応
* ✅ **F-04 結果集計**: リアルタイム統計・正答率計算

#### 発展機能
* ✅ **F-05 QA管理CRUD**: 講義・Q&Aの作成・編集・削除
* ✅ **F-06 理解度ダッシュボード**: 統計表示・トレンド分析
* ✅ **F-07 改善提案**: AIによる講義改善提案（バックエンド実装済み）
* ✅ **F-08 パーソナライズ出題**: 学習履歴に基づく個別最適化

#### 追加機能
* ✅ **ファイルアップロード**: PDF、Markdown、音声、動画対応
* ✅ **ライブクイズ**: リアルタイムクイズセッション
* ✅ **統計ダッシュボード**: 
  - トレンド表示（前週比）
  - ミニチャート表示
  - 難易度別正答率
* ✅ **リッチUI**: 
  - モダンなデザイン
  - スムーズなアニメーション
  - レスポンシブ対応
* ✅ **講義削除機能**: 関連データの安全な削除

### パーソナライズ学習機能の詳細

* **学習レベル判定**: 初級🌱・中級🌿・上級🌳の自動判定
* **難易度配分調整**: 学習履歴に基づく問題難易度の最適化
* **忘却曲線対応**: 時間経過を考慮した問題優先度付け
* **学習アドバイス**: AIによる個別学習指導
* **進捗可視化**: 学習状況のリアルタイム表示

### 開発中機能（🚧）

* 🚧 **改善提案UI**: フロントエンド画面の実装
* 🚧 **理解度ヒートマップ**: 視覚的な理解度表示
* 🚧 **高度な分析機能**: より詳細な学習分析

## 🚀 セットアップ

### Next.js版（推奨）

```bash
# リポジトリのクローン
git clone https://github.com/chitchi46/AIE_final_project.git
cd AIE_final_project

# 最新の改善版を使用する場合（推奨）
git checkout feature/improve-qa-generation-accuracy

# または、パーソナライズ機能版を使用する場合
# git checkout feature/personalization-and-fixes

# 依存関係のインストール
cd nextjs-app
npm install

# Convexプロジェクトの初期化
npx convex dev

# 環境変数の設定
npx convex env set OPENAI_API_KEY "your-openai-api-key"

# 開発サーバーの起動
npm run dev        # Next.js（ターミナル1）
npx convex dev     # Convex（ターミナル2）
```

アプリケーション: http://localhost:3000

### 環境変数

`.env.local`ファイルが自動生成されます：
```
CONVEX_DEPLOYMENT=your-deployment
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
```

### Streamlit版（レガシー）

```bash
# 依存関係のインストール
pip install -r requirements.txt

# 環境変数の設定
echo "OPENAI_API_KEY=your_key" > .env

# サーバーの起動
python -m uvicorn src.api.main:app --reload  # FastAPI
streamlit run streamlit_app.py                # Streamlit（別ターミナル）
```

### ローカル開発環境のセットアップ

1. **リポジトリのクローン**:
   ```bash
   git clone https://github.com/your-username/your-repo-name.git
   cd your-repo-name
   ```

2.  **コミット履歴のクレンジング (初回のみ)**:
    過去にコミットされた可能性のある機密情報を履歴から完全に削除します。
    ```bash
    npm run scrub-history
    ```

3. **依存関係のインストール**:
   ```bash
   npm install
   ```

### Development

1. Navigate to the Next.js app directory:
   ```bash
   cd nextjs-app
   ```

2. Copy the environment variables template:
   ```bash
   cp .env.example .env.local
   ```

3. Update `.env.local` with your actual values (never commit this file)

4. Install dependencies:
   ```bash
   npm install
   ```

5. Run the development server:
   ```bash
   npm run dev
   ```

### Security

#### Removing Sensitive Data from Git History

If sensitive data was accidentally committed, use the following command to remove it from git history:
```bash
npm run scrub-history
```
Note: This requires `git-filter-repo` to be installed. On Windows, you may need to use WSL or Git Bash.

#### Pre-commit Hooks

This project uses Husky to prevent committing sensitive information. The pre-commit hook will:
- Scan for API keys and tokens
- Check for forbidden files
- Run tests

## 📊 パフォーマンス

* **Q&A生成時間**: 10-30秒（10問）
* **リアルタイム更新**: Convexによる即時反映
* **同時接続**: 制限なし（Convex Cloud）
* **パーソナライズ分析**: 1秒以内
* **ファイル処理**: 並列処理による高速化

## 🎨 UI/UXの特徴

* **モダンデザイン**: shadcn/uiによる洗練されたUI
* **アニメーション**: Framer Motionによる滑らかな遷移
* **データ可視化**: Rechartsによるインタラクティブなグラフ
* **レスポンシブデザイン**: モバイル・タブレット完全対応
* **アクセシビリティ**: WCAG 2.1準拠
* **ダークモード**: システム設定に対応

## 🔧 最新の更新内容

### v2.1.0 (2025-06-22)
* ✅ パーソナライズ学習機能の完全実装
* ✅ 講義削除機能の追加（関連データの安全な削除）
* ✅ TypeScript型エラーの完全解消
* ✅ 構文エラー修正とビルド安定化
* ✅ UI/UXの大幅改善

### v2.0.0 (2025-06-15)
* ✅ Next.js + Convexへの完全移行
* ✅ 全必須機能の実装完了
* ✅ 発展機能の主要部分実装

## 🤝 コントリビューション

1. このリポジトリをフォーク
2. 機能ブランチを作成 (`git checkout -b feature/AmazingFeature`)
3. 変更をコミット (`git commit -m 'Add some AmazingFeature'`)
4. ブランチにプッシュ (`git push origin feature/AmazingFeature`)
5. Pull Requestを作成

## 🐛 トラブルシューティング

### よくある問題

1. **Convexエラー**: `npx convex dev`でプロジェクトを再初期化
2. **ビルドエラー**: `npm run build`でTypeScriptエラーを確認
3. **ポート競合**: 他のNext.jsプロセスを終了してから再起動

### サポート

問題や質問がある場合は、[GitHubのIssues](https://github.com/chitchi46/AIE_final_project/issues)でお知らせください。

## 📄 ライセンス

このプロジェクトはMITライセンスの下で公開されています。

## 📞 お問い合わせ

問題や質問がある場合は、[GitHubのIssues](https://github.com/chitchi46/AIE_final_project/issues)でお知らせください。 