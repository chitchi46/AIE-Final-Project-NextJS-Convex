"use client";

import { useState, useEffect } from "react";
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
  LogIn
} from "lucide-react";
import Link from "next/link";
import { Id } from "@/convex/_generated/dataModel";
import { LoadingSpinner } from "@/components/loading-spinner";
import { motion } from "framer-motion";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";

export default function StudentDashboardPage() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const getOrCreateStudent = useMutation(api.students.getOrCreateStudent);
  const [studentId, setStudentId] = useState<Id<"students"> | null>(null);

  // 認証されていない場合はログインページにリダイレクト
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

  const stats = useQuery(api.stats.statsByStudent, 
    studentId ? { studentId } : "skip"
  );
  const lectures = useQuery(api.lectures.listLectures, {});

  // 認証中のローディング
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <LoadingSpinner size="lg" text="認証情報を確認中..." />
      </div>
    );
  }

  // 認証されていない場合
  if (!isAuthenticated || !user) {
    // テスト用: 作成済みのテストユーザーデータを使用
    const testUser = {
      _id: "jn72pqdf1j2vnjtg71bs55jrgd7jq30y",
      id: "jn72pqdf1j2vnjtg71bs55jrgd7jq30y",
      email: "test@example.com",
      name: "テストユーザー",
      role: "student" as const
    };
    
    const testStudentId = "jh7b12sd540bm78we4czrjftc57jp2p2" as Id<"students">;
    
    return <DashboardContent user={testUser} studentId={testStudentId} />;
  }

  // データローディング中
  if (!studentId || !stats || !lectures) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <LoadingSpinner size="lg" text="データを読み込み中..." />
      </div>
    );
  }

  return <DashboardContent user={user} studentId={studentId} />;
}

// ダッシュボードコンテンツを別コンポーネントに分離
function DashboardContent({ user, studentId }: { 
  user: { _id: string; id: string; email: string; name: string; role: string }, 
  studentId: Id<"students"> 
}) {
  const stats = useQuery(api.stats.statsByStudent, { studentId });
  const lectures = useQuery(api.lectures.listLectures, {});

  if (!stats || !lectures) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <LoadingSpinner size="lg" text="データを読み込み中..." />
      </div>
    );
  }

  const overallScore = stats.overallStats.totalResponses > 0 
    ? Math.round((stats.overallStats.correctResponses / stats.overallStats.totalResponses) * 100) 
    : 0;

  // 仮の進捗データ（実際はConvexから取得）
  const progressData = [
    { day: "月", score: 65 },
    { day: "火", score: 72 },
    { day: "水", score: 78 },
    { day: "木", score: 85 },
    { day: "金", score: 88 },
    { day: "土", score: 92 },
    { day: "今日", score: overallScore },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto p-6 max-w-7xl">
        {/* ヘッダー */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-800 mb-2">学習ダッシュボード</h1>
          <p className="text-gray-600">あなたの学習進捗を確認しましょう</p>
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
                <p className="text-3xl font-bold">{stats.overallStats.totalResponses}</p>
                <p className="text-sm text-gray-600 mt-1">問題に挑戦</p>
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
                <p className="text-3xl font-bold text-emerald-600">{stats.overallStats.correctResponses}</p>
                <p className="text-sm text-gray-600 mt-1">正しく回答</p>
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
                <p className="text-3xl font-bold">{lectures.length}</p>
                <p className="text-sm text-gray-600 mt-1">講義に参加</p>
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
                      stroke="#6366f1" 
                      strokeWidth={3}
                      dot={{ fill: '#6366f1', r: 6 }}
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
              <Card className="shadow-lg border-0">
                <CardContent className="text-center py-12">
                  <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">学習履歴がここに表示されます</p>
                  <p className="text-sm text-gray-500 mt-2">
                    クイズに挑戦すると、あなたの成績が記録されます
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
} 