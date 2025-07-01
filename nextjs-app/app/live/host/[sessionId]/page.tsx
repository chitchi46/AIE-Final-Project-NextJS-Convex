"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { 
  Users, 
  Play, 
  SkipForward, 
  Trophy,
  QrCode,
  Copy,
  Clock,
  CheckCircle,
  XCircle
} from "lucide-react";
import { LoadingSpinner } from "@/components/loading-spinner";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

export default function LiveHostPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;
  
  const session = useQuery(api.liveQuiz.getActiveSession, { sessionId: sessionId as any });
  const currentAnswers = useQuery(api.liveQuiz.getCurrentQuestionAnswers, 
    session?.status === "active" && session.currentQuestionIndex >= 0 
      ? { sessionId: sessionId as any, questionIndex: session.currentQuestionIndex }
      : "skip"
  );
  const startSession = useMutation(api.liveQuiz.startSession);
  const nextQuestion = useMutation(api.liveQuiz.nextQuestion);
  
  const [timer, setTimer] = useState(0);
  const [showResults, setShowResults] = useState(false);

  // タイマー機能
  useEffect(() => {
    if (session?.status === "active" && session.currentQuestionStartedAt) {
      const interval = setInterval(() => {
        const elapsed = Date.now() - (session.currentQuestionStartedAt || 0);
        setTimer(Math.floor(elapsed / 1000));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [session]);

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" text="セッションを読み込み中..." />
      </div>
    );
  }

  const handleStart = async () => {
    try {
      await startSession({ sessionId: sessionId as any });
      toast.success("セッションを開始しました");
    } catch (error) {
      toast.error("セッションの開始に失敗しました");
    }
  };

  const handleNext = async () => {
    try {
      await nextQuestion({ sessionId: sessionId as any });
      setTimer(0);
      setShowResults(false);
    } catch (error) {
      toast.error("次の質問への移動に失敗しました");
    }
  };

  const copyAccessCode = () => {
    navigator.clipboard.writeText(session.accessCode);
    toast.success("アクセスコードをコピーしました");
  };

  const joinUrl = `${window.location.origin}/live/join`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{session.title}</h1>
          <p className="text-gray-600">講義: {session.lecture?.title}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* メインコンテンツ */}
          <div className="lg:col-span-2 space-y-6">
            {/* ステータスカード */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>セッション状態</CardTitle>
                  <Badge variant={
                    session.status === "waiting" ? "secondary" :
                    session.status === "active" ? "default" : "outline"
                  }>
                    {session.status === "waiting" ? "待機中" :
                     session.status === "active" ? "進行中" : "終了"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {session.status === "waiting" && (
                  <div className="text-center py-8">
                    <p className="text-lg mb-4">参加者の入室を待っています...</p>
                    <Button size="lg" onClick={handleStart} disabled={session.participants.length === 0}>
                      <Play className="mr-2 h-5 w-5" />
                      セッションを開始
                    </Button>
                  </div>
                )}

                {session.status === "active" && session.currentQuestion && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">
                        問題 {session.currentQuestionIndex + 1}
                      </h3>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          <span className="text-sm">
                            {currentAnswers?.length || 0} / {session.participants.length} 回答済み
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <span className="font-mono">{timer}秒</span>
                        </div>
                      </div>
                    </div>

                    <Card className="bg-indigo-50 border-indigo-200">
                      <CardContent className="pt-6">
                        <p className="text-lg mb-4">{session.currentQuestion.question}</p>
                        {session.currentQuestion.questionType === "multiple_choice" && (
                          <div className="space-y-2">
                            {session.currentQuestion.options?.map((option, index) => (
                              <div key={index} className="p-3 bg-white rounded-lg border">
                                {option}
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* リアルタイム回答状況 */}
                    {currentAnswers && currentAnswers.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">リアルタイム回答状況</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* 正答率 */}
                            <div>
                              <p className="text-sm text-gray-600 mb-2">正答率</p>
                              <div className="flex items-center gap-2">
                                <Progress 
                                  value={(currentAnswers.filter(a => a.isCorrect).length / currentAnswers.length) * 100} 
                                  className="flex-1"
                                />
                                <span className="text-sm font-semibold">
                                  {Math.round((currentAnswers.filter(a => a.isCorrect).length / currentAnswers.length) * 100)}%
                                </span>
                              </div>
                            </div>
                            
                            {/* 回答分布（選択式の場合） */}
                            {session.currentQuestion.questionType === "multiple_choice" && session.currentQuestion.options && (
                              <div>
                                <p className="text-sm text-gray-600 mb-2">回答分布</p>
                                <div className="h-32">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={
                                      session.currentQuestion.options.map(option => ({
                                        name: option.substring(0, 10) + (option.length > 10 ? "..." : ""),
                                        count: currentAnswers.filter(a => a.answer === option).length,
                                        isCorrect: session.currentQuestion ? option === session.currentQuestion.answer : false
                                      }))
                                    }>
                                      <CartesianGrid strokeDasharray="3 3" />
                                      <XAxis dataKey="name" />
                                      <YAxis />
                                      <Tooltip />
                                      <Bar dataKey="count">
                                        {session.currentQuestion.options.map((option, index) => (
                                          <Cell 
                                            key={`cell-${index}`} 
                                            fill={session.currentQuestion && option === session.currentQuestion.answer ? "#10b981" : "#6366f1"} 
                                          />
                                        ))}
                                      </Bar>
                                    </BarChart>
                                  </ResponsiveContainer>
                                </div>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        onClick={() => setShowResults(!showResults)}
                      >
                        {showResults ? "問題を表示" : "結果を表示"}
                      </Button>
                      <Button onClick={handleNext}>
                        <SkipForward className="mr-2 h-4 w-4" />
                        次の問題へ
                      </Button>
                    </div>

                    {showResults && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200"
                      >
                        <p className="font-semibold text-green-800">
                          正解: {session.currentQuestion.answer}
                        </p>
                        {session.currentQuestion.explanation && (
                          <p className="mt-2 text-sm text-gray-600">
                            {session.currentQuestion.explanation}
                          </p>
                        )}
                      </motion.div>
                    )}
                  </div>
                )}

                {session.status === "ended" && (
                  <div className="text-center py-8">
                    <Trophy className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
                    <h3 className="text-2xl font-bold mb-2">セッション終了！</h3>
                    <p className="text-gray-600 mb-4">お疲れ様でした</p>
                    <Button onClick={() => router.push(`/live/results/${sessionId}`)}>
                      結果を見る
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* サイドバー */}
          <div className="space-y-6">
            {/* アクセス情報 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">参加方法</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mb-2">アクセスコード</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 p-3 bg-gray-100 rounded-lg text-xl font-mono text-center">
                      {session.accessCode}
                    </code>
                    <Button size="sm" variant="outline" onClick={copyAccessCode}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-2">参加URL</p>
                  <p className="text-xs break-all">{joinUrl}</p>
                </div>
              </CardContent>
            </Card>

            {/* 参加者リスト */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  参加者 ({session.participants.length}名)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <AnimatePresence>
                  {session.participants.map((participant, index) => (
                    <motion.div
                      key={participant.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center justify-between py-2 border-b last:border-0"
                    >
                      <span>{participant.name}</span>
                      <Badge variant="outline">{participant.score}点</Badge>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {session.participants.length === 0 && (
                  <p className="text-gray-500 text-sm">まだ参加者はいません</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
} 