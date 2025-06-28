"use client";

import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";

interface User {
  _id: string;
  id: string; // 互換性のため
  email: string;
  name: string;
  role: "student" | "teacher" | "admin";
}

export function useAuth() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const { signOut: authSignOut } = useAuthActions();
  
  // コンポーネントがマウントされたことを確認
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  // Convexフックは常に呼び出す（条件付きで呼び出さない）
  const userQuery = useQuery(api.auth.getCurrentUser);
  
  // マウント前は初期状態を返す
  if (!isMounted) {
    return {
      user: null,
      isLoading: true,
      isAuthenticated: false,
      logout: () => {},
      refetch: () => {},
    };
  }
  
  // ユーザー情報の取得状態
  // userQueryがundefinedの場合はローディング中
  // userQueryがnullの場合は認証されていない（ローディング完了）
  const isLoading = userQuery === undefined;
  const isAuthenticated = userQuery !== null && userQuery !== undefined;

  const logout = async () => {
    try {
      await authSignOut();
      toast.success("ログアウトしました");
      router.push("/login");
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("ログアウトに失敗しました");
    }
  };

  return {
    user: userQuery as User | null,
    isLoading,
    isAuthenticated,
    logout,
    refetch: () => {}, // Convexでは自動的に更新されるため不要
  };
} 