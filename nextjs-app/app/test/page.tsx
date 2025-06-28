"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TestPage() {
  const [status, setStatus] = useState<string>("未テスト");
  const [error, setError] = useState<string>("");

  const testAPI = async () => {
    setStatus("テスト中...");
    setError("");

    try {
      // ログインAPIテスト
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "test@example.com",
          password: "password123",
        }),
      });

      if (response.status === 500) {
        setError("JWT_SECRETエラー: 環境変数が正しく設定されていません");
      } else if (response.status === 401) {
        setStatus("✅ APIは正常に動作しています（認証失敗は想定内）");
      } else {
        const data = await response.json();
        setStatus(`✅ APIレスポンス: ${response.status}`);
      }
    } catch (err) {
      setError(`エラー: ${err}`);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>セキュリティ設定テスト</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-gray-600">ステータス: {status}</p>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
          <Button onClick={testAPI} className="w-full">
            APIテスト実行
          </Button>
          <div className="text-xs text-gray-500">
            <p>JWT_SECRET: {process.env.JWT_SECRET ? "設定済み" : "未設定"}</p>
            <p>環境: {process.env.NODE_ENV}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 