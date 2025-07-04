"use client";

// Next.jsの静的エクスポートでビルドエラーを防ぐ
export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { ProgressOverlay } from "@/components/progress-overlay";
import { AlertCircle, Sparkles, X, FileText, Upload, Zap } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Id } from "@/convex/_generated/dataModel";
import { motion } from "framer-motion";
import { AuthGuard } from "@/components/auth-guard";
import { useAuth } from "@/hooks/useAuth";
import { FileUploadWithExtraction } from "@/components/file-upload-with-extraction";

function NewLectureContent() {
  const router = useRouter();
  const { user } = useAuth();
  const createLecture = useMutation(api.lectures.createLecture);
  const processFileAndGenerateQA = useAction(api.actions.processFileAndGenerateQA.processFileAndGenerateQA);
  const generateQAWithAI = useAction(api.actions.generateQA.generateQAWithAI);
  const extractFileContent = useAction(api.actions.extractFileContent.extractFileContent);
  const generateSuggestions = useAction(api.actions.generateSuggestions.generateSuggestions);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [extractedContent, setExtractedContent] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<Id<"files">[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useAI, setUseAI] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingText, setLoadingText] = useState("");
  const [questionCount, setQuestionCount] = useState(10);
  const [difficulty, setDifficulty] = useState({
    easy: 0.4,
    medium: 0.4,
    hard: 0.2,
  });
  const [autoProcessFiles, setAutoProcessFiles] = useState(true); // デフォルトでオン
  const [suggestions, setSuggestions] = useState<{title?: string; description?: string}>({});
  const [showSuggestions, setShowSuggestions] = useState(false);

  const createLectureAndGenerateQA = async (lectureTitle: string, lectureDescription: string, lectureContent: string) => {
    if (!user) {
      toast.error("認証が必要です。ログインしてください。");
      return;
    }
    if (!lectureTitle || !lectureDescription) {
      toast.error("講義のタイトルと説明が必要です。");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      setLoadingText("講義を作成中...");
      setLoadingProgress(10);
      
      const { lectureId } = await createLecture({
        title: lectureTitle,
        description: lectureDescription,
        files: [], // ファイルIDは保存しない
        createdBy: user._id,
      });

      setLoadingProgress(25);
      
      if (lectureContent.trim()) {
        setLoadingText("Q&Aを生成中...");
        setLoadingProgress(50);
        
        await generateQAWithAI({
          lectureId,
          content: lectureContent,
          difficulty,
          questionCount,
        });
        
        setLoadingProgress(90);
        toast.success("Q&Aの生成が完了しました！");
      }
        
      setLoadingProgress(100);
      toast.success("講義の作成が完了しました！", {
        description: lectureContent.trim() ? "Q&Aも自動生成されました。" : "講義を作成しました。",
      });

      // 生成結果確認のため講義詳細ページに遷移
      router.push(`/lecture/${lectureId}`);
    } catch (err) {
      setError("講義の作成中にエラーが発生しました。");
      toast.error("エラーが発生しました", {
        description: "もう一度お試しください",
      });
      console.error(err);
    } finally {
      setIsSubmitting(false);
      setLoadingProgress(0);
      setLoadingText("");
    }
  };

  const handleFileExtract = async (content: string, metadata?: { title?: string }) => {
    setExtractedContent(content);
    
    try {
      setLoadingText("AIが講義タイトルと概要を生成中...");
      setIsSubmitting(true);
      setLoadingProgress(20);
      
      const suggestionsResult = await generateSuggestions({
        content,
        fileName: metadata?.title,
      });
      
      const finalTitle = metadata?.title || suggestionsResult.title;
      const finalDescription = suggestionsResult.description;
      
      setSuggestions({
        title: finalTitle,
        description: finalDescription,
      });
      setShowSuggestions(true);
      
      if (autoProcessFiles && !title && !description) {
        setTitle(finalTitle);
        setDescription(finalDescription);
        toast.success("ファイル解析完了！", {
          description: "AIの提案を自動適用し、処理を開始します...",
          duration: 3000,
        });

        setTimeout(() => {
          createLectureAndGenerateQA(finalTitle, finalDescription, content);
        }, 1000);
      } else {
        toast.success("ファイル解析完了！", {
          description: "AIが講義タイトルと概要を提案しました",
          duration: 5000,
        });
      }
    } catch (error) {
      console.error("AI提案生成エラー:", error);
      toast.error("AIによる提案の生成に失敗しました");
    } finally {
      setIsSubmitting(false);
      setLoadingProgress(0);
      setLoadingText("");
    }
  };

  const applySuggestions = () => {
    if (suggestions.title) setTitle(suggestions.title);
    if (suggestions.description) setDescription(suggestions.description);
    setShowSuggestions(false);
    toast.success("提案を適用しました", {
      description: "必要に応じて編集してください",
    });
  };

  const dismissSuggestions = () => {
    setShowSuggestions(false);
    setSuggestions({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const contentToProcess = extractedContent || content;
    createLectureAndGenerateQA(title, description, contentToProcess);
  };

  return (
    <AuthGuard requiredRole="teacher">
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="shadow-xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Sparkles className="h-8 w-8 text-indigo-600" />
                    <div>
                      <CardTitle className="text-2xl">新規講義作成</CardTitle>
                      <CardDescription>
                        講義資料をアップロードして、AIがQ&Aを自動生成します
                      </CardDescription>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push('/dashboard')}
                    className="flex items-center gap-2"
                  >
                    ← ダッシュボードに戻る
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* 基本情報 */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      講義の基本情報
                    </h3>
                    
            <div className="space-y-2">
              <Label htmlFor="title">講義タイトル</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例：機械学習入門"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">講義の説明</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="この講義の概要を説明してください"
                rows={3}
                required
              />
            </div>
                  </div>

                  {/* ファイルアップロード（メイン機能） */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <Upload className="h-5 w-5" />
                      講義資料のアップロード
                      <span className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded-full">推奨</span>
                    </h3>
                    
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <Zap className="h-5 w-5 text-blue-600 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-blue-900">完全自動化プロセス</h4>
                          <p className="text-sm text-blue-700">
                            ファイルをアップロードするだけで、AIが以下を自動実行します：
                          </p>
                          <ul className="text-sm text-blue-700 mt-2 ml-4 list-disc">
                            <li>PDFをブラウザ内で高精度に解析</li>
                            <li>講義タイトルの自動提案</li>
                            <li>講義概要の自動生成</li>
                            <li>Q&A問題の自動作成</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mb-4">
                      <input
                        type="checkbox"
                        id="autoProcess"
                        checked={autoProcessFiles}
                        onChange={(e) => setAutoProcessFiles(e.target.checked)}
                        className="rounded"
                      />
                      <Label htmlFor="autoProcess" className="text-sm cursor-pointer">
                        ファイルアップロード後すぐに講義タイトル・概要を自動生成する（推奨）
                      </Label>
                    </div>

                    <FileUploadWithExtraction
                      onExtractComplete={handleFileExtract}
                      accept=".pdf,.md,.txt"
                      maxSize={10 * 1024 * 1024} // 10MB
                    />
                    
                    {extractedContent && (
                      <div className="text-sm text-green-600">
                        ✅ テキストの抽出が完了しました（{extractedContent.length.toLocaleString()}文字）
                      </div>
                    )}
                  </div>

                  {/* Q&A生成設定 */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <Sparkles className="h-5 w-5" />
                      Q&A生成設定
                    </h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="questionCount">生成する問題数</Label>
                        <Input
                          id="questionCount"
                          type="number"
                          value={questionCount}
                          onChange={(e) => setQuestionCount(Number(e.target.value))}
                          min="1"
                          max="50"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>難易度の配分</Label>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="easy" className="text-sm text-green-600">易しい</Label>
                          <Input
                            id="easy"
                            type="number"
                            step="0.1"
                            min="0"
                            max="1"
                            value={difficulty.easy}
                            onChange={(e) => setDifficulty(prev => ({ ...prev, easy: Number(e.target.value) }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="medium" className="text-sm text-yellow-600">普通</Label>
                          <Input
                            id="medium"
                            type="number"
                            step="0.1"
                            min="0"
                            max="1"
                            value={difficulty.medium}
                            onChange={(e) => setDifficulty(prev => ({ ...prev, medium: Number(e.target.value) }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="hard" className="text-sm text-red-600">難しい</Label>
                          <Input
                            id="hard"
                            type="number"
                            step="0.1"
                            min="0"
                            max="1"
                            value={difficulty.hard}
                            onChange={(e) => setDifficulty(prev => ({ ...prev, hard: Number(e.target.value) }))}
                          />
                        </div>
                      </div>
                      <p className="text-xs text-gray-500">
                        ※ 合計が1.0になるように調整してください（現在: {(difficulty.easy + difficulty.medium + difficulty.hard).toFixed(1)}）
                      </p>
                    </div>
                  </div>

                  {/* 手動入力（オプション） */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      追加の講義内容（オプション）
                    </h3>

            <div className="space-y-2">
                      <Label htmlFor="content">手動で入力する講義内容</Label>
                      <Textarea
                        id="content"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="ファイルに加えて、追加で入力したい講義内容があれば記入してください"
                        rows={6}
                      />
                      <div className="flex items-center gap-2 mt-2">
                        <input
                          type="checkbox"
                          id="useAI"
                          checked={useAI}
                          onChange={(e) => setUseAI(e.target.checked)}
                          className="rounded"
                        />
                        <Label htmlFor="useAI" className="text-sm text-gray-600 cursor-pointer">
                                手動入力内容からもAIでQ&Aを生成する
                        </Label>
                      </div>
                  </div>
                </div>

                {/* AI提案表示 */}
                {showSuggestions && (suggestions.title || suggestions.description) && (
                  <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-6 mb-6"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-purple-600" />
                        <h3 className="font-semibold text-purple-900">AI提案</h3>
                      </div>
                      <button
                        onClick={dismissSuggestions}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        ×
                      </button>
            </div>

                    <div className="space-y-4">
                      {suggestions.title && (
                        <div>
                          <Label className="text-sm font-medium text-purple-700">提案タイトル</Label>
                          <p className="text-purple-900 bg-white/50 p-3 rounded border">{suggestions.title}</p>
                        </div>
                      )}
                      
                      {suggestions.description && (
                        <div>
                          <Label className="text-sm font-medium text-purple-700">提案概要</Label>
                          <p className="text-purple-900 bg-white/50 p-3 rounded border">{suggestions.description}</p>
              </div>
            )}

                      <div className="flex gap-3">
              <Button
                          onClick={applySuggestions}
                          className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                          <Sparkles className="h-4 w-4 mr-2" />
                          提案を適用
              </Button>
              <Button
                variant="outline"
                          onClick={dismissSuggestions}
              >
                          手動で入力
              </Button>
            </div>
                    </div>
                  </motion.div>
                )}

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-4">
                    <p className="text-red-600">{error}</p>
                  </div>
                )}

                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white py-3 text-lg"
                  disabled={isSubmitting || !title || !description}
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      処理中...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5" />
                      講義を作成してQ&Aを自動生成
                    </div>
                  )}
                </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>

          <ProgressOverlay
            isVisible={isSubmitting}
            text={loadingText}
            progress={loadingProgress}
          />
        </div>
      </div>
    </AuthGuard>
  );
}

export default function NewLecturePage() {
  return <NewLectureContent />;
} 