"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadingSpinner } from "@/components/loading-spinner";
import { User, TrendingUp, Target, Clock, CheckCircle, XCircle } from "lucide-react";

interface StudentLearningModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: Id<"students">;
  lectureId?: Id<"lectures">;
}

export function StudentLearningModal({
  isOpen,
  onClose,
  studentId,
  lectureId,
}: StudentLearningModalProps) {
  const [selectedTab, setSelectedTab] = useState("overview");

  // 学生情報を取得
  const student = useQuery(api.students.getStudent, { studentId });
  
  // 学生の統計情報を取得
  const studentStats = useQuery(api.stats.statsByStudent, {
    studentId,
    lectureId,
  });

  // 学習履歴を取得
  const learningHistory = useQuery(api.qa.getLearningHistory, {
    studentId,
    limit: 20,
  });

  // パーソナライズ情報を取得（講義が指定されている場合）
  const personalizedData = useQuery(
    api.personalization.getPersonalizedQA,
    lectureId
      ? {
          studentId,
          lectureId,
          requestedCount: 0, // 推奨情報のみ取得
        }
      : "skip"
  );

  if (!student || !studentStats) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <div className="flex items-center justify-center p-8">
            <LoadingSpinner />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "easy":
        return "bg-green-100 text-green-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "hard":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 80) return "text-green-600";
    if (accuracy >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {student.name}の学習状況
          </DialogTitle>
          <DialogDescription>
            個別の学習進捗と理解度を確認できます
          </DialogDescription>
        </DialogHeader>

        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">概要</TabsTrigger>
            <TabsTrigger value="history">学習履歴</TabsTrigger>
            <TabsTrigger value="recommendations">推奨事項</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* 全体統計 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">全体パフォーマンス</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-sm text-gray-600">総回答数</p>
                    <p className="text-2xl font-bold">{studentStats.overallStats.totalResponses}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600">正答率</p>
                    <p className={`text-2xl font-bold ${getAccuracyColor(studentStats.overallStats.accuracy)}`}>
                      {studentStats.overallStats.accuracy.toFixed(1)}%
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600">正解数</p>
                    <p className="text-2xl font-bold">{studentStats.overallStats.correctResponses}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 難易度別統計 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">難易度別パフォーマンス</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(studentStats.difficultyStats).map(([difficulty, stats]) => (
                  <div key={difficulty} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className={getDifficultyColor(difficulty)}>
                        {difficulty === "easy" ? "易" : difficulty === "medium" ? "中" : "難"}
                      </Badge>
                      <span className="text-sm text-gray-600">
                        {stats.count}問回答
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={stats.accuracy} className="w-24" />
                      <span className={`text-sm font-medium ${getAccuracyColor(stats.accuracy)}`}>
                        {stats.accuracy.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* パーソナライズ情報（講義が指定されている場合） */}
            {personalizedData && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">学習レベル評価</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-gray-600">現在のレベル</span>
                    <Badge variant="outline" className="text-lg px-3 py-1">
                      {personalizedData.learningLevel}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">推奨難易度配分</p>
                    <div className="space-y-2">
                      {Object.entries(personalizedData.personalizedDifficulty).map(([level, ratio]) => (
                        <div key={level} className="flex items-center gap-2">
                          <span className="text-xs w-8">{level === "easy" ? "易" : level === "medium" ? "中" : "難"}</span>
                          <Progress value={ratio * 100} className="flex-1" />
                          <span className="text-xs w-10 text-right">{Math.round(ratio * 100)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            {learningHistory?.history && learningHistory.history.length > 0 ? (
              <div className="space-y-2">
                {learningHistory.history.map((item, index) => (
                  <Card key={index} className="p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{item.question}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={getDifficultyColor(item.difficulty)} variant="outline">
                            {item.difficulty === "easy" ? "易" : item.difficulty === "medium" ? "中" : "難"}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {new Date(item.timestamp).toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        {item.isCorrect ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-600" />
                        )}
                      </div>
                    </div>
                    {!item.isCorrect && (
                      <div className="mt-2 text-xs text-gray-600">
                        <p>学生の回答: {item.answer}</p>
                        <p>正解: {item.correctAnswer}</p>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                まだ学習履歴がありません
              </div>
            )}
          </TabsContent>

          <TabsContent value="recommendations" className="space-y-4">
            {personalizedData?.recommendations && personalizedData.recommendations.length > 0 ? (
              <div className="space-y-3">
                {personalizedData.recommendations.map((rec, index) => (
                  <Card key={index} className="p-4">
                    <div className="flex items-start gap-3">
                      <Target className="h-5 w-5 text-indigo-600 mt-0.5" />
                      <div>
                        <p className="text-sm">{rec}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                推奨事項を生成するには、より多くの学習データが必要です
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
