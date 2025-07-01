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
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, CheckCircle, XCircle, Brain, Target, TrendingUp } from "lucide-react";
import Link from "next/link";
import { Id } from "@/convex/_generated/dataModel";
import { LoadingSpinner } from "@/components/loading-spinner";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

export default function PersonalizedQuizPage() {
  const params = useParams();
  const router = useRouter();
  const lectureId = params.id as Id<"lectures">;
  const { user, isLoading: authLoading } = useAuth();

  const [studentId, setStudentId] = useState<Id<"students"> | null>(null);
  const getOrCreateStudent = useMutation(api.students.getOrCreateStudent);

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
        toast.error("学生データの初期化に失敗しました");
      }
    };
    
    if (user && !authLoading) {
      initStudent();
    }
  }, [user, authLoading, getOrCreateStudent]);

  // パーソナライズされたQ&Aを取得
  const personalizedData = useQuery(
    api.personalization.getPersonalizedQA,
    studentId ? { studentId, lectureId, requestedCount: 10 } : "skip"
  );

  const lecture = useQuery(api.lectures.getLecture, { lectureId });
  const submitResponse = useMutation(api.qa.submitResponse);
  const savePersonalizationData = useMutation(api.personalization.savePersonalizationData);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [textAnswer, setTextAnswer] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [responses, setResponses] = useState<Array<{ qaId: string; isCorrect: boolean }>>([]);

  if (authLoading || !user || !personalizedData || !lecture || !studentId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <Brain className="h-12 w-12 text-indigo-600 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">学習履歴を分析中...</p>
        </div>
      </div>
    );
  }

  const { selectedQAs, learningLevel, personalizedDifficulty, recommendations } = personalizedData;
  
  if (selectedQAs.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Q&Aが見つかりません</CardTitle>
              <CardDescription>この講義にはまだQ&Aが作成されていません。</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/dashboard">ダッシュボードに戻る</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const currentQA = selectedQAs[currentIndex];
  const progress = ((currentIndex + 1) / selectedQAs.length) * 100;

  const handleSubmit = async () => {
    if (isSubmitting) return;

    const answer = currentQA.questionType === "multiple_choice" ? selectedAnswer : textAnswer;
    if (!answer.trim()) {
      toast.error("回答を入力してください");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await submitResponse({
        qaId: currentQA._id,
        studentId,
        answer,
      });

      setIsCorrect(result.isCorrect);
      setShowResult(true);
      setResponses([...responses, { qaId: currentQA._id, isCorrect: result.isCorrect }]);

      // 最後の問題の場合、パーソナライゼーションデータを保存
      if (currentIndex === selectedQAs.length - 1) {
        await savePersonalizationData({
          studentId,
          lectureId,
          learningLevel,
          personalizedDifficulty,
        });
      }
    } catch (error) {
      console.error("回答送信エラー:", error);
      toast.error("回答の送信に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < selectedQAs.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedAnswer("");
      setTextAnswer("");
      setShowResult(false);
    } else {
      // 結果ページへ遷移
      router.push(`/quiz/personalized/${lectureId}/results`);
    }
  };

  const difficultyColor = {
    easy: "bg-green-100 text-green-800",
    medium: "bg-yellow-100 text-yellow-800",
    hard: "bg-red-100 text-red-800",
  };

  const learningLevelInfo = {
    beginner: { label: "初級", color: "bg-blue-100 text-blue-800", icon: "🌱" },
    intermediate: { label: "中級", color: "bg-purple-100 text-purple-800", icon: "🌿" },
    advanced: { label: "上級", color: "bg-indigo-100 text-indigo-800", icon: "🌳" },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Button variant="ghost" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              ダッシュボードに戻る
            </Link>
          </Button>
        </motion.div>

        {/* 学習レベルと推奨事項 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-0">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Brain className="h-6 w-6 text-indigo-600" />
                  <CardTitle>パーソナライズ学習</CardTitle>
                </div>
                <Badge className={learningLevelInfo[learningLevel].color}>
                  {learningLevelInfo[learningLevel].icon} {learningLevelInfo[learningLevel].label}レベル
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    難易度配分
                  </h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">易しい</span>
                      <div className="flex items-center gap-2">
                        <Progress value={personalizedDifficulty.easy * 100} className="w-24" />
                        <span className="text-sm font-medium">{Math.round(personalizedDifficulty.easy * 100)}%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">普通</span>
                      <div className="flex items-center gap-2">
                        <Progress value={personalizedDifficulty.medium * 100} className="w-24" />
                        <span className="text-sm font-medium">{Math.round(personalizedDifficulty.medium * 100)}%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">難しい</span>
                      <div className="flex items-center gap-2">
                        <Progress value={personalizedDifficulty.hard * 100} className="w-24" />
                        <span className="text-sm font-medium">{Math.round(personalizedDifficulty.hard * 100)}%</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    学習アドバイス
                  </h4>
                  <ul className="space-y-1">
                    {recommendations.map((rec, index) => (
                      <li key={index} className="text-sm text-gray-600">
                        • {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* クイズカード */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="shadow-xl">
            <CardHeader>
              <div className="flex justify-between items-center mb-2">
                <CardTitle>{lecture.title}</CardTitle>
                <Badge className={difficultyColor[currentQA.difficulty as keyof typeof difficultyColor]}>
                  {currentQA.difficulty === "easy" && "易"}
                  {currentQA.difficulty === "medium" && "中"}
                  {currentQA.difficulty === "hard" && "難"}
                </Badge>
              </div>
              <CardDescription>
                問題 {currentIndex + 1} / {selectedQAs.length}
              </CardDescription>
              <Progress value={progress} className="mt-2" />
            </CardHeader>

            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-4">{currentQA.question}</h3>

                {!showResult && (
                  <>
                    {/* 選択式の場合 */}
                    {currentQA.questionType === "multiple_choice" && currentQA.options && (
                      <RadioGroup value={selectedAnswer} onValueChange={setSelectedAnswer}>
                        <div className="space-y-3">
                          {currentQA.options.map((option: string, index: number) => (
                            <div key={index} className="flex items-center space-x-2">
                              <RadioGroupItem value={option} id={`option-${index}`} />
                              <Label htmlFor={`option-${index}`} className="cursor-pointer">
                                {option}
                              </Label>
                            </div>
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
                        rows={currentQA.questionType === "descriptive" ? 6 : 3}
                      />
                    )}
                  </>
                )}

                {/* 結果表示 */}
                <AnimatePresence>
                  {showResult && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="space-y-4"
                    >
                      <div className={`p-4 rounded-lg ${
                        isCorrect ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"
                      }`}>
                        <div className="flex items-center gap-2 mb-2">
                          {isCorrect ? (
                            <>
                              <CheckCircle className="h-5 w-5 text-green-600" />
                              <span className="font-semibold text-green-800">正解です！</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="h-5 w-5 text-red-600" />
                              <span className="font-semibold text-red-800">不正解です</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div>
                          <h4 className="font-medium text-sm text-gray-600">正解:</h4>
                          <p className="mt-1">{currentQA.answer}</p>
                        </div>
                        {currentQA.explanation && (
                          <div>
                            <h4 className="font-medium text-sm text-gray-600">解説:</h4>
                            <p className="mt-1 text-sm">{currentQA.explanation}</p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                  disabled={currentIndex === 0}
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
                  <Button onClick={handleNext}>
                    {currentIndex < selectedQAs.length - 1 ? (
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
        </motion.div>
      </div>
    </div>
  );
}
