"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, CheckCircle, XCircle } from "lucide-react";
import Link from "next/link";
import { Id } from "@/convex/_generated/dataModel";
import { LoadingSpinner } from "@/components/loading-spinner";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

export default function QuizPage() {
  const params = useParams();
  const router = useRouter();
  const lectureId = params.id as Id<"lectures">;
  const { user, isLoading: authLoading } = useAuth();

  const lecture = useQuery(api.lectures.getLecture, { lectureId });
  const qas = useQuery(api.qa.listQA, { lectureId });
  const submitResponse = useMutation(api.qa.submitResponse);
  const getOrCreateStudent = useMutation(api.students.getOrCreateStudent);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [textAnswer, setTextAnswer] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [lastResult, setLastResult] = useState<{
    isCorrect: boolean;
    correctAnswer: string;
    explanation?: string;
  } | null>(null);
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [studentId, setStudentId] = useState<Id<"students"> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    
    if (user && !authLoading) {
      initStudent();
    }
  }, [user, authLoading, getOrCreateStudent]);

  if (authLoading || !user || !lecture || !qas || !studentId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <LoadingSpinner size="lg" text="クイズを読み込み中..." />
      </div>
    );
  }

  if (qas.length === 0) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-gray-600 mb-4">この講義にはまだQ&Aがありません</p>
            <Button asChild>
              <Link href="/dashboard">
                <ArrowLeft className="mr-2 h-4 w-4" />
                ダッシュボードに戻る
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQA = qas[currentIndex];
  const progress = ((currentIndex + (showResult ? 1 : 0)) / qas.length) * 100;

  const handleSubmit = async () => {
    if (!currentQA || !studentId) return;

    const answer = currentQA.questionType === "multiple_choice" ? selectedAnswer : textAnswer;
    if (!answer) {
      toast.error("回答を入力してください");
      return;
    }

    setIsSubmitting(true);
    const submitStartTime = Date.now();

    try {
      // 楽観的UI更新のためのタイムアウト設定
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error("回答処理がタイムアウトしました"));
        }, 1000); // 1秒でタイムアウト
      });

      // 回答送信
      const submitPromise = submitResponse({
        qaId: currentQA._id,
        studentId,
        answer,
      });

      // タイムアウトと回答送信を競争させる
      const result = await Promise.race([submitPromise, timeoutPromise]);

      const totalTime = Date.now() - submitStartTime;
      console.log(`UI更新時間: ${totalTime}ms`);

      // 結果を即座に表示
      setLastResult({
        isCorrect: result.isCorrect,
        correctAnswer: result.correctAnswer,
        explanation: result.explanation,
      });
      setAnswers(prev => ({ ...prev, [currentQA._id]: result.isCorrect }));
      setShowResult(true);

      // 成功/失敗のフィードバック
      if (result.isCorrect) {
        toast.success("正解です！", {
          description: `処理時間: ${result.processingTime}ms`,
        });
      } else {
        toast.error("不正解です", {
          description: `正解: ${result.correctAnswer}`,
        });
      }

      // 自動進行は無効化 - ユーザーが明示的に「次へ」ボタンを押すまで待機
    } catch (error) {
      const totalTime = Date.now() - submitStartTime;
      console.error("回答送信エラー:", error);
      
      if (error instanceof Error && error.message.includes("タイムアウト")) {
        toast.error("回答処理がタイムアウトしました", {
          description: "ネットワークが混雑している可能性があります",
        });
      } else {
        toast.error("回答の送信に失敗しました");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < qas.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedAnswer("");
      setTextAnswer("");
      setShowResult(false);
      setLastResult(null);
    } else {
      // 全問終了
      router.push(`/quiz/${lectureId}/results`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto p-4 sm:p-6 max-w-4xl">
        <div className="mb-4 sm:mb-6">
          <Button variant="ghost" asChild className="mb-2">
            <Link href="/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">ダッシュボードに戻る</span>
              <span className="sm:hidden">戻る</span>
            </Link>
          </Button>
        </div>

        {/* 進捗バー */}
        <Card className="mb-4 sm:mb-6 shadow-sm">
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex justify-between text-xs sm:text-sm text-gray-600 mb-2">
              <span>問題 {currentIndex + 1} / {qas.length}</span>
              <span>{Math.round(progress)}% 完了</span>
            </div>
            <Progress value={progress} className="h-2 sm:h-3" />
          </CardContent>
        </Card>

        {/* 質問カード */}
        <Card className="shadow-lg">
          <CardHeader className="pb-4 sm:pb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <CardTitle className="text-lg sm:text-xl line-clamp-2">{lecture.title}</CardTitle>
              <span className={`inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${
                currentQA.difficulty === "easy" ? "bg-green-100 text-green-800" :
                currentQA.difficulty === "medium" ? "bg-yellow-100 text-yellow-800" :
                "bg-red-100 text-red-800"
              }`}>
                {currentQA.difficulty === "easy" && "易"}
                {currentQA.difficulty === "medium" && "中"}
                {currentQA.difficulty === "hard" && "難"}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 sm:space-y-6">
            <div>
              <h3 className="text-base sm:text-lg font-medium mb-3 sm:mb-4 leading-relaxed">{currentQA.question}</h3>

              {!showResult && (
                <>
                  {/* 選択式の場合 */}
                  {currentQA.questionType === "multiple_choice" && currentQA.options && (
                    <RadioGroup value={selectedAnswer} onValueChange={setSelectedAnswer}>
                      <div className="space-y-2 sm:space-y-3">
                        {currentQA.options.map((option, index) => (
                          <motion.div 
                            key={index}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="flex items-center space-x-2 p-3 sm:p-4 rounded-lg border hover:bg-gray-50 transition-colors cursor-pointer"
                            onClick={() => setSelectedAnswer(option)}
                          >
                            <RadioGroupItem value={option} id={`option-${index}`} />
                            <Label 
                              htmlFor={`option-${index}`} 
                              className="cursor-pointer text-sm sm:text-base flex-1"
                            >
                              {option}
                            </Label>
                          </motion.div>
                        ))}
                      </div>
                    </RadioGroup>
                  )}

                  {/* 記述式の場合 */}
                  {(currentQA.questionType === "short_answer" || currentQA.questionType === "descriptive") && (
                    <Textarea
                      value={textAnswer}
                      onChange={(e) => setTextAnswer(e.target.value)}
                      placeholder="回答を入力してください"
                      rows={currentQA.questionType === "descriptive" ? 4 : 2}
                      className="text-sm sm:text-base"
                    />
                  )}
                </>
              )}

              {/* 結果表示 */}
              {showResult && lastResult && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-4"
                >
                  <div className={`p-3 sm:p-4 rounded-lg ${
                    lastResult.isCorrect 
                      ? "bg-green-50 border border-green-200" 
                      : "bg-red-50 border border-red-200"
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      {lastResult.isCorrect ? (
                        <>
                          <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                          <span className="font-medium text-green-800 text-sm sm:text-base">正解です！</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
                          <span className="font-medium text-red-800 text-sm sm:text-base">不正解</span>
                        </>
                      )}
                    </div>
                    
                    {!lastResult.isCorrect && (
                      <div className="mt-2">
                        <p className="text-xs sm:text-sm text-gray-700">
                          <span className="font-medium">正解:</span> {lastResult.correctAnswer}
                        </p>
                      </div>
                    )}

                    {lastResult.explanation && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-xs sm:text-sm text-gray-700">{lastResult.explanation}</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </div>

            {/* アクションボタン */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 sm:justify-between">
              <Button
                variant="outline"
                onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                disabled={currentIndex === 0}
                className="w-full sm:w-auto order-2 sm:order-1"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                前の問題
              </Button>

              {!showResult ? (
                <Button
                  onClick={handleSubmit}
                  disabled={
                    isSubmitting ||
                    (currentQA.questionType === "multiple_choice" && !selectedAnswer) ||
                    ((currentQA.questionType === "short_answer" || currentQA.questionType === "descriptive") && !textAnswer.trim())
                  }
                  className="w-full sm:w-auto order-1 sm:order-2"
                  size="lg"
                >
                  {isSubmitting ? (
                    <>
                      <LoadingSpinner size="sm" />
                      <span className="ml-2">送信中...</span>
                    </>
                  ) : (
                    "回答する"
                  )}
                </Button>
              ) : (
                <Button 
                  onClick={handleNext}
                  className="w-full sm:w-auto order-1 sm:order-2"
                  size="lg"
                >
                  {currentIndex < qas.length - 1 ? (
                    <>
                      次の問題
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  ) : (
                    "結果を見る"
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 