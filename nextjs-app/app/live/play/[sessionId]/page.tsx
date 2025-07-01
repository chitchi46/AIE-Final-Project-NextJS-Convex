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
  Clock,
  Trophy,
  CheckCircle,
  XCircle,
  Users
} from "lucide-react";
import { LoadingSpinner } from "@/components/loading-spinner";
import { motion, AnimatePresence } from "framer-motion";

export default function LivePlayPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;
  
  const session = useQuery(api.liveQuiz.getActiveSession, { sessionId: sessionId as any });
  const submitAnswer = useMutation(api.liveQuiz.submitLiveAnswer);
  
  const [selectedAnswer, setSelectedAnswer] = useState<string>("");
  const [hasAnswered, setHasAnswered] = useState(false);
  const [timer, setTimer] = useState(0);
  const [currentParticipant, setCurrentParticipant] = useState<any>(null);

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

  // 新しい質問が開始されたら回答状態をリセット
  useEffect(() => {
    if (session?.status === "active") {
      setHasAnswered(false);
      setSelectedAnswer("");
    }
  }, [session?.currentQuestionIndex]);

  // 参加者の情報を取得
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const participantData = sessionStorage.getItem('liveQuizParticipant');
      if (participantData) {
        const participant = JSON.parse(participantData);
        const foundParticipant = session?.participants.find(p => p.id === participant.id);
        setCurrentParticipant(foundParticipant);
      }
    }
  }, [session?.participants]);

  const handleSubmitAnswer = async () => {
    if (!selectedAnswer || hasAnswered || !currentParticipant) return;
    
    try {
      await submitAnswer({
        sessionId: sessionId as any,
        questionIndex: session.currentQuestionIndex,
        answer: selectedAnswer,
        participantId: currentParticipant.id,
        timeSpent: timer
      });
      setHasAnswered(true);
      toast.success("回答を送信しました");
    } catch (error) {
      toast.error("回答の送信に失敗しました");
    }
  };

  // デバッグ用
  if (session?.currentQuestion) {
    console.log("Current question data:", session.currentQuestion);
  }
  if (currentParticipant) {
    console.log("Current participant:", currentParticipant);
  } else {
    console.log("No current participant found");
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" text="セッションを読み込み中..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2">{session.title}</h1>
          <p className="text-gray-600">講義: {session.lecture?.title}</p>
          {currentParticipant && (
            <div className="mt-4">
              <Badge variant="outline" className="text-lg px-4 py-2">
                {currentParticipant.name} - {currentParticipant.score}点
              </Badge>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {/* セッション状態 */}
          {session.status === "waiting" && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <Users className="h-16 w-16 text-blue-500 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold mb-2">セッション開始を待機中...</h3>
                  <p className="text-gray-600 mb-4">先生がセッションを開始するまでお待ちください</p>
                  <div className="flex items-center justify-center gap-4">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span className="text-sm">参加者: {session.participants.length}名</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 進行中の質問 */}
          {session.status === "active" && session.currentQuestion && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* 質問ヘッダー */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl">
                      問題 {session.currentQuestionIndex + 1}
                    </CardTitle>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span className="font-mono text-lg">{timer}秒</span>
                      </div>
                      {hasAnswered && (
                        <Badge variant="secondary">
                          <CheckCircle className="h-4 w-4 mr-1" />
                          回答済み
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-lg mb-6">
                    {session.currentQuestion.question || "AI開発において、データ整備とは何ですか？"}
                  </p>

                  {/* 選択肢（多肢選択問題の場合） */}
                  {session.currentQuestion.questionType === "multiple_choice" && session.currentQuestion.options && (
                    <div className="space-y-3">
                      {session.currentQuestion.options.map((option, index) => (
                        <motion.button
                          key={index}
                          whileHover={{ scale: hasAnswered ? 1 : 1.02 }}
                          whileTap={{ scale: hasAnswered ? 1 : 0.98 }}
                          className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
                            selectedAnswer === option
                              ? "border-blue-500 bg-blue-50"
                              : "border-gray-200 bg-white hover:border-gray-300"
                          } ${hasAnswered ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
                          onClick={() => {
                            if (!hasAnswered) {
                              setSelectedAnswer(option);
                            }
                          }}
                          disabled={hasAnswered}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-4 h-4 rounded-full border-2 ${
                              selectedAnswer === option ? "border-blue-500 bg-blue-500" : "border-gray-300"
                            }`}>
                              {selectedAnswer === option && (
                                <div className="w-full h-full rounded-full bg-white transform scale-50" />
                              )}
                            </div>
                            <span className="text-sm font-medium">{String.fromCharCode(65 + index)}</span>
                            <span>{option}</span>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  )}

                  {/* 記述式問題の場合または質問タイプが不明な場合 */}
                  {(session.currentQuestion.questionType === "text" || 
                    session.currentQuestion.questionType === "descriptive" ||
                    session.currentQuestion.questionType === "short_answer" ||
                    !session.currentQuestion.questionType) && (
                    <div className="space-y-4">
                      <textarea
                        className={`w-full p-4 border-2 rounded-lg resize-none ${
                          hasAnswered ? "cursor-not-allowed opacity-60" : ""
                        }`}
                        rows={4}
                        placeholder="こちらに回答を入力してください..."
                        value={selectedAnswer}
                        onChange={(e) => {
                          if (!hasAnswered) {
                            setSelectedAnswer(e.target.value);
                          }
                        }}
                        disabled={hasAnswered}
                      />
                    </div>
                  )}

                  {/* 回答ボタン */}
                  {!hasAnswered && (
                    <div className="mt-6">
                      <Button
                        onClick={handleSubmitAnswer}
                        disabled={!selectedAnswer || hasAnswered}
                        size="lg"
                        className="w-full"
                      >
                        回答を送信
                      </Button>
                    </div>
                  )}

                  {hasAnswered && (
                    <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center gap-2 text-green-800">
                        <CheckCircle className="h-5 w-5" />
                        <span className="font-semibold">回答を送信しました</span>
                      </div>
                      <p className="text-sm text-green-600 mt-1">
                        次の問題まで少々お待ちください
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* セッション終了 */}
          {session.status === "ended" && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <Trophy className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold mb-2">お疲れ様でした！</h3>
                  <p className="text-gray-600 mb-4">セッションが終了しました</p>
                  {currentParticipant && (
                    <div className="text-2xl font-bold text-blue-600 mb-4">
                      最終スコア: {currentParticipant.score}点
                    </div>
                  )}
                  <Button onClick={() => router.push("/dashboard")}>
                    ダッシュボードに戻る
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 現在の順位（進行中の場合） */}
          {session.status === "active" && session.participants.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">現在の順位</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {session.participants
                    .sort((a, b) => b.score - a.score)
                    .map((participant, index) => (
                      <div
                        key={participant.id}
                        className={`flex items-center justify-between p-2 rounded ${
                          participant.id === currentParticipant?.id
                            ? "bg-blue-50 border border-blue-200"
                            : "bg-gray-50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-lg">
                            {index + 1}位
                          </span>
                          <span>{participant.name}</span>
                        </div>
                        <span className="font-semibold">{participant.score}点</span>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
} 