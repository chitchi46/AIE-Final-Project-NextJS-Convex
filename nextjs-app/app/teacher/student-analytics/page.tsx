"use client";

import { useState, useMemo, useCallback } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { 
  Users, 
  TrendingUp, 
  Target, 
  User,
  Search,
  BookOpen,
  Brain,
  AlertCircle
} from "lucide-react";
import Link from "next/link";
import { LoadingSpinner } from "@/components/loading-spinner";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { AuthGuard } from "@/components/auth-guard";
import { StudentLearningModal } from "@/components/teacher/student-learning-modal";
import { Id } from "@/convex/_generated/dataModel";

export default function StudentAnalyticsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState<Id<"students"> | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 最適化されたクエリで全データを一括取得
  const analyticsData = useQuery(api.stats.getStudentsAnalytics, {});

  // イベントハンドラーをメモ化（フック呼び出しを早期リターンより前に配置）
  const handleStudentClick = useCallback((studentId: Id<"students">) => {
    setSelectedStudentId(studentId);
    setIsModalOpen(true);
  }, []);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  // 検索フィルタリング（メモ化で最適化）
  const filteredStudents = useMemo(() => {
    if (!analyticsData?.students || !searchQuery.trim()) return analyticsData?.students || [];
    
    const query = searchQuery.toLowerCase();
    return analyticsData.students.filter(student => 
      student.name.toLowerCase().includes(query) ||
      student.email.toLowerCase().includes(query)
    );
  }, [analyticsData?.students, searchQuery]);

  if (authLoading || !analyticsData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <LoadingSpinner size="lg" text="データを読み込み中..." />
      </div>
    );
  }

  const { students, overallStats } = analyticsData;

  return (
    <AuthGuard requiredRole="teacher">
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="container mx-auto p-6 max-w-7xl">
          {/* ヘッダー */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Link href="/dashboard" className="text-sm text-indigo-600 hover:underline mb-4 inline-block">
              ← ダッシュボードに戻る
            </Link>
            <div className="flex items-center gap-3 mb-2">
              <Users className="h-8 w-8 text-indigo-600" />
              <h1 className="text-3xl font-bold text-gray-800">学生分析</h1>
            </div>
            <p className="text-gray-600">個別学生の学習進捗と理解度を分析します</p>
          </motion.div>

          {/* 全体統計 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
          >
            <Card className="shadow-lg border-0">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5 text-indigo-600" />
                  総学生数
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{overallStats.totalStudents}</p>
              </CardContent>
            </Card>

            <Card className="shadow-lg border-0">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="h-5 w-5 text-green-600" />
                  全体正答率
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-green-600">
                  {overallStats.overallAccuracy.toFixed(1)}%
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-lg border-0">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-amber-600" />
                  難易度分布
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>易: {overallStats.difficultyDistribution.easy}問</span>
                    <span>中: {overallStats.difficultyDistribution.medium}問</span>
                    <span>難: {overallStats.difficultyDistribution.hard}問</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* 検索バー */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-6"
          >
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                type="text"
                placeholder="学生名またはメールアドレスで検索..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="pl-10"
              />
            </div>
          </motion.div>

          {/* 学生リスト */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="shadow-lg border-0">
              <CardHeader>
                <CardTitle>学生一覧</CardTitle>
                <CardDescription>
                  クリックして個別の学習状況を確認
                </CardDescription>
              </CardHeader>
              <CardContent>
                {filteredStudents.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <User className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>該当する学生が見つかりません</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredStudents.map((student, index) => {
                      return (
                        <motion.div
                          key={student._id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.4 + index * 0.05 }}
                        >
                          <Card 
                            className="p-4 hover:shadow-md transition-shadow cursor-pointer"
                            onClick={() => handleStudentClick(student._id as any)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                                  <User className="h-5 w-5 text-indigo-600" />
                                </div>
                                <div>
                                  <p className="font-medium">{student.name}</p>
                                  <p className="text-sm text-gray-600">{student.email}</p>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-6">
                                <div className="text-right">
                                  <p className="text-sm text-gray-600">回答数</p>
                                  <p className="font-medium">{student.totalResponses}</p>
                                </div>
                                
                                <div className="text-right">
                                  <p className="text-sm text-gray-600">正答率</p>
                                  <div className="flex items-center gap-2">
                                    <Progress value={student.accuracy} className="w-16" />
                                    <span className="font-medium">{student.accuracy}%</span>
                                  </div>
                                </div>
                                
                                <div className="text-right">
                                  <p className="text-sm text-gray-600">最終活動</p>
                                  <p className="text-sm">
                                    {new Date(student.lastActivity).toLocaleDateString('ja-JP')}
                                  </p>
                                </div>

                                {student.learningLevel === 'advanced' && (
                                  <Badge className="bg-purple-100 text-purple-800">
                                    <Brain className="h-3 w-3 mr-1" />
                                    上級
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* 注意事項 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-6"
          >
            <Card className="shadow-lg border-0 bg-amber-50 border-amber-200">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-amber-800">
                  <AlertCircle className="h-5 w-5" />
                  プライバシー保護について
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-amber-700">
                  学生の個人情報と学習データは適切に保護されています。
                  パーソナライズ学習の推奨内容は、個人を特定できない形で集計・分析されています。
                  教師は学生の学習状況を確認できますが、詳細な回答内容へのアクセスは制限されています。
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* 学生詳細モーダル */}
      {selectedStudentId && (
        <StudentLearningModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedStudentId(null);
          }}
          studentId={selectedStudentId}
        />
      )}
    </AuthGuard>
  );
} 