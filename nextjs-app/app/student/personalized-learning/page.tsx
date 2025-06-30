"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Brain, Target, TrendingUp, ArrowRight, BookOpen } from "lucide-react";
import Link from "next/link";
import { Id } from "@/convex/_generated/dataModel";
import { LoadingSpinner } from "@/components/loading-spinner";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";

export default function PersonalizedLearningPage() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const getOrCreateStudent = useMutation(api.students.getOrCreateStudent);
  const [studentId, setStudentId] = useState<Id<"students"> | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [authLoading, isAuthenticated, router]);

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
      }
    };
    
    if (user && !authLoading && isAuthenticated) {
      initStudent();
    }
  }, [user, authLoading, isAuthenticated, getOrCreateStudent]);

  const lectures = useQuery(api.lectures.listLectures, {});
  const stats = useQuery(api.stats.statsByStudent, studentId ? { studentId } : "skip");

  if (authLoading || !isAuthenticated || !studentId || !lectures || !stats) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <LoadingSpinner size="lg" text="データを読み込み中..." />
      </div>
    );
  }

  // 各講義のパーソナライズデータを取得
  const lecturesWithPersonalization = lectures.map(lecture => {
    const lectureStats = stats.lectureStats?.find(l => l.lectureId === lecture._id);
    const accuracy = lectureStats?.accuracy || 0;
    const totalResponses = lectureStats?.total || 0;
    
    // 学習レベルを判定
    let learningLevel: "初級" | "中級" | "上級" = "初級";
    if (accuracy >= 80) learningLevel = "上級";
    else if (accuracy >= 60) learningLevel = "中級";
    
    // 推奨難易度を計算
    let recommendedDifficulty: "easy" | "medium" | "hard" = "easy";
    if (learningLevel === "上級") recommendedDifficulty = "hard";
    else if (learningLevel === "中級") recommendedDifficulty = "medium";
    
    return {
      ...lecture,
      learningLevel,
      accuracy,
      totalResponses,
      recommendedDifficulty,
      isReadyForPersonalized: totalResponses >= 5, // 5問以上回答した場合のみ
    };
  });

  const readyLectures = lecturesWithPersonalization.filter(l => l.isReadyForPersonalized);
  const notReadyLectures = lecturesWithPersonalization.filter(l => !l.isReadyForPersonalized);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto p-6 max-w-7xl">
        {/* ヘッダー */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Link href="/student/dashboard" className="text-sm text-indigo-600 hover:underline mb-4 inline-block">
            ← ダッシュボードに戻る
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <Brain className="h-8 w-8 text-indigo-600" />
            <h1 className="text-3xl font-bold text-gray-800">パーソナライズ学習</h1>
          </div>
          <p className="text-gray-600">あなたの学習レベルに合わせた問題で効率的に学習しましょう</p>
        </motion.div>

        {/* パーソナライズ学習可能な講義 */}
        {readyLectures.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Target className="h-5 w-5 text-green-600" />
              パーソナライズ学習が利用可能
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {readyLectures.map((lecture, index) => (
                <motion.div
                  key={lecture._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + index * 0.1 }}
                >
                  <Card className="shadow-lg border-0 hover:shadow-xl transition-shadow h-full">
                    <CardHeader>
                      <div className="flex justify-between items-start mb-2">
                        <Badge className={
                          lecture.learningLevel === "上級" ? "bg-purple-100 text-purple-800" :
                          lecture.learningLevel === "中級" ? "bg-blue-100 text-blue-800" :
                          "bg-green-100 text-green-800"
                        }>
                          {lecture.learningLevel}
                        </Badge>
                        <Badge variant="outline">
                          正答率 {lecture.accuracy}%
                        </Badge>
                      </div>
                      <CardTitle className="text-lg">{lecture.title}</CardTitle>
                      <CardDescription className="line-clamp-2">
                        {lecture.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm text-gray-600 mb-1">学習進捗</p>
                          <Progress value={lecture.accuracy} className="h-2" />
                        </div>
                        <div className="text-sm text-gray-600">
                          <p>回答済み: {lecture.totalResponses}問</p>
                          <p>推奨難易度: {
                            lecture.recommendedDifficulty === "hard" ? "難" :
                            lecture.recommendedDifficulty === "medium" ? "中" : "易"
                          }</p>
                        </div>
                        <Button asChild className="w-full">
                          <Link href={`/quiz/personalized/${lecture._id}`}>
                            <Brain className="mr-2 h-4 w-4" />
                            パーソナライズ学習を開始
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}

        {/* まだパーソナライズ学習が利用できない講義 */}
        {notReadyLectures.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-gray-600" />
              もう少し学習が必要な講義
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {notReadyLectures.map((lecture, index) => (
                <motion.div
                  key={lecture._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                >
                  <Card className="shadow-lg border-0 hover:shadow-xl transition-shadow h-full opacity-80">
                    <CardHeader>
                      <CardTitle className="text-lg">{lecture.title}</CardTitle>
                      <CardDescription className="line-clamp-2">
                        {lecture.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="bg-yellow-50 text-yellow-800 p-3 rounded-lg text-sm">
                          <p className="font-medium mb-1">パーソナライズ学習を利用するには</p>
                          <p>最低5問の回答が必要です</p>
                          <p className="mt-1">現在: {lecture.totalResponses}/5問</p>
                        </div>
                        <Button asChild variant="outline" className="w-full">
                          <Link href={`/quiz/${lecture._id}`}>
                            通常のクイズを開始
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}

        {/* 講義がない場合 */}
        {lectures.length === 0 && (
          <Card className="shadow-lg border-0 text-center py-12">
            <CardContent>
              <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">まだ受講可能な講義がありません</p>
              <p className="text-sm text-gray-500">
                講師が講義を作成すると、ここに表示されます
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 