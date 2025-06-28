"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle, Clock, FileText, Sparkles } from "lucide-react";

interface ProcessingStep {
  id: string;
  name: string;
  status: "pending" | "processing" | "completed" | "error";
  message?: string;
  progress?: number;
}

interface FileProcessingStatusProps {
  fileName: string;
  steps: ProcessingStep[];
  onComplete?: () => void;
  onError?: (error: string) => void;
}

export function FileProcessingStatus({
  fileName,
  steps,
  onComplete,
  onError,
}: FileProcessingStatusProps) {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const completedSteps = steps.filter(step => step.status === "completed").length;
    const errorSteps = steps.filter(step => step.status === "error").length;
    
    if (errorSteps > 0) {
      const errorStep = steps.find(step => step.status === "error");
      onError?.(errorStep?.message || "処理中にエラーが発生しました");
    } else if (completedSteps === steps.length) {
      onComplete?.();
    }
  }, [steps, onComplete, onError]);

  const getStepIcon = (status: ProcessingStep["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "processing":
        return <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: ProcessingStep["status"]) => {
    switch (status) {
      case "completed":
        return <Badge variant="default" className="bg-green-100 text-green-800">完了</Badge>;
      case "processing":
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">処理中</Badge>;
      case "error":
        return <Badge variant="destructive">エラー</Badge>;
      default:
        return <Badge variant="outline">待機中</Badge>;
    }
  };

  const overallProgress = (steps.filter(s => s.status === "completed").length / steps.length) * 100;

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          ファイル処理状況
        </CardTitle>
        <div className="text-sm text-gray-600">
          {fileName}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 全体の進捗 */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>全体の進捗</span>
            <span>{Math.round(overallProgress)}%</span>
          </div>
          <Progress value={overallProgress} className="h-2" />
        </div>

        {/* ステップ詳細 */}
        <div className="space-y-4">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-start gap-3 p-3 rounded-lg border">
              <div className="mt-0.5">
                {getStepIcon(step.status)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-medium">{step.name}</h4>
                  {getStatusBadge(step.status)}
                </div>
                {step.message && (
                  <p className="text-sm text-gray-600">{step.message}</p>
                )}
                {step.status === "processing" && step.progress !== undefined && (
                  <div className="mt-2">
                    <Progress value={step.progress} className="h-1" />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* 完了メッセージ */}
        {overallProgress === 100 && (
          <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg">
            <Sparkles className="h-5 w-5 text-green-600" />
            <div>
              <h4 className="font-medium text-green-900">処理完了！</h4>
              <p className="text-sm text-green-700">
                ファイルの解析とQ&A生成が正常に完了しました。
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 