"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { LoadingSpinner } from "./loading-spinner";

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRole?: "student" | "teacher" | "admin";
  fallbackPath?: string;
}

export function AuthGuard({ 
  children, 
  requiredRole,
  fallbackPath = "/login" 
}: AuthGuardProps) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // ログインページとレジスターページでは認証チェックをスキップ
    if (pathname === "/login" || pathname === "/register") {
      return;
    }

    if (!isLoading && !isAuthenticated) {
      router.push(fallbackPath);
    }

    if (!isLoading && isAuthenticated && requiredRole) {
      // ロールベースのアクセス制御
      if (requiredRole === "teacher" && user?.role === "student") {
        router.push("/student/dashboard");
      } else if (requiredRole === "admin" && user?.role !== "admin") {
        router.push("/dashboard");
      }
    }
  }, [isLoading, isAuthenticated, user, requiredRole, router, fallbackPath, pathname]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" text="認証情報を確認中..." />
      </div>
    );
  }

  // ログインページとレジスターページでは認証チェックをスキップ
  if (pathname === "/login" || pathname === "/register") {
    return <>{children}</>;
  }

  if (!isAuthenticated) {
    return null;
  }

  if (requiredRole && user?.role !== requiredRole && user?.role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">アクセス権限がありません</h2>
          <p className="text-gray-600">このページにアクセスする権限がありません。</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
} 