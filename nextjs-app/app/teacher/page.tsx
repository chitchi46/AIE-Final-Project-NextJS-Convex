"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart, FileText, Users, Activity, Plus, Settings } from "lucide-react";
import { AuthGuard } from "@/components/auth-guard";

export default function TeacherDashboard() {
  return (
    <AuthGuard allowedRoles={["teacher", "admin"]}>
      <div className="container mx-auto py-8 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">教師ダッシュボード</h1>
            <p className="text-muted-foreground mt-2">講義とQAシステムの管理</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* QA管理 */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                QA管理
              </CardTitle>
              <CardDescription>
                問題の作成、編集、公開管理
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/teacher/qa-management">
                <Button className="w-full">
                  管理画面を開く
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* 分析・統計 */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart className="h-5 w-5" />
                分析・統計
              </CardTitle>
              <CardDescription>
                講義とQAの統計情報
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/teacher/analytics">
                <Button className="w-full">
                  統計を見る
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* 学生分析 */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                学生分析
              </CardTitle>
              <CardDescription>
                学生の学習状況分析
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/teacher/student-analytics">
                <Button className="w-full">
                  分析を見る
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* 監査ログ */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                操作監査ログ
              </CardTitle>
              <CardDescription>
                システム操作の履歴確認
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/teacher/audit-logs">
                <Button className="w-full">
                  ログを確認
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* 改善提案 */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                改善提案
              </CardTitle>
              <CardDescription>
                システム改善提案の管理
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/teacher/improvements">
                <Button className="w-full">
                  提案を見る
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* クイックアクション */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                クイックアクション
              </CardTitle>
              <CardDescription>
                よく使う機能への素早いアクセス
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/teacher/qa-management?action=create" className="block">
                <Button variant="outline" className="w-full justify-start">
                  新しいQAを作成
                </Button>
              </Link>
              <Link href="/teacher/analytics" className="block">
                <Button variant="outline" className="w-full justify-start">
                  今日の統計を確認
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* 最近の活動 */}
        <Card>
          <CardHeader>
            <CardTitle>最近の活動</CardTitle>
            <CardDescription>直近の重要な変更とアクティビティ</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">監査ログシステム</p>
                  <p className="text-sm text-muted-foreground">
                    すべての操作が記録され、透明性が向上しました
                  </p>
                </div>
                <Link href="/teacher/audit-logs">
                  <Button variant="outline" size="sm">
                    確認
                  </Button>
                </Link>
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">QA管理機能強化</p>
                  <p className="text-sm text-muted-foreground">
                    検索、フィルタ、ページネーション機能が追加されました
                  </p>
                </div>
                <Link href="/teacher/qa-management">
                  <Button variant="outline" size="sm">
                    試す
                  </Button>
                </Link>
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">動的統計システム</p>
                  <p className="text-sm text-muted-foreground">
                    実際のデータに基づく統計情報が表示されます
                  </p>
                </div>
                <Link href="/teacher/analytics">
                  <Button variant="outline" size="sm">
                    見る
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AuthGuard>
  );
} 