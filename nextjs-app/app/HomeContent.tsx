"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { LoadingSpinner } from "@/components/loading-spinner";

export default function HomeContent() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        // ユーザーのロールに応じてリダイレクト
        if (user.role === "teacher" || user.role === "admin") {
          router.push("/dashboard");
        } else {
          router.push("/student/dashboard");
        }
      } else {
        // 未認証の場合はログインページへ
        router.push("/login");
      }
    }
  }, [user, isLoading, router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <LoadingSpinner size="lg" text="読み込み中..." />
    </div>
  );
} 