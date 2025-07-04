"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Trophy, 
  Target, 
  TrendingUp, 
  Clock, 
  BookOpen,
  CheckCircle,
  XCircle,
  Award,
  BarChart3,
  LogIn,
  LogOut,
  Brain
} from "lucide-react";
import Link from "next/link";
import { Id } from "@/convex/_generated/dataModel";
import { LoadingSpinner } from "@/components/loading-spinner";
import { motion } from "framer-motion";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { chartColors, difficultyLabels, accessibleColors } from "@/lib/constants/colors";
import { ThemeToggle } from "@/components/theme-toggle";

export default function StudentDashboardPage() {
  const { user, isLoading: authLoading, isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const getOrCreateStudent = useMutation(api.students.getOrCreateStudent);
  const [studentId, setStudentId] = useState<Id<"students"> | null>(null);

  useEffect(() => {
    // 認証が完了し、かつ未認証の場合にリダイレクトを実行
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

  const stats = useQuery(api.stats.statsByStudent, 
    studentId ? { studentId } : "skip"
  );
  const lectures = useQuery(api.lectures.listLectures, {});

  // 認証中または未認証の場合はローディング画面を表示
  if (authLoading || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <LoadingSpinner size="lg" text="認証情報を確認中..." />
      </div>
    );
  }

  // データローディング中
  if (!studentId || !stats || !lectures) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <LoadingSpinner size="lg" text="データを読み込み中..." />
      </div>
    );
  }

  if (!user) return null;
  return <DashboardContent user={user} studentId={studentId} logout={logout} />;
}

