"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Trophy, 
  Target, 
  TrendingUp, 
  Brain, 
  CheckCircle, 
  XCircle,
  ArrowRight,
  BarChart,
  Sparkles,
  Home
} from "lucide-react";
import Link from "next/link";
import { Id } from "@/convex/_generated/dataModel";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export default function PersonalizedResultsPage() {
  const params = useParams();
  const router = useRouter();
  const lectureId = params.id as Id<"lectures">;
  const { user, isLoading: authLoading } = useAuth();

  const [studentId, setStudentId] = useState<Id<"students"> | null>(null);
  const getOrCreateStudent = useMutation(api.students.getOrCreateStudent);

  // 学生IDを取得または作成
  useEffect(() => {
    const initStudent = async () => {
      if (!user) return;
      
      try {
        const id = await getOrCreateStudent({
          email: user.email,
          name: user.name,
        });
        setStudentId(id);
      } catch (error) {
        console.error("学生データの初期化に失敗:", error);
        toast.error("学生データの初期化に失敗しました");
      }
    };
    
    if (user && !authLoading) {
      initStudent();
    }
  }, [user, authLoading, getOrCreateStudent]);

  // 学習履歴を取得
  const responses = useQuery(
    api.qa.getMyResponses,
    studentId ? { lectureId } : "skip"
  );

  // パーソナライズデータを再取得
  const personalizedData = useQuery(
    api.personalization.getPersonalizedQA,
    studentId ? { studentId, lectureId, requestedCount: 0 } : "skip"
  );

  const lecture = useQuery(api.lectures.getLecture, { lectureId });

  useEffect(() => {
    // 高得点の場合は紙吹雪を表示
    if (responses) {
      const correctCount = responses.filter(r => r.isCorrect).length;
      const accuracy = (correctCount / responses.length) * 100;
      
      if (accuracy >= 80) {
        setTimeout(() => {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
          });
        }, 500);
      }
    }
  }, [responses]);

  if (!responses || !personalizedData || !lecture) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <BarChart className="h-12 w-12 text-indigo-600 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">結果を集計中...</p>
        </div>
      </div>
    );
  }

  // 統計を計算
  const totalQuestions = responses.length;
  const correctAnswers = responses.filter(r => r.isCorrect).length;
  const accuracy = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;

  // 難易度別の統計を計算
  const difficultyStats = {
    easy: { correct: 0, total: 0 },
    medium: { correct: 0, total: 0 },
    hard: { correct: 0, total: 0 },
  };

  // 学習レベルの変化を判定
  const learningProgress = personalizedData.learningLevel;
  const nextLevelThreshold = {
    beginner: { target: "intermediate", requirement: "中級問題で60%以上の正答率" },
    intermediate: { target: "advanced", requirement: "難問で50%以上の正答率" },
    advanced: { target: null, requirement: "最高レベルを維持" },
  };

  const getPerformanceMessage = (accuracy: number) => {
    if (accuracy >= 90) return { text: "素晴らしい成績です！", color: "text-green-600" };
    if (accuracy >= 80) return { text: "とても良い成績です！", color: "text-green-600" };
    if (accuracy >= 70) return { text: "良い成績です！", color: "text-blue-600" };
    if (accuracy >= 60) return { text: "まずまずの成績です", color: "text-yellow-600" };
    return { text: "もう少し頑張りましょう", color: "text-red-600" };
  };

  const performanceMessage = getPerformanceMessage(accuracy);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <Trophy className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold mb-2">学習完了！</h1>
          <p className="text-gray-600">{lecture.title} のパーソナライズ学習が終了しました</p>
        </motion.div>

        {/* 総合成績 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart className="h-5 w-5" />
                総合成績
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center mb-6">
                <div className="text-6xl font-bold mb-2">
                  <span className={performanceMessage.color}>{Math.round(accuracy)}%</span>
                </div>
                <p className={`text-lg font-semibold ${performanceMessage.color}`}>
                  {performanceMessage.text}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">総問題数</p>
                  <p className="text-2xl font-bold">{totalQuestions}</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-gray-600">正解数</p>
                  <p className="text-2xl font-bold text-green-600">{correctAnswers}</p>
                </div>
                <div className="p-4 bg-red-50 rounded-lg">
                  <p className="text-sm text-gray-600">不正解数</p>
                  <p className="text-2xl font-bold text-red-600">{totalQuestions - correctAnswers}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* 学習レベルと進捗 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                学習レベル分析
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge className="text-lg px-4 py-2">
                      {learningProgress === "beginner" && "🌱 初級"}
                      {learningProgress === "intermediate" && "🌿 中級"}
                      {learningProgress === "advanced" && "🌳 上級"}
                    </Badge>
                    <span className="text-gray-600">現在のレベル</span>
                  </div>
                  {nextLevelThreshold[learningProgress].target && (
                    <div className="text-right">
                      <p className="text-sm text-gray-600">次のレベルまで</p>
                      <p className="text-sm font-medium">{nextLevelThreshold[learningProgress].requirement}</p>
                    </div>
                  )}
                </div>

                {/* 推奨事項 */}
                <Alert>
                  <Sparkles className="h-4 w-4" />
                  <AlertDescription>
                    <strong>次の学習への推奨:</strong>
                    <ul className="mt-2 space-y-1">
                      {personalizedData.recommendations.map((rec, index) => (
                        <li key={index} className="text-sm">• {rec}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* 詳細な回答履歴 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>回答履歴</CardTitle>
              <CardDescription>各問題の回答結果</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {responses.map((response, index) => (
                  <div
                    key={response._id}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      response.isCorrect ? "bg-green-50" : "bg-red-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {response.isCorrect ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                      <span className="font-medium">問題 {index + 1}</span>
                    </div>
                    <span className={`text-sm ${response.isCorrect ? "text-green-600" : "text-red-600"}`}>
                      {response.isCorrect ? "正解" : "不正解"}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* アクションボタン */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex gap-4 justify-center"
        >
          <Button asChild variant="outline" size="lg">
            <Link href="/dashboard">
              <Home className="mr-2 h-5 w-5" />
              ダッシュボードに戻る
            </Link>
          </Button>
          <Button asChild size="lg">
            <Link href={`/quiz/personalized/${lectureId}`}>
              <Target className="mr-2 h-5 w-5" />
              もう一度挑戦
            </Link>
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
