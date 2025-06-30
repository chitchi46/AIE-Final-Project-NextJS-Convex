"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import Link from "next/link";
import { 
  Plus, 
  FileText, 
  Users, 
  BarChart3, 
  BookOpen,
  TrendingUp,
  TrendingDown,
  PlusCircle,
  Sparkles,
  ArrowRight,
  LogOut,
  Brain,
  Trash2,
  MoreVertical,
  ListChecks,
  Lightbulb
} from "lucide-react";
import { motion } from "framer-motion";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { AuthGuard } from "@/components/auth-guard";
import { Suspense } from "react";

function DashboardContent() {
  const { user, logout } = useAuth();
  const [mounted, setMounted] = useState(false);
  const createSampleLecture = useMutation(api.lectures.createSampleLecture);
  
  // 前回のデータを保存するためのstate
  const [previousStats, setPreviousStats] = useState<{
    lectureCount: number;
    qaCount: number;
    responseCount: number;
    timestamp: number;
  } | null>(null);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  const lectures = useQuery(api.lectures.listLectures);

  const handleCreateSampleData = async () => {
    if (!user) {
      toast.error("ログインが必要です");
      return;
    }

    try {
      const result = await createSampleLecture({ createdBy: user.id });
      toast.success(result.message);
    } catch (error) {
      toast.error("サンプルデータの作成に失敗しました");
      console.error(error);
    }
  };

  // 現在の統計計算をuseMemoで最適化
  const currentStats = useMemo(() => {
    if (!lectures) return null;
    
    const totalQAs = lectures.reduce((sum, l) => sum + (l.qaCount || 0), 0);
    const totalResponses = lectures.reduce((sum, l) => sum + (l.responseCount || 0), 0);
    
    return {
      lectureCount: lectures.length,
      qaCount: totalQAs,
      responseCount: totalResponses,
      timestamp: Date.now()
    };
  }, [lectures]);

  // 実データから時系列チャートデータを生成
  const generateRealChartData = useMemo(() => {
    if (!lectures) return [];
    
    // 講義の作成日時順にソート
    const sortedLectures = [...lectures].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    
    // 過去7日間のデータポイントを生成
    const days = 7;
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    
    return Array.from({ length: days }, (_, i) => {
      const targetDate = now - (days - 1 - i) * oneDayMs;
      
      // その日までに作成された講義数
      const lecturesUntilDate = sortedLectures.filter(l => (l.createdAt || 0) <= targetDate).length;
      
      return {
        value: lecturesUntilDate,
        date: new Date(targetDate).toLocaleDateString(),
      };
    });
  }, [lectures]);

  // QA数の時系列データ
  const generateQAChartData = useMemo(() => {
    if (!lectures) return [];
    
    const days = 7;
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    
    return Array.from({ length: days }, (_, i) => {
      const targetDate = now - (days - 1 - i) * oneDayMs;
      
      // その日までのQ&A総数
      const qaCount = lectures
        .filter(l => (l.createdAt || 0) <= targetDate)
        .reduce((sum, l) => sum + (l.qaCount || 0), 0);
      
      return {
        value: qaCount,
        date: new Date(targetDate).toLocaleDateString(),
      };
    });
  }, [lectures]);

  // 回答数の時系列データ
  const generateResponseChartData = useMemo(() => {
    if (!lectures) return [];
    
    const days = 7;
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    
    return Array.from({ length: days }, (_, i) => {
      const targetDate = now - (days - 1 - i) * oneDayMs;
      
      // その日までの回答総数
      const responseCount = lectures
        .filter(l => (l.createdAt || 0) <= targetDate)
        .reduce((sum, l) => sum + (l.responseCount || 0), 0);
      
      return {
        value: responseCount,
        date: new Date(targetDate).toLocaleDateString(),
      };
    });
  }, [lectures]);

  // トレンド計算
  const calculateTrend = (current: number, previous: number): number => {
    if (previous === 0) return 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  // トレンド値をuseMemoで計算
  const trendValues = useMemo(() => {
    if (!currentStats || !previousStats) {
      return { lecturesTrend: 0, qaTrend: 0, responsesTrend: 0 };
    }

    return {
      lecturesTrend: calculateTrend(currentStats.lectureCount, previousStats.lectureCount),
      qaTrend: calculateTrend(currentStats.qaCount, previousStats.qaCount),
      responsesTrend: calculateTrend(currentStats.responseCount, previousStats.responseCount)
    };
  }, [currentStats, previousStats]);

  // 初回または24時間経過後に現在の値を前回データとして保存
  useEffect(() => {
    if (!currentStats) return;
    
    const shouldUpdateStats = !previousStats || 
      (Date.now() - previousStats.timestamp > 24 * 60 * 60 * 1000); // 24時間
    
    if (shouldUpdateStats) {
      setPreviousStats(currentStats);
    }
  }, [currentStats, previousStats]);
  
  // データ変更検知（講義の追加・削除時）
  useEffect(() => {
    if (!currentStats || !previousStats) return;
    
    const hasChanges = currentStats.lectureCount !== previousStats.lectureCount || 
                      currentStats.qaCount !== previousStats.qaCount || 
                      currentStats.responseCount !== previousStats.responseCount;
    
    if (hasChanges) {
      // 変更があった場合、2秒後に前回データを更新
      const timer = setTimeout(() => {
        setPreviousStats(currentStats);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [currentStats, previousStats]);

  if (!mounted) {
    return null;
  }

  if (lectures === undefined) {
    return <DashboardSkeleton />;
  }

  if (!currentStats) {
    return <DashboardSkeleton />;
  }

  const { lecturesTrend, qaTrend, responsesTrend } = trendValues;

  return (
    <AuthGuard requiredRole="teacher">
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="container mx-auto p-6 max-w-7xl">
          {/* ヘッダー */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-10"
          >
            <div className="flex justify-between items-center mb-2">
              <div>
                <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
                  <BookOpen className="h-10 w-10 text-indigo-600" />
                  講師ダッシュボード
                </h1>
                <p className="text-slate-600 mt-2 text-lg">
                  {user ? `${user.name}さん、こんにちは！` : "講義と学習状況を一元管理"}
                </p>
              </div>
              <div className="flex gap-3">
                <Button size="lg" className="shadow-lg hover:shadow-xl transition-all">
                  <Link href="/lectures/new" className="flex items-center gap-2">
                    <PlusCircle className="h-5 w-5" />
                    新規講義作成
                  </Link>
                </Button>
                <Button size="lg" variant="secondary" className="shadow-lg hover:shadow-xl transition-all">
                  <Link href="/teacher/qa-management" className="flex items-center gap-2">
                    <ListChecks className="h-5 w-5" />
                    QA管理
                  </Link>
                </Button>
                <Button size="lg" variant="secondary" className="shadow-lg hover:shadow-xl transition-all">
                  <Link href="/teacher/student-analytics" className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    学生分析
                  </Link>
                </Button>
                <Button size="lg" variant="secondary" className="shadow-lg hover:shadow-xl transition-all">
                  <Link href="/teacher/improvements" className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5" />
                    改善提案
                  </Link>
                </Button>
                <Button size="lg" variant="secondary" className="shadow-lg hover:shadow-xl transition-all">
                  <Link href="/live/new" className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5" />
                    ライブクイズ
                  </Link>
                </Button>
                <Button size="lg" variant="outline" onClick={logout}>
                  <LogOut className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </motion.div>

          {/* メトリクスカード */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10"
          >
            <MetricCard
              title="総講義数"
              value={currentStats.lectureCount}
              icon={<FileText className="h-5 w-5" />}
              trend={lecturesTrend}
              chartData={generateRealChartData}
              color="indigo"
            />
            <MetricCard
              title="総Q&A数"
              value={currentStats.qaCount}
              icon={<BarChart3 className="h-5 w-5" />}
              trend={qaTrend}
              chartData={generateQAChartData}
              color="emerald"
            />
            <MetricCard
              title="総回答数"
              value={currentStats.responseCount}
              icon={<Users className="h-5 w-5" />}
              trend={responsesTrend}
              chartData={generateResponseChartData}
              color="amber"
            />
          </motion.div>

          {/* 講義一覧セクション */}
          <motion.section 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-white/50 backdrop-blur rounded-2xl p-8 shadow-sm"
          >
            <div className="flex items-center gap-3 mb-6">
              <BookOpen className="h-6 w-6 text-indigo-600" />
              <h2 className="text-2xl font-bold text-slate-900">講義一覧</h2>
            </div>

            {currentStats.lectureCount === 0 ? (
              <EmptyState onCreateSampleData={handleCreateSampleData} />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {lectures.map((lecture, index) => (
                  <LectureCard key={lecture._id} lecture={lecture} index={index} />
                ))}
              </div>
            )}
          </motion.section>
        </div>
      </div>
    </AuthGuard>
  );
}

// メトリクスカードコンポーネント
function MetricCard({ title, value, icon, trend, chartData, color }: {
  title: string;
  value: number;
  icon: React.ReactNode;
  trend: number;
  chartData: any[];
  color: "indigo" | "emerald" | "amber";
}) {
  const isPositive = trend >= 0;
  const colorClasses = {
    indigo: "from-indigo-500 to-indigo-600",
    emerald: "from-emerald-500 to-emerald-600",
    amber: "from-amber-500 to-amber-600",
  };

  return (
    <Card className="relative overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 border-0">
      <div className={`absolute inset-0 bg-gradient-to-br ${colorClasses[color]} opacity-5`} />
      <CardHeader className="relative">
        <div className="flex items-center justify-between">
          <div className={`p-2 rounded-lg bg-${color}-100 text-${color}-600`}>
            {icon}
          </div>
          <div className="flex items-center gap-1 text-sm">
            {isPositive ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
            <span className={isPositive ? "text-green-600" : "text-red-600"}>
              {Math.abs(trend)}%
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="relative">
        <p className="text-sm text-slate-600 mb-1">{title}</p>
        <p className="text-3xl font-extrabold tracking-tight">{value}</p>
        <div className="absolute bottom-0 right-0 w-24 h-12 opacity-50">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke={`var(--${color}-500)`}
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// 講義カードコンポーネント
function LectureCard({ lecture, index }: { lecture: any; index: number }) {
  const deleteLecture = useMutation(api.lectures.deleteLecture);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);

  const handleDelete = async () => {
    try {
      await deleteLecture({ lectureId: lecture._id });
      toast.success("講義を削除しました");
      setIsDeleteDialogOpen(false);
    } catch (error) {
      toast.error("削除に失敗しました");
      console.error("Delete error:", error);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 * index }}
      whileHover={{ scale: 1.02 }}
      className="h-full"
    >
      <Card className="h-full shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer hover:ring-2 ring-indigo-500/50">
        <CardHeader>
          <div className="flex items-start justify-between mb-2">
            <Badge variant="outline" className="text-xs">
              公開中
            </Badge>
            <div className="flex items-center gap-2">
              <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100">
                {lecture.qaCount || 0} Q&A
              </Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => setIsDeleteDialogOpen(true)}
                    className="text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    削除
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <CardTitle className="line-clamp-1 text-xl">{lecture.title}</CardTitle>
          <CardDescription className="line-clamp-2 mt-2">
            {lecture.description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 mb-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">回答数</span>
              <span className="font-semibold">{lecture.responseCount || 0}</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-2 rounded-full"
                style={{ width: `${Math.min((lecture.responseCount || 0) / 50 * 100, 100)}%` }}
              />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex gap-2">
              <Button asChild variant="outline" size="sm" className="flex-1">
                <Link href={`/lecture/${lecture._id}`}>
                  詳細を見る
                </Link>
              </Button>
              <Button asChild size="sm" className="flex-1 bg-indigo-600 hover:bg-indigo-700">
                <Link href={`/quiz/${lecture._id}`}>
                  Q&A回答
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 削除確認ダイアログ */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>講義を削除しますか？</DialogTitle>
            <DialogDescription>
              「{lecture.title}」を削除します。この操作は取り消せません。
              関連するQ&Aと回答データもすべて削除されます。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              キャンセル
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
            >
              削除する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

// 空状態コンポーネント
function EmptyState({ onCreateSampleData }: { onCreateSampleData: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center py-16"
    >
      <div className="relative inline-block">
        <div className="absolute inset-0 bg-indigo-100 rounded-full blur-2xl opacity-50" />
        <Sparkles className="relative h-20 w-20 text-indigo-600 mx-auto mb-6" />
      </div>
      <h3 className="text-2xl font-bold text-slate-900 mb-2">
        最初の講義を作成しましょう
      </h3>
      <p className="text-slate-600 mb-8 max-w-md mx-auto">
        講義資料をアップロードして、AIが自動的にQ&Aを生成します。
        学生の理解度を即座に把握できます。
      </p>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button size="lg" asChild className="shadow-lg">
          <Link href="/lectures/new">
            <PlusCircle className="mr-2 h-5 w-5" />
            講義を作成する
          </Link>
        </Button>
        <Button 
          size="lg" 
          variant="outline"
          onClick={onCreateSampleData}
        >
          <Sparkles className="mr-2 h-5 w-5" />
          サンプルデータを作成
        </Button>
      </div>
    </motion.div>
  );
}

// スケルトンローディング
function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="mb-10">
          <Skeleton className="h-12 w-64 mb-2" />
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="bg-white/50 backdrop-blur rounded-2xl p-8">
          <Skeleton className="h-8 w-32 mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function DashboardPageContent() {
  return <DashboardContent />;
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardPageContent />
    </Suspense>
  );
} 