"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Trophy, Target, TrendingUp, CheckCircle, XCircle } from "lucide-react";
import Link from "next/link";
import { Id } from "@/convex/_generated/dataModel";
import { LoadingSpinner } from "@/components/loading-spinner";
import { motion } from "framer-motion";

export default function QuizResultsPage() {
  const params = useParams();
  const router = useRouter();
  const lectureId = params.id as Id<"lectures">;

  const lecture = useQuery(api.lectures.getLecture, { lectureId });
  const stats = useQuery(api.stats.statsByLecture, { lectureId });

  if (!lecture || !stats) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <LoadingSpinner size="lg" text="結果を読み込み中..." />
      </div>
    );
  }

  const score = Math.round((stats.overallStats.totalCorrect / stats.overallStats.totalQuestions) * 100);
  const scoreColor = score >= 80 ? "text-green-600" : score >= 60 ? "text-yellow-600" : "text-red-600";
  const scoreMessage = score >= 80 ? "素晴らしい！" : score >= 60 ? "よくできました！" : "もう少し頑張りましょう";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto p-6 max-w-4xl">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Button variant="ghost" asChild className="hover:bg-white/50">
            <Link href="/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              ダッシュボードに戻る
            </Link>
          </Button>
        </motion.div>

        {/* 結果サマリーカード */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="mb-6 shadow-xl border-0 overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 p-8 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold mb-2">クイズ完了！</h1>
                  <p className="text-indigo-100">{lecture.title}</p>
                </div>
                <Trophy className="h-16 w-16 text-yellow-300" />
              </div>
            </div>
            
            <CardContent className="p-8">
              <div className="text-center mb-8">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                  className={`text-6xl font-bold ${scoreColor} mb-2`}
                >
                  {score}%
                </motion.div>
                <p className="text-xl text-gray-700">{scoreMessage}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="bg-green-50 rounded-lg p-4 text-center"
                >
                  <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-green-800">{stats.overallStats.totalCorrect}</p>
                  <p className="text-sm text-green-600">正解</p>
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="bg-red-50 rounded-lg p-4 text-center"
                >
                  <XCircle className="h-8 w-8 text-red-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-red-800">{stats.overallStats.totalQuestions - stats.overallStats.totalCorrect}</p>
                  <p className="text-sm text-red-600">不正解</p>
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="bg-indigo-50 rounded-lg p-4 text-center"
                >
                  <Target className="h-8 w-8 text-indigo-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-indigo-800">{stats.overallStats.totalQuestions}</p>
                  <p className="text-sm text-indigo-600">全問題数</p>
                </motion.div>
              </div>

              <Progress value={score} className="h-4 mb-8" />

              <div className="flex gap-4">
                <Button
                  onClick={() => router.push(`/quiz/${lectureId}`)}
                  className="flex-1"
                  variant="outline"
                >
                  もう一度挑戦
                </Button>
                <Button
                  onClick={() => router.push("/dashboard")}
                  className="flex-1"
                >
                  ダッシュボードへ
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* 難易度別スコア */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Card className="shadow-xl border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                難易度別パフォーマンス
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(stats.difficultyStats).map(([difficulty, data], index) => {
                  const difficultyLabels = {
                    easy: { label: "易", color: "bg-green-500" },
                    medium: { label: "中", color: "bg-yellow-500" },
                    hard: { label: "難", color: "bg-red-500" },
                  };
                  const { label, color } = difficultyLabels[difficulty as keyof typeof difficultyLabels];
                  const percentage = Math.round(data.averageAccuracy * 100);

                  return (
                    <motion.div
                      key={difficulty}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.8 + index * 0.1 }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded text-white text-sm ${color}`}>
                            {label}
                          </span>
                          <span className="text-gray-600">
                            {data.count} 問 (平均正答率)
                          </span>
                        </div>
                        <span className="font-bold">{percentage}%</span>
                      </div>
                      <Progress value={percentage} className="h-2" />
                    </motion.div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
} 