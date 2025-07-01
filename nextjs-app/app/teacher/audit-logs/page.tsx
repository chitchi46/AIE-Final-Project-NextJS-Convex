"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

const actionLabels = {
  create: "作成",
  update: "更新",
  delete: "削除",
  publish: "公開",
  unpublish: "非公開",
  bulk_action: "一括操作",
};

const resourceTypeLabels = {
  qa_template: "QA",
  lecture: "講義",
  student: "学生",
  user: "ユーザー",
  improvement_suggestion: "改善提案",
};

const actionColors = {
  create: "bg-green-100 text-green-800",
  update: "bg-blue-100 text-blue-800",
  delete: "bg-red-100 text-red-800",
  publish: "bg-purple-100 text-purple-800",
  unpublish: "bg-gray-100 text-gray-800",
  bulk_action: "bg-orange-100 text-orange-800",
};

export default function AuditLogsPage() {
  const [filterAction, setFilterAction] = useState<string>("");
  const [filterResourceType, setFilterResourceType] = useState<string>("");
  const [filterUserId, setFilterUserId] = useState<string>("");

  // 監査ログを取得
  const logsData = useQuery(api.auditLogs.getAuditLogs, {
    action: filterAction !== "" && filterAction !== "all" ? filterAction as any : undefined,
    resourceType: filterResourceType !== "" && filterResourceType !== "all" ? filterResourceType as any : undefined,
    userId: filterUserId || undefined,
  });

  // 統計情報を取得
  const stats = useQuery(api.auditLogs.getAuditLogStats, {});

  if (!logsData || !stats) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">読み込み中...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">操作監査ログ</h1>
          <p className="text-muted-foreground mt-2">システム内の操作履歴を確認できます</p>
        </div>
      </div>

      {/* 統計情報 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">総操作数</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.totalActions}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">最も多い操作</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {Object.entries(stats.actionCounts).length > 0
                ? actionLabels[Object.entries(stats.actionCounts).sort(([,a], [,b]) => b - a)[0][0] as keyof typeof actionLabels]
                : "-"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">最も多いリソース</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {Object.entries(stats.resourceTypeCounts).length > 0
                ? resourceTypeLabels[Object.entries(stats.resourceTypeCounts).sort(([,a], [,b]) => b - a)[0][0] as keyof typeof resourceTypeLabels]
                : "-"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">アクティブユーザー数</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{Object.keys(stats.userActionCounts).length}</p>
          </CardContent>
        </Card>
      </div>

      {/* フィルター */}
      <Card>
        <CardHeader>
          <CardTitle>フィルター</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-wrap">
            <Select value={filterAction} onValueChange={setFilterAction}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="操作タイプ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                {Object.entries(actionLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterResourceType} onValueChange={setFilterResourceType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="リソースタイプ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                {Object.entries(resourceTypeLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={() => {
                setFilterAction("");
                setFilterResourceType("");
                setFilterUserId("");
              }}
            >
              フィルターをクリア
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ログ一覧 */}
      <Card>
        <CardHeader>
          <CardTitle>操作履歴</CardTitle>
          <CardDescription>最新の操作から表示されています</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {logsData.logs.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                ログが見つかりませんでした
              </p>
            ) : (
              logsData.logs.map((log) => (
                <div
                  key={log._id}
                  className="border rounded-lg p-4 space-y-2 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className={actionColors[log.action]}>
                        {actionLabels[log.action]}
                      </Badge>
                      <Badge variant="outline">
                        {resourceTypeLabels[log.resourceType]}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        by {log.userEmail}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      {format(new Date(log.timestamp), "yyyy/MM/dd HH:mm:ss", { locale: ja })}
                    </div>
                  </div>
                  
                  {log.details?.description && (
                    <p className="text-sm">{log.details.description}</p>
                  )}

                  {log.details && (log.details.previousValue || log.details.newValue) && (
                    <details className="text-sm">
                      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                        詳細を表示
                      </summary>
                      <div className="mt-2 space-y-2">
                        {log.details.previousValue && (
                          <div>
                            <p className="font-medium">変更前:</p>
                            <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">
                              {JSON.stringify(log.details.previousValue, null, 2)}
                            </pre>
                          </div>
                        )}
                        {log.details.newValue && (
                          <div>
                            <p className="font-medium">変更後:</p>
                            <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">
                              {JSON.stringify(log.details.newValue, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </details>
                  )}
                </div>
              ))
            )}
          </div>

          {logsData.hasMore && (
            <div className="mt-4 text-center">
              <Button variant="outline">さらに読み込む</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 