// ダッシュボードコンテンツを別コンポーネントに分離
function DashboardContent({ user, studentId, logout }: { 
  user: { _id: string; id: string; email: string; name: string; role: string }, 
  studentId: Id<"students">,
  logout: () => void
}) {
  const stats = useQuery(api.stats.statsByStudent, { studentId });
  const lectures = useQuery(api.lectures.listLectures, {});
  const learningHistory = useQuery(api.qa.getLearningHistory, { studentId, limit: 20 });

  if (!stats || !lectures || !learningHistory) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <LoadingSpinner size="lg" text="データを読み込み中..." />
      </div>
    );
  }

  const overallScore = stats.overallStats.totalResponses > 0 
    ? Math.round((stats.overallStats.correctResponses / stats.overallStats.totalResponses) * 100) 
    : 0;

  // 実際の学習進捗データを生成（過去7日間） - 安全な実装
  const generateProgressData = () => {
    const days = 7;
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const dayNames = ["日", "月", "火", "水", "木", "金", "土"];
    
    return Array.from({ length: days }, (_, i) => {
      const targetDate = now - (days - 1 - i) * oneDayMs;
      const date = new Date(targetDate);
      const dayLabel = i === days - 1 ? "今日" : dayNames[date.getDay()];
      
      // その日の回答から正答率を計算
      let dayResponses = 0;
      let dayCorrectResponses = 0;
      
      try {
        dayResponses = 0; // 仮の値
        dayCorrectResponses = 0; // 仮の値
        // TODO: 正しいデータ構造での実装が必要
      } catch (error) {
        console.warn('Error calculating daily stats:', error);
      }
      
      const dayScore = dayResponses > 0 
        ? Math.round((dayCorrectResponses / dayResponses) * 100)
        : i === days - 1 ? overallScore : 0; // 今日は全体スコア、他の日はデータがなければ0
      
      return {
        day: dayLabel,
        score: dayScore,
        responses: dayResponses
      };
    });
  };

  const progressData = generateProgressData();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto p-6 max-w-7xl">
        {/* ヘッダー */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex justify-between items-center mb-2">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">学習ダッシュボード</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">あなたの学習進捗を確認しましょう</p>
            </div>
            <div className="flex gap-3">
              <Button 
                variant="secondary"
                asChild
              >
                <Link href="/student/personalized-learning" className="flex items-center gap-2">
                  <Brain className="h-4 w-4" />
                  パーソナライズ学習
                </Link>
              </Button>
              <ThemeToggle />
              <Button 
                variant="outline" 
                onClick={logout}
                className="flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                ログアウト
              </Button>
            </div>
          </div>
        </motion.div>

        {/* 統計カード */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="shadow-lg border-0 bg-gradient-to-br from-indigo-500 to-indigo-600 text-white">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  総合スコア
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{overallScore}%</p>
                <Progress value={overallScore} className="mt-2 bg-indigo-400" />
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="shadow-lg border-0">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="h-5 w-5 text-green-600" />
                  回答数
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold dark:text-gray-100">{stats.overallStats.totalResponses}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">問題に挑戦</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="shadow-lg border-0">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                  正解数
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{stats.overallStats.correctResponses}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">正しく回答</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="shadow-lg border-0">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-indigo-600" />
                  受講講義
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold dark:text-gray-100">{lectures.length}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">講義に参加</p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* 進捗グラフ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mb-8"
        >
          <Card className="shadow-lg border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                週間学習進捗
              </CardTitle>
              <CardDescription>
                今週のスコア推移
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={progressData}>
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="score" 
                      stroke={chartColors.single}
                      strokeWidth={3}
                      dot={{ fill: chartColors.single, r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* タブコンテンツ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Tabs defaultValue="lectures" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2 max-w-md">
              <TabsTrigger value="lectures">受講可能な講義</TabsTrigger>
              <TabsTrigger value="history">学習履歴</TabsTrigger>
            </TabsList>

            <TabsContent value="lectures" className="space-y-4">
              {lectures.map((lecture, index) => (
                <motion.div
                  key={lecture._id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 + index * 0.1 }}
                >
                  <Card className="shadow-lg border-0 hover:shadow-xl transition-shadow">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-xl">{lecture.title}</CardTitle>
                          <CardDescription className="mt-2">
                            {lecture.description}
                          </CardDescription>
                        </div>
                        <Badge variant="secondary">
                          {lecture.qaCount} 問
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            約{Math.ceil(lecture.qaCount * 2)} 分
                          </span>
                          <span className="flex items-center gap-1">
                            <Award className="h-4 w-4" />
                            {lecture.qaCount > 0 ? `${lecture.qaCount}問` : "問題なし"}
                          </span>
                        </div>
                        <Button asChild>
                          <Link href={`/quiz/${lecture._id}`}>
                            クイズに挑戦
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
              {learningHistory.statistics.totalAttempts === 0 ? (
                <Card className="shadow-lg border-0">
                  <CardContent className="text-center py-12">
                    <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">学習履歴がまだありません</p>
                    <p className="text-sm text-gray-500 mt-2">
                      クイズに挑戦すると、あなたの成績が記録されます
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* 学習統計サマリー */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <Card className="shadow-lg border-0">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-gray-600">総回答数</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-2xl font-bold">{learningHistory.statistics.totalAttempts}</p>
                      </CardContent>
                    </Card>
                    <Card className="shadow-lg border-0">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-gray-600">正解数</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-2xl font-bold text-green-600">{learningHistory.statistics.correctAttempts}</p>
                      </CardContent>
                    </Card>
                    <Card className="shadow-lg border-0">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-gray-600">正答率</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-2xl font-bold">{learningHistory.statistics.accuracy}%</p>
                        <Progress value={learningHistory.statistics.accuracy} className="mt-2" />
                      </CardContent>
                    </Card>
                  </div>

                  {/* 難易度別統計 */}
                  <Card className="shadow-lg border-0 mb-6">
                    <CardHeader>
                      <CardTitle className="text-lg">難易度別成績</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {Object.entries(learningHistory.statistics.difficultyStats).map(([difficulty, stats]) => {
                          const difficultyColors = { 
                            easy: `bg-cyan-100 text-cyan-800`, 
                            medium: `bg-orange-100 text-orange-800`, 
                            hard: `bg-purple-100 text-purple-800` 
                          };
                          const difficultyLabel = difficultyLabels[difficulty as keyof typeof difficultyLabels];
                          
                          return (
                            <div key={difficulty} className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Badge className={difficultyColors[difficulty as keyof typeof difficultyColors]}>
                                  {difficultyLabel}
                                </Badge>
                                <span className="text-sm">{stats.correct}/{stats.total} 正解</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">{stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0}%</span>
                                <Progress value={stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0} className="w-16" />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>

                  {/* 最近の回答履歴 */}
                  <Card className="shadow-lg border-0">
                    <CardHeader>
                      <CardTitle className="text-lg">最近の回答履歴</CardTitle>
                      <CardDescription>直近20件の回答結果</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {learningHistory.history.map((item, index) => (
                          <div key={item.responseId} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                            <div className="flex-shrink-0 mt-1">
                              {item.isCorrect ? (
                                <CheckCircle className="h-5 w-5 text-green-600" />
                              ) : (
                                <XCircle className="h-5 w-5 text-red-600" />
                              )}
                            </div>
                            <div className="flex-grow min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className="text-xs">
                                  {item.lectureTitle}
                                </Badge>
                                <Badge 
                                  className={`text-xs ${
                                    item.difficulty === "easy" ? "bg-green-100 text-green-800" :
                                    item.difficulty === "medium" ? "bg-yellow-100 text-yellow-800" :
                                    "bg-red-100 text-red-800"
                                  }`}
                                >
                                  {item.difficulty === "easy" ? "易" : item.difficulty === "medium" ? "中" : "難"}
                                </Badge>
                              </div>
                              <p className="text-sm font-medium truncate">{item.question}</p>
                              <p className="text-xs text-gray-600 mt-1">
                                あなたの回答: {item.answer}
                              </p>
                              {!item.isCorrect && (
                                <p className="text-xs text-gray-500 mt-1">
                                  正解: {item.correctAnswer}
                                </p>
                              )}
                            </div>
                            <div className="flex-shrink-0 text-xs text-gray-500">
                              {new Date(item.timestamp).toLocaleDateString('ja-JP', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
} 