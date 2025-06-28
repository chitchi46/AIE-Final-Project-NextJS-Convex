"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, 
  TrendingDown, 
  Brain,
  Users,
  Clock,
  Calendar,
  Target,
  AlertCircle,
  ChevronRight,
  BarChart3,
  LineChart,
  Activity
} from "lucide-react";
import Link from "next/link";
import { LoadingSpinner } from "@/components/loading-spinner";
import { motion } from "framer-motion";
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  LineChart as RechartsLineChart, 
  Line, 
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from "recharts";
import { Id } from "@/convex/_generated/dataModel";

export default function AdvancedAnalyticsPage() {
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [selectedLecture, setSelectedLecture] = useState<string | null>(null);
  
  const students = useQuery(api.students.list, {});
  const lectures = useQuery(api.lectures.listLectures, {});
  
  const learningPatterns = useQuery(
    api.analytics.getLearningPatterns, 
    selectedLecture ? { lectureId: selectedLecture as Id<"lectures"> } : {}
  );

  const predictiveAnalytics = useQuery(
    api.analytics.getPredictiveAnalytics,
    selectedStudent ? { studentId: selectedStudent as Id<"students"> } : "skip"
  );

  const cohortAnalysis = useQuery(
    api.analytics.getCohortAnalysis,
    selectedLecture ? { lectureId: selectedLecture as Id<"lectures"> } : "skip"
  );

  if (!students || !lectures) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">分析データを読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                <Brain className="h-8 w-8 text-indigo-600" />
                高度な学習分析
              </h1>
              <p className="text-gray-600 mt-2">AIによる学習パターン分析と予測</p>
            </div>
            <Button variant="outline" asChild>
              <Link href="/teacher/analytics">
                基本分析に戻る
              </Link>
            </Button>
          </div>

          {/* フィルター */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Select value={selectedStudent || ""} onValueChange={setSelectedStudent}>
              <SelectTrigger>
                <SelectValue placeholder="学生を選択（任意）" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">全学生</SelectItem>
                {students.map((student) => (
                  <SelectItem key={student._id} value={student._id}>
                    {student.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedLecture || ""} onValueChange={setSelectedLecture}>
              <SelectTrigger>
                <SelectValue placeholder="講義を選択（任意）" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">全講義</SelectItem>
                {lectures.map((lecture) => (
                  <SelectItem key={lecture._id} value={lecture._id}>
                    {lecture.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs defaultValue="patterns" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="patterns">学習パターン</TabsTrigger>
            <TabsTrigger value="predictive">予測分析</TabsTrigger>
            <TabsTrigger value="cohort">コホート分析</TabsTrigger>
          </TabsList>

          {/* 学習パターン分析 */}
          <TabsContent value="patterns" className="space-y-6">
            {learningPatterns ? (
              <>
                {/* サマリーカード */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">総回答数</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">{learningPatterns.totalResponses}</p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">全体正答率</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">{learningPatterns.overallAccuracy}%</p>
                      <Progress value={learningPatterns.overallAccuracy} className="mt-2" />
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">最大連続正解</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">{learningPatterns.maxStreak}</p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">学習速度</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2">
                        {learningPatterns.learningVelocity > 0 ? (
                          <TrendingUp className="h-5 w-5 text-green-600" />
                        ) : (
                          <TrendingDown className="h-5 w-5 text-red-600" />
                        )}
                        <p className="text-2xl font-bold">
                          {Math.abs(learningPatterns.learningVelocity)}%
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* グラフセクション */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* 時間帯別パターン */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        時間帯別学習パターン
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={learningPatterns.timePattern}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="hour" />
                            <YAxis />
                            <Tooltip />
                            <Area 
                              type="monotone" 
                              dataKey="accuracy" 
                              stroke="#6366f1" 
                              fill="#6366f1" 
                              fillOpacity={0.6}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  {/* 曜日別パターン */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        曜日別学習パターン
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={learningPatterns.dayPattern}>
                            <CartesianGrid strokeDasharray="3 3" />
                                                          <XAxis dataKey="day" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="accuracy" fill="#10b981" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* 難易度別パフォーマンス */}
                <Card>
                  <CardHeader>
                    <CardTitle>難易度別パフォーマンス</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {learningPatterns.difficultyPattern.map((item) => (
                        <div key={item.difficulty} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Badge variant={
                              item.difficulty === "easy" ? "default" :
                              item.difficulty === "medium" ? "secondary" : "destructive"
                            }>
                              {item.difficulty === "easy" ? "易" :
                               item.difficulty === "medium" ? "中" : "難"}
                            </Badge>
                            <span className="text-sm">
                              {item.attempts}問中{item.correct}問正解
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{item.accuracy}%</span>
                            <Progress value={item.accuracy} className="w-32" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-gray-500">
                  分析するデータを選択してください
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* 予測分析 */}
          <TabsContent value="predictive" className="space-y-6">
            {predictiveAnalytics && predictiveAnalytics.hasEnoughData ? (
              <>
                {/* 現在のパフォーマンス */}
                <Card>
                  <CardHeader>
                    <CardTitle>現在のパフォーマンス</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">最近の正答率</p>
                        <p className="text-3xl font-bold">
                          {predictiveAnalytics.currentPerformance?.recentAccuracy}%
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">トレンド</p>
                        <div className="flex items-center gap-2">
                          {predictiveAnalytics.currentPerformance?.trend === "improving" ? (
                            <TrendingUp className="h-6 w-6 text-green-600" />
                          ) : predictiveAnalytics.currentPerformance?.trend === "declining" ? (
                            <TrendingDown className="h-6 w-6 text-red-600" />
                          ) : (
                            <Activity className="h-6 w-6 text-gray-600" />
                          )}
                          <span className="text-xl font-semibold">
                            {predictiveAnalytics.currentPerformance?.trend === "improving" ? "上昇中" :
                             predictiveAnalytics.currentPerformance?.trend === "declining" ? "下降中" : "安定"}
                          </span>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">予測される次回正答率</p>
                        <p className="text-3xl font-bold text-indigo-600">
                          {predictiveAnalytics.prediction?.nextSessionAccuracy}%
                        </p>
                        <p className="text-xs text-gray-500">
                          信頼度: {predictiveAnalytics.prediction?.confidence === "high" ? "高" : "中"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* パフォーマンス履歴 */}
                <Card>
                  <CardHeader>
                    <CardTitle>パフォーマンス履歴</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsLineChart data={predictiveAnalytics.performanceHistory || []}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="period" />
                          <YAxis />
                          <Tooltip />
                          <Line 
                            type="monotone" 
                            dataKey="accuracy" 
                            stroke="#6366f1" 
                            strokeWidth={2}
                            dot={{ fill: "#6366f1" }}
                          />
                        </RechartsLineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* 推奨アクション */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5" />
                      推奨される学習アクション
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {(predictiveAnalytics.recommendations || []).map((rec, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="flex items-start gap-3 p-3 rounded-lg bg-gray-50"
                        >
                          <Badge variant={
                            rec.priority === "high" ? "destructive" :
                            rec.priority === "medium" ? "secondary" : "outline"
                          }>
                            {rec.priority === "high" ? "高" :
                             rec.priority === "medium" ? "中" : "低"}
                          </Badge>
                          <p className="text-sm">{rec.message}</p>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* 苦手分野 */}
                {(predictiveAnalytics.weakTopics || []).length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-amber-600" />
                        改善が必要な分野
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {(predictiveAnalytics.weakTopics || []).map((topic, index) => (
                          <div key={index} className="flex items-center justify-between">
                            <span className="text-sm">{topic.topic}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-600">
                                {topic.attempts}回中
                              </span>
                              <Badge variant="destructive">{topic.accuracy}%</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-gray-500">
                  {selectedStudent 
                    ? "予測分析には最低10件の回答履歴が必要です" 
                    : "学生を選択してください"}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* コホート分析 */}
          <TabsContent value="cohort" className="space-y-6">
            {cohortAnalysis ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>コホート別パフォーマンス</CardTitle>
                    <CardDescription>
                      {cohortAnalysis.totalStudents}名の学生を分析
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {cohortAnalysis.cohorts.map((cohort) => (
                        <div key={cohort.cohortNumber} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold flex items-center gap-2">
                              <Users className="h-4 w-4" />
                              {cohort.label} ({cohort.studentCount}名)
                            </h4>
                            <Badge>{cohort.avgAccuracy}%</Badge>
                          </div>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <p className="text-gray-600">平均回答数</p>
                              <p className="font-semibold">{cohort.avgResponses}問</p>
                            </div>
                            <div>
                              <p className="text-gray-600">平均学習期間</p>
                              <p className="font-semibold">{cohort.avgLearningDays}日</p>
                            </div>
                            <div>
                              <p className="text-gray-600">平均正答率</p>
                              <Progress value={cohort.avgAccuracy} className="mt-1" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* インサイト */}
                {cohortAnalysis.insights.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>分析から得られたインサイト</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {cohortAnalysis.insights.map((insight, index) => (
                          <div
                            key={index}
                            className={`p-3 rounded-lg border ${
                              insight.severity === "high" 
                                ? "border-red-200 bg-red-50" 
                                : "border-amber-200 bg-amber-50"
                            }`}
                          >
                            <p className="text-sm">{insight.message}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-gray-500">
                  講義を選択してください
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
} 