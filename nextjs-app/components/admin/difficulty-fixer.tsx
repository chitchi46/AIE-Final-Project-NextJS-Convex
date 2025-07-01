"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, Settings } from "lucide-react";
import { toast } from "sonner";

export function DifficultyFixer() {
  const [isFixing, setIsFixing] = useState(false);
  const [fixResult, setFixResult] = useState<{ success: boolean; fixedCount: number; message: string } | null>(null);

  const fixDifficulties = useMutation(api.qa.fixDescriptiveDifficulties);

  const handleFix = async () => {
    setIsFixing(true);
    try {
      const result = await fixDifficulties({});
      setFixResult(result);
      
      if (result.success) {
        toast.success(result.message, {
          description: `${result.fixedCount}件の記述問題の難易度を適切に修正しました`
        });
      } else {
        toast.error("修正に失敗しました");
      }
    } catch (error) {
      console.error("難易度修正エラー:", error);
      toast.error("修正中にエラーが発生しました", {
        description: error instanceof Error ? error.message : "不明なエラー"
      });
    } finally {
      setIsFixing(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-orange-600" />
          <CardTitle>難易度設定修正ツール</CardTitle>
        </div>
        <CardDescription>
          記述問題の難易度が「易」に設定されている問題を適切な難易度に修正します
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div className="space-y-2">
              <h4 className="font-medium text-yellow-900">修正内容</h4>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• 記述問題（descriptive/essay）で難易度が「易」の問題を検出</li>
                <li>• 問題内容を分析して適切な難易度（中・難）に変更</li>
                <li>• 「説明」「論じ」「考察」などの単語を含む問題は「難」に設定</li>
                <li>• その他の記述問題は「中」に設定</li>
              </ul>
            </div>
          </div>
        </div>

        {fixResult && (
          <div className={`p-4 rounded-lg border ${
            fixResult.success 
              ? "bg-green-50 border-green-200" 
              : "bg-red-50 border-red-200"
          }`}>
            <div className="flex items-center gap-2">
              {fixResult.success ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-red-600" />
              )}
              <div>
                <p className={`font-medium ${
                  fixResult.success ? "text-green-900" : "text-red-900"
                }`}>
                  {fixResult.message}
                </p>
                {fixResult.success && fixResult.fixedCount > 0 && (
                  <p className="text-sm text-green-700 mt-1">
                    修正された問題数: {fixResult.fixedCount}件
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-center pt-4">
          <Button 
            onClick={handleFix}
            disabled={isFixing}
            className="min-w-[200px]"
          >
            {isFixing ? (
              <>
                <Settings className="h-4 w-4 mr-2 animate-spin" />
                修正中...
              </>
            ) : (
              <>
                <Settings className="h-4 w-4 mr-2" />
                難易度を修正
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 