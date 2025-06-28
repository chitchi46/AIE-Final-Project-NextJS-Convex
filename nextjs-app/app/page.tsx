"use client";

import dynamic from "next/dynamic";
import { LoadingSpinner } from "@/components/loading-spinner";

// SSRを無効化してHomeコンポーネントをインポート
const HomeContent = dynamic(
  () => import("./HomeContent"),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" text="読み込み中..." />
      </div>
    ),
  }
);

export default function Home() {
  return <HomeContent />;
}